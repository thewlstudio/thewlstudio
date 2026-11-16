import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSettings } from "./contact/actions";
import { saveStudioInfo } from "./studio/info/actions";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { studioInfoPayload } from "@/test/studio-payloads";

type Raw = Record<string, unknown>;
const { client, patch, auth, tag, invalidate, report } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), create: vi.fn(), patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), commit: vi.fn() },
    auth: vi.fn(), tag: vi.fn(), invalidate: vi.fn(), report: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: tag, revalidatePath: invalidate }));
vi.mock("@/lib/error-reporting", () => ({ reportError: report }));
let existing: unknown;
let fields: Raw;
function form() {
    const data = new FormData();
    for (const [key, value] of Object.entries(FALLBACK_SETTINGS)) data.set(key, value);
    data.set("dataJson", JSON.stringify(studioInfoPayload())); return data;
}
const inherit = (doc: Raw, key: string) => {
    const own = { ...doc }; delete own[key]; return Object.assign(Object.create({ [key]: doc[key] }), own);
};
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue(undefined); existing = undefined; fields = {};
    client.getDocument.mockImplementation(async () => existing);
    client.create.mockImplementation(async (doc: Raw) => ({ ...doc, _rev: "created-revision" }));
    client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch);
    patch.set.mockImplementation((value: Raw) => { fields = value; return patch; });
    patch.commit.mockImplementation(async () => ({ ...(existing as Raw), ...fields, _rev: "updated-revision" }));
});
afterEach(() => vi.restoreAllMocks());

describe.each([
    { type: "siteSettings", save: saveSettings, paths: [["/", "layout"]] },
    { type: "studioInfo", save: saveStudioInfo, paths: [["/studio"]] },
])("$type 단일 설정 문서 저장 경계", ({ type, save, paths }) => {
    const doc = () => ({ _id: type, _type: type, _rev: "original-revision" });
    it.each([
        { name: "null", make: () => null }, { name: "false", make: () => false },
        { name: "0", make: () => 0 }, { name: "빈 문자열", make: () => "" }, { name: "NaN", make: () => NaN },
        { name: "빈 배열", make: () => [] }, { name: "빈 객체", make: () => ({}) },
        { name: "배열 문서", make: () => Object.assign([], doc()) },
        { name: "공백 버전", make: () => ({ ...doc(), _rev: " \t\n" }) },
        { name: "버전 누락", make: () => ({ _id: type, _type: type }) },
        { name: "버전 자료형", make: () => ({ ...doc(), _rev: 1 }) },
        { name: "상속 ID", make: () => inherit(doc(), "_id") },
        { name: "상속 종류", make: () => inherit(doc(), "_type") },
        { name: "상속 버전", make: () => inherit(doc(), "_rev") },
        { name: "다른 ID", make: () => ({ ...doc(), _id: "other" }) },
        { name: "다른 종류", make: () => ({ ...doc(), _type: "other" }) },
    ])("$name 응답을 없음이나 정상 문서로 추측하지 않는다", async ({ make }) => {
        existing = make(); const result = await save(null, form());
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("문서") });
        expect(client.getDocument).toHaveBeenCalledExactlyOnceWith(type);
        expect(client.create).not.toHaveBeenCalled(); expect(client.patch).not.toHaveBeenCalled();
        expect(tag).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
    });
    it.each([new Error("DO_NOT_ECHO"), { statusCode: 503, message: "DO_NOT_ECHO" }, "DO_NOT_ECHO"])("조회 예외 #%#는 고정된 저장 전 실패 안내만 반환한다", async (error) => {
        client.getDocument.mockRejectedValue(error); const result = await save(null, form());
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("불러오지 못해 저장하지 않았어요") });
        expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
        expect(report).toHaveBeenCalledWith("saveManagedSingleton:read", error);
        expect(client.create).not.toHaveBeenCalled(); expect(client.patch).not.toHaveBeenCalled(); expect(tag).not.toHaveBeenCalled();
    });
    it("SDK의 문서 없음 값인 undefined일 때만 고정 ID로 생성한다", async () => {
        expect(await save(null, form())).toEqual({ ok: true });
        expect(client.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ _id: type, _type: type }));
        expect(client.patch).not.toHaveBeenCalled(); expect(client.getDocument).toHaveBeenCalledTimes(1);
        expect(tag).toHaveBeenCalledExactlyOnceWith(type); expect(invalidate.mock.calls).toEqual(paths);
    });
    it("정상 원본은 같은 조회 버전으로만 수정하고 부가 정보를 유지한다", async () => {
        existing = { ...doc(), extra: { preserve: true } }; const before = structuredClone(existing);
        expect(await save(null, form())).toEqual({ ok: true }); expect(existing).toEqual(before);
        expect(fields).not.toHaveProperty("extra"); expect(fields).not.toHaveProperty("_id"); expect(fields).not.toHaveProperty("_rev");
        expect(client.patch).toHaveBeenCalledExactlyOnceWith(type); expect(patch.ifRevisionId).toHaveBeenCalledExactlyOnceWith("original-revision");
        expect(client.getDocument).toHaveBeenCalledTimes(1); expect(client.create).not.toHaveBeenCalled();
        expect(tag).toHaveBeenCalledExactlyOnceWith(type); expect(invalidate.mock.calls).toEqual(paths);
    });
    it("최초 생성이 겹치면 다른 요청의 문서를 패치로 덮어쓰지 않는다", async () => {
        const other = { ...doc(), _rev: "other-request", preserve: true };
        client.create.mockImplementation(async () => { existing = other; throw { statusCode: 409 }; });
        expect(await save(null, form())).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") });
        expect(existing).toBe(other); expect(client.create).toHaveBeenCalledTimes(1); expect(client.patch).not.toHaveBeenCalled();
        expect(client.getDocument).toHaveBeenCalledTimes(1); expect(tag).not.toHaveBeenCalled();
    });
    it("수정 충돌을 새 생성이나 최신 버전 재조회로 우회하지 않는다", async () => {
        existing = doc(); patch.commit.mockRejectedValue({ statusCode: 409 });
        expect(await save(null, form())).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") });
        expect(patch.commit).toHaveBeenCalledTimes(1); expect(client.getDocument).toHaveBeenCalledTimes(1);
        expect(client.create).not.toHaveBeenCalled(); expect(tag).not.toHaveBeenCalled();
    });
});
