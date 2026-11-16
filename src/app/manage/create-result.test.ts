import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstructor, duplicateInstructor } from "./instructors/actions";
import { createCrew } from "./crew/actions";
import { createWork } from "./works/actions";
import { createSpace } from "./studio/actions";
import { saveSettings } from "./contact/actions";
import { saveStudioInfo } from "./studio/info/actions";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { studioInfoPayload, studioSpacePayload } from "@/test/studio-payloads";
import { updateTag, revalidatePath } from "next/cache";

type Raw = Record<string, unknown>;
const { client, navigate } = vi.hoisted(() => ({ client: { fetch: vi.fn(), getDocument: vi.fn(), assets: { upload: vi.fn() }, create: vi.fn() }, navigate: vi.fn() }));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const redirect = new Error("test redirect");
function form() {
    const data = new FormData();
    for (const [key, value] of Object.entries({ instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정", name: "CREW", koName: "크루", role: "역할", slug: "new-page", title: "작품", artist: "가수", releaseDate: "2026-11-03", linkCount: "0", ...FALLBACK_SETTINGS })) data.set(key, value);
    for (const key of ["imageFile", "bgImageFile"]) data.set(key, new File(["mock"], "photo.png", { type: "image/png" }));
    data.set("listsJson", JSON.stringify(studioSpacePayload())); data.set("dataJson", JSON.stringify(studioInfoPayload())); return data;
}
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    client.fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? 0 : []);
    client.getDocument.mockImplementation(async (id: string) => id === "source" ? { _id: id, _type: "instructor", _rev: "v1", instructorName: "원본" } : undefined);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.create.mockImplementation(async (doc: Raw) => ({ _id: doc._id ?? "created", _type: doc._type, _rev: "v1" }));
    navigate.mockImplementation(() => { throw redirect; });
});
afterEach(() => vi.restoreAllMocks());
it("복제 결과가 원본 ID이면 새 문서 성공으로 처리하지 않는다", async () => {
    client.create.mockResolvedValue({ _id: "source", _type: "instructor", _rev: "v1" });
    expect(await duplicateInstructor("source")).toMatchObject({ ok: false, error: expect.stringContaining("목록") });
    expect(client.create).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled();
});
const areas = [
    { type: "instructor", run: () => createInstructor(null, form()) }, { type: "crew", run: () => createCrew(null, form()) },
    { type: "work", run: () => createWork(null, form()) }, { type: "studioSpace", run: () => createSpace(null, form()) },
    { type: "복제", run: () => duplicateInstructor("source") }, { type: "siteSettings", run: () => saveSettings(null, form()) }, { type: "studioInfo", run: () => saveStudioInfo(null, form()) },
];
describe.each(areas)("$type 생성 결과", ({ type, run }) => {
    const expectedType = type === "복제" ? "instructor" : type;
    const good = () => ({ _id: ["siteSettings", "studioInfo"].includes(type) ? type : "created", _type: expectedType, _rev: "v1" });
    if (type !== "복제") it("생성 응답 확인 뒤 캐시 실패는 committed 상태로 반환한다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        const result = await run(); expect(result).toMatchObject({ ok: false, committed: true });
        expect(client.create).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled(); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
    });
    it.each([{ _type: "wrong" }, { _rev: "" }, { _rev: 7 }, { _id: "drafts.created" }, { _id: "../bad" }])("다른 정보가 정상이어도 잘못된 식별 정보 #%#는 거부한다", async (change) => {
        client.create.mockResolvedValue({ ...good(), ...change });
        expect(await run()).toMatchObject({ ok: false }); expect(client.create).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    });
    it.each(["_type", "_rev"])("%s만 누락돼도 성공으로 추측하지 않는다", async (field) => {
        const value: Raw = good(); delete value[field]; client.create.mockResolvedValue(value);
        expect(await run()).toMatchObject({ ok: false }); expect(updateTag).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    });
    it("정상 생성 문서는 기존 성공 처리와 이동을 유지한다", async () => {
        try { const result = await run(); expect(result).toMatchObject({ ok: true }); } catch (error) { expect(error).toBe(redirect); }
        expect(client.create).toHaveBeenCalledTimes(1); expect(updateTag).toHaveBeenCalledTimes(1);
    });
    it.each([null, undefined, {}, { _id: "" }, { _id: "../bad" }, { _id: "drafts.created" }, { _id: "versions.release.created" }, { _id: "created", _type: "wrong", _rev: "v1" }, { _id: "created", _type: "instructor", _rev: "" }].map((value) => ({ value })))("잘못된 응답 #%#는 성공·이동으로 처리하지 않는다", async ({ value }) => {
        client.create.mockResolvedValue(value);
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("목록") });
        expect(client.create).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled(); expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
    });
    it("전송 예외는 이미 생성됐을 가능성을 안내하고 자동 반복하지 않는다", async () => {
        client.create.mockRejectedValue(new Error("DO_NOT_ECHO"));
        const result = await run(); expect(result).toMatchObject({ ok: false, error: expect.stringContaining("목록") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
        expect(client.create).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled(); expect(updateTag).not.toHaveBeenCalled();
    });
    if (["siteSettings", "studioInfo"].includes(type)) it("다른 고정 ID의 응답도 성공으로 처리하지 않는다", async () => {
        client.create.mockResolvedValue({ _id: "other-settings", _type: type, _rev: "v1" });
        expect(await run()).toMatchObject({ ok: false }); expect(updateTag).not.toHaveBeenCalled();
    });
    else it("생성 뒤 캐시 갱신 실패는 재추가를 권하지 않는다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        const result = await run(); expect(result).toMatchObject({ ok: false, error: expect.stringContaining("추가는 완료") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
        expect(client.create).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
    });
});
