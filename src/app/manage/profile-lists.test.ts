import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveCrew, createCrew } from "./crew/actions";
import { saveInstructor, createInstructor } from "./instructors/actions";
import { revalidatePath, updateTag } from "next/cache";

type Raw = Record<string, unknown>;
const { client, patch, db, navigate } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), fetch: vi.fn(), create: vi.fn(), patch: vi.fn(), assets: { upload: vi.fn() } },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw }, navigate: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const image = () => new File(["mock image"], "photo.png", { type: "image/png" });
function form(values: Record<string, string> = {}): FormData {
    const data = new FormData();
    for (const [name, value] of Object.entries({ documentId: "document", name: "CREW", koName: "크루", role: "역할", slug: "crew", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정", ...values })) data.set(name, value);
    return data;
}
const row = (_key = "saved") => ({ _key, url: "https://example.com", iconImage: { _type: "image", asset: { _type: "reference", _ref: "image-original" }, crop: { top: 0.1 }, custom: "아이콘 원본" } });
function noWrites() {
    expect(client.assets.upload).not.toHaveBeenCalled(); expect(client.patch).not.toHaveBeenCalled(); expect(client.create).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
}
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "document", _type: "crew", _rev: "v1", links: [row()] }; db.fields = {};
    client.getDocument.mockImplementation(async () => structuredClone(db.doc));
    client.fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? 0 : []);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch); patch.unset.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.commit.mockImplementation(async () => { db.doc = { ...db.doc, ...structuredClone(db.fields), _rev: "v2" }; return db.doc; });
    client.create.mockImplementation(async (fields: Raw) => { db.fields = fields; return { _id: fields._id ?? "created", _type: fields._type, _rev: "v1" }; });
});
afterEach(() => vi.restoreAllMocks());

