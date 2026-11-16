import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveInstructor, deleteInstructor, restoreInstructor } from "./instructors/actions";
import { saveCrew, deleteCrew, restoreCrew } from "./crew/actions";
import { saveWork, deleteWork, restoreWork } from "./works/actions";
import { saveSpace, deleteSpace, restoreSpace } from "./studio/actions";
import { saveSettings } from "./contact/actions";
import { saveStudioInfo } from "./studio/info/actions";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { studioInfoPayload, studioSpacePayload } from "@/test/studio-payloads";
import { revalidatePath, updateTag } from "next/cache";

type Raw = Record<string, unknown>;
const { client, patch, db } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), patch: vi.fn(), assets: { upload: vi.fn() } },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() }, db: { doc: {} as Raw, fields: {} as Raw },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
function form() {
    const data = new FormData();
    for (const [key, value] of Object.entries({ documentId: String(db.doc._id), instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정", name: "CREW", koName: "크루", role: "역할", title: "작품", artist: "가수", releaseDate: "2026-11-03", linkCount: "0", ...FALLBACK_SETTINGS })) data.set(key, value);
    data.set("listsJson", JSON.stringify(studioSpacePayload())); data.set("dataJson", JSON.stringify(studioInfoPayload())); return data;
}
const content = [
    { type: "instructor", save: saveInstructor, remove: deleteInstructor, restore: restoreInstructor },
    { type: "crew", save: saveCrew, remove: deleteCrew, restore: restoreCrew },
    { type: "work", save: saveWork, remove: deleteWork, restore: restoreWork },
    { type: "studioSpace", save: saveSpace, remove: deleteSpace, restore: restoreSpace },
];
const cases = [
    ...content.flatMap(({ type, save, remove, restore }) => [
        { type, name: "수정", run: () => save(null, form()), trashed: undefined },
        { type, name: "삭제", run: () => remove("document"), trashed: true },
        { type, name: "복원", run: () => restore("document"), trashed: false },
    ]),
    { type: "siteSettings", name: "설정 수정", run: () => saveSettings(null, form()), trashed: undefined },
    { type: "studioInfo", name: "안내 수정", run: () => saveStudioInfo(null, form()), trashed: undefined },
];
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "document", _type: "instructor", _rev: "v1", about: ["원본"], process: ["원본"], links: [], images: [] }; db.fields = {};
    client.getDocument.mockImplementation(async () => structuredClone(db.doc)); client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch); patch.unset.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.commit.mockImplementation(async () => ({ ...db.doc, ...db.fields, _rev: "v2" }));
});
afterEach(() => vi.restoreAllMocks());
describe.each(cases)("$type $name 응답 확인", ({ type, run, trashed }) => {
    beforeEach(() => { db.doc._type = type; if (["siteSettings", "studioInfo"].includes(type)) db.doc._id = type; });
    if (trashed === undefined) it("저장 응답 확인 뒤 캐시 실패는 명시적인 committed 상태를 반환한다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        const result = await run(); expect(result).toMatchObject({ ok: false, committed: true });
        expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(patch.commit).toHaveBeenCalledTimes(1);
    });
    it.each([{ value: null }, { value: undefined }, { value: [] }, { value: {} }, { value: { _id: "other", _type: type, _rev: "v2" } }])("잘못된 응답 #%#는 성공·캐시 갱신하지 않는다", async ({ value }) => {
        patch.commit.mockResolvedValue(value);
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("결과") }); expect(patch.commit).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
    });
    it("종류나 버전이 잘못돼도 성공으로 추측하지 않는다", async () => {
        patch.commit.mockResolvedValue({ _id: db.doc._id, _type: "wrong", _rev: "v2" });
        expect(await run()).toMatchObject({ ok: false }); expect(updateTag).not.toHaveBeenCalled();
    });
    it("빈 버전 응답도 거부한다", async () => {
        patch.commit.mockResolvedValue({ _id: db.doc._id, _type: type, _rev: "" }); expect(await run()).toMatchObject({ ok: false }); expect(updateTag).not.toHaveBeenCalled();
    });
    it("통신 예외는 원문 대신 결과 확인 안내로 반환하고 재요청하지 않는다", async () => {
        patch.commit.mockRejectedValue(new Error("DO_NOT_ECHO")); const result = await run();
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("결과") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(patch.commit).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled();
        expect(result).not.toHaveProperty("committed");
    });
    it("확인된 변경 뒤 캐시 실패는 변경 완료를 구분한다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); }); const result = await run();
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("변경은 완료") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(patch.commit).toHaveBeenCalledTimes(1);
    });
    it("정상 응답은 기존 성공을 유지한다", async () => {
        expect(await run()).toEqual({ ok: true }); expect(patch.commit).toHaveBeenCalledTimes(1); expect(updateTag).toHaveBeenCalledTimes(1); expect(patch.ifRevisionId).toHaveBeenCalledWith("v1");
    });
    it("같은 버전의 정상 무변경 응답도 성공으로 인정한다", async () => {
        patch.commit.mockImplementation(async () => ({ ...db.doc, ...db.fields }));
        expect(await run()).toEqual({ ok: true }); expect(patch.commit).toHaveBeenCalledTimes(1); expect(updateTag).toHaveBeenCalledTimes(1);
    });
    it("409 충돌은 기존 안내를 유지한다", async () => {
        patch.commit.mockRejectedValue({ statusCode: 409 }); expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("내용이 바뀌었어요") }); expect(updateTag).not.toHaveBeenCalled();
    });
    if (trashed !== undefined) it("응답의 휴지통 상태가 요청과 다르면 성공하지 않는다", async () => {
        patch.commit.mockResolvedValue({ ...db.doc, _rev: "v2", trashed: !trashed }); expect(await run()).toMatchObject({ ok: false }); expect(updateTag).not.toHaveBeenCalled();
    });
});
