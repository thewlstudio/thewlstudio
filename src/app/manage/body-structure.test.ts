import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveWork } from "./works/actions";
import { saveCrew } from "./crew/actions";
import { revalidatePath, updateTag } from "next/cache";

type Raw = Record<string, unknown>;
const { auth, client, patch, db } = vi.hoisted(() => ({
    auth: vi.fn(), client: { getDocument: vi.fn(), assets: { upload: vi.fn() }, patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
const areas = [
    { label: "Works", type: "work", json: "blocksJson", field: "blocks", source: "contentBlocks", save: saveWork, valid: { _key: "body", _type: "descriptionBlock", paragraphs: ["기존 본문"] } },
    { label: "Crew", type: "crew", json: "sectionsJson", field: "sections", source: "sections", save: saveCrew, valid: { _key: "body", _type: "aboutSection", text: "기존 소개" } },
];
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = {}; db.fields = {};
    auth.mockResolvedValue(undefined);
    client.getDocument.mockImplementation(async () => structuredClone(db.doc));
    client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch); patch.unset.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.commit.mockImplementation(async () => { Object.assign(db.doc, db.fields, { _rev: "v2" }); return db.doc; });
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
});
afterEach(() => vi.restoreAllMocks());
function form() {
    const data = new FormData();
    for (const [key, value] of Object.entries({ documentId: "doc", title: "새 제목", artist: "가수", releaseDate: "2026-10-27", name: "CREW", koName: "크루", role: "역할", linkCount: "0" })) data.set(key, value);
    return data;
}
function noWrites() {
    expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
}
describe.each(areas)("$label 실제 저장의 본문 입력 경계", (area) => {
    beforeEach(() => { db.doc = { _id: "doc", _type: area.type, _rev: "v1", slug: { current: "slug" }, [area.source]: [area.valid], links: [] }; });
    it.each(["", "{bad", "null", "1", "{}", "[null]", "[[]]"])("잘못된 JSON #%#는 사진·본문·revision을 바꾸지 않는다", async (raw) => {
        const before = JSON.stringify(db.doc); const data = form(); data.set(area.json, raw);
        data.set("imageFile", new File(["mock image"], "photo.png", { type: "image/png" }));
        const result = await area.save(null, data);
        expect(result).toMatchObject({ ok: false, fields: [{ id: area.field }] });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before);
    });
    it("JSON 필드의 File을 문자열로 강제 변환하거나 무시하지 않는다", async () => {
        const data = form(); data.set(area.json, new File(["[]"], "body.json", { type: "application/json" }));
        expect(await area.save(null, data)).toMatchObject({ ok: false, fields: [{ id: area.field }] }); noWrites();
    });
    it("본문 JSON 자체를 보내지 않은 기존 기본 정보 저장은 본문을 유지한다", async () => {
        const before = structuredClone(db.doc[area.source]);
        expect(await area.save(null, form())).toEqual({ ok: true }); expect(db.doc[area.source]).toEqual(before);
        expect(db.fields).not.toHaveProperty(area.source);
    });
    it("명시적으로 보낸 빈 배열은 편집 가능한 본문의 삭제로 처리한다", async () => {
        const data = form(); data.set(area.json, "[]");
        expect(await area.save(null, data)).toEqual({ ok: true }); expect(db.doc[area.source]).toEqual([]);
    });
    it("구조 오류보다 인증을 먼저 처리한다", async () => {
        auth.mockRejectedValue(new Error("로그인이 필요해요")); const data = form(); data.set(area.json, "[null]");
        expect(await area.save(null, data)).toMatchObject({ ok: false, error: "로그인이 필요해요" });
        expect(client.getDocument).not.toHaveBeenCalled(); noWrites();
    });
    it("잘못된 뒤쪽 본문 때문에 앞쪽 사진·링크 아이콘도 업로드하지 않는다", async () => {
        const data = form();
        data.set(area.json, JSON.stringify(area.type === "work" ? [{ _key: "new-photo", _type: "imageBlock", caption: "" }, { _type: "descriptionBlock", paragraphs: null }] : [{ ...area.valid, text: null }]));
        data.set("blockImage_new-photo", new File(["mock"], "photo.png", { type: "image/png" }));
        data.set("linkCount", "1"); data.set("linkUrl_0", "https://example.com");
        data.set("linkIconFile_0", new File(["mock"], "icon.png", { type: "image/png" }));
        expect(await area.save(null, data)).toMatchObject({ ok: false, fields: [{ id: area.field }] }); noWrites();
    });
});

describe("서버 원본 미디어·보존 내용 연결", () => {
    it("Works 사진 crop·오디오 파일·자유서식은 원본에서만 가져온다", async () => {
        const image = { _type: "image", asset: { _ref: "image-old" }, crop: { top: 0.1 }, hotspot: { x: 0.4 } };
        const audio = { _key: "audio", _type: "audioBlock", title: "제목", artist: "가수", audioFile: { asset: { _ref: "file-old" } }, extra: "원본 메타데이터" };
        const free = { _key: "free", _type: "freeformTextBlock", content: [{ _type: "block", children: [] }] };
        db.doc = { _id: "doc", _type: "work", _rev: "v1", contentBlocks: [{ _key: "image", _type: "imageBlock", image }, audio, free] };
        const data = form(); data.set("blocksJson", JSON.stringify([{ _key: "image", _type: "imageBlock", caption: "새 설명", image: { asset: { _ref: "forged" } } }, { _key: "audio", _type: "audioBlock", title: "새 제목", artist: "새 가수", audioFile: "forged" }, { _key: "free", _type: "freeformTextBlock", content: "forged" }]));
        expect(await saveWork(null, data)).toEqual({ ok: true });
        expect(db.doc.contentBlocks).toEqual([{ _key: "image", _type: "imageBlock", image, caption: "새 설명" }, { ...audio, title: "새 제목", artist: "새 가수" }, free]);
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Crew 예전 형식은 키·종류가 맞을 때만 원본 내용을 유지한다", async () => {
        const legacy = { _key: "old", _type: "awardsSection", items: [{ title: "원본 수상" }], extra: "보존" };
        db.doc = { _id: "doc", _type: "crew", _rev: "v1", sections: [legacy], links: [] };
        const data = form(); data.set("sectionsJson", JSON.stringify([{ _key: "old", _type: "awardsSection", items: "forged" }]));
        expect(await saveCrew(null, data)).toEqual({ ok: true }); expect(db.doc.sections).toEqual([legacy]);
    });
});