describe("Crew 링크 원본 보존", () => {
    it.each([null, false, "", { private: "DO_NOT_ECHO" }])("추가 원본 값 #%#는 업로드·패치 전에 차단한다", async (value) => {
        (db.doc.links as Raw[])[0].custom = value;
        const before = structuredClone(db.doc);
        const data = form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com", linkIconKeep_0: "image-original" }); data.set("imageFile", image());
        const result = await saveCrew(null, data);
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("/admin"), fields: [{ id: "linkUrl_0" }] });
        expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); noWrites(); expect(db.doc).toEqual(before);
    });
    it.each(["_type", "__proto__", "constructor", "toString"])("원본 추가 필드 %s를 조용히 지우지 않는다", async (name) => {
        Object.defineProperty((db.doc.links as Raw[])[0], name, { value: "DO_NOT_ECHO", enumerable: true });
        const result = await saveCrew(null, form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com" }));
        expect(result).toMatchObject({ ok: false }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); noWrites();
    });
    it("URL을 비운 같은 행도 추가 원본 정보 삭제로 해석하지 않는다", async () => {
        (db.doc.links as Raw[])[0].custom = "원본";
        expect(await saveCrew(null, form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "" }))).toMatchObject({ ok: false }); noWrites();
    });
    it("유효한 원본 키를 제출 목록에서 제거한 삭제는 허용한다", async () => {
        (db.doc.links as Raw[])[0].custom = "원본";
        expect(await saveCrew(null, form({ linkCount: "0" }))).toEqual({ ok: true }); expect(db.doc.links).toEqual([]);
    });
    it("키 없는 추가 원본 정보는 삭제로 추측하지 않는다", async () => {
        db.doc.links = [{ url: "https://example.com", custom: "원본" }];
        expect(await saveCrew(null, form({ linkCount: "0" }))).toMatchObject({ ok: false }); noWrites();
    });
    it("링크 입력이 전부 생략되면 목록을 패치하지 않는다", async () => {
        (db.doc.links as Raw[])[0].custom = "원본"; const before = structuredClone(db.doc.links);
        expect(await saveCrew(null, form())).toEqual({ ok: true });
        expect(db.fields).not.toHaveProperty("links"); expect(db.doc.links).toEqual(before);
    });
    it("기존 아이콘 유지 필드가 생략되면 서버 원본을 유지한다", async () => {
        const before = structuredClone(db.doc.links);
        expect(await saveCrew(null, form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com" }))).toEqual({ ok: true });
        expect(db.doc.links).toEqual(before);
    });
    it("빈 아이콘 값은 명시적인 아이콘 제거로 처리한다", async () => {
        expect(await saveCrew(null, form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com", linkIconKeep_0: "" }))).toEqual({ ok: true });
        expect(db.doc.links).toEqual([{ _key: "saved", url: "https://example.com" }]);
    });
    it("뒤쪽 원본 문제면 앞쪽 새 아이콘도 업로드하지 않는다", async () => {
        db.doc.links = [row("a"), { ...row("b"), custom: "원본" }];
        const data = form({ linkCount: "2", linkKey_0: "a", linkKey_1: "b", linkUrl_0: "https://example.com", linkUrl_1: "https://example.com" }); data.set("linkIconFile_0", image());
        expect(await saveCrew(null, data)).toMatchObject({ ok: false, fields: [{ id: "linkUrl_1" }] }); noWrites();
    });
    it("링크 외의 문서 최상위 추가 정보는 그대로 유지한다", async () => {
        db.doc.custom = { keep: true };
        const data = form({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com", linkIconKeep_0: "image-original", linkCustom_0: "DO_NOT_STORE" });
        expect(await saveCrew(null, data)).toEqual({ ok: true });
        expect(db.doc.custom).toEqual({ keep: true }); expect(JSON.stringify(db.doc.links)).not.toContain("DO_NOT_STORE");
    });
    it.each([{ value: "broken" }, { value: { links: [] } }, { value: [null] }])("잘못된 원본 목록 #%#를 빈 목록으로 바꾸지 않는다", async ({ value }) => {
        db.doc.links = value;
        expect(await saveCrew(null, form({ linkCount: "0" }))).toMatchObject({ ok: false, fields: [{ id: "links" }] }); noWrites();
    });
});

describe.each([{ label: "수정", action: saveCrew }, { label: "생성", action: createCrew }])("Crew 링크 $label 사전 검증", ({ action }) => {
    async function reject(data: FormData) {
        data.set("imageFile", image()); const before = structuredClone(db.doc);
        expect(await action(null, data)).toMatchObject({ ok: false }); noWrites(); expect(db.doc).toEqual(before);
    }
    it("뒤쪽 URL이 틀리면 앞쪽 아이콘 업로드도 시작하지 않는다", async () => {
        const data = form({ linkCount: "2", linkUrl_0: "https://example.com", linkUrl_1: "javascript:bad" }); data.set("linkIconFile_0", image()); await reject(data);
    });
    it.each(["", " ", "0x0", "1e0", "00"])("비정상 개수 %s를 빈 목록으로 저장하지 않는다", async (count) => { await reject(form({ linkCount: count })); });
    it.each(["linkCount", "linkUrl_0", "linkKey_0", "linkIconKeep_0"])("%s 자리에 파일이 오면 문자열로 강제 변환하지 않는다", async (field) => {
        const data = form({ linkCount: "1", linkUrl_0: "https://example.com" }); data.set(field, new File(["bad"], "value.txt")); await reject(data);
    });
    it.each(["linkCount", "linkUrl_0", "linkKey_0", "linkIconKeep_0"])("중복된 %s 입력을 첫 값으로 추측하지 않는다", async (field) => {
        const data = form({ linkCount: "1", linkKey_0: "saved", linkIconKeep_0: "image-original", linkUrl_0: "https://example.com" }); data.append(field, "ignored"); await reject(data);
    });
    it("개수만 있고 URL 필드가 없으면 행 삭제로 해석하지 않는다", async () => { await reject(form({ linkCount: "1" })); });
    it("개수 없이 링크 필드만 오면 목록을 지우거나 무시하지 않는다", async () => { await reject(form({ linkUrl_0: "https://example.com" })); });
    it("선언 개수 밖의 행은 버리지 않고 거부한다", async () => { await reject(form({ linkCount: "0", linkUrl_1: "https://example.com" })); });
});

describe.each(["about", "process"] as const)("강사 %s 목록", (field) => {
    beforeEach(() => { db.doc = { _id: "document", _type: "instructor", _rev: "v1", about: ["원본 소개"], process: ["원본 과정"] }; });
    it.each([saveInstructor, createInstructor])("파일을 문자열로 강제 변환해 저장하지 않는다 #%#", async (action) => {
        const data = form(); data.set(field, new File(["bad"], "text.txt")); data.set("imageFile", image());
        expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: field }] }); noWrites();
    });
    it.each([saveInstructor, createInstructor])("중복 입력의 첫 값만 저장하지 않는다 #%#", async (action) => {
        const data = form(); data.append(field, "다른 입력"); data.set("imageFile", image());
        expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: field }] }); noWrites();
    });
    it.each([{ value: [{ custom: "DO_NOT_ECHO" }] }, { value: "not-array" }, { value: [null] }])("읽을 수 없는 원본 #%#를 덮어쓰지 않는다", async ({ value }) => {
        db.doc[field] = value; const before = structuredClone(db.doc); const data = form(); data.set("imageFile", image());
        const result = await saveInstructor(null, data);
        expect(result).toMatchObject({ ok: false, fields: [{ id: field }] }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
        noWrites(); expect(db.doc).toEqual(before);
    });
});
