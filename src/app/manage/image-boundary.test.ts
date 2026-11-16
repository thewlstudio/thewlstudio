import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveInstructor, createInstructor } from "./instructors/actions";
import { saveCrew, createCrew } from "./crew/actions";
import { saveWork, createWork } from "./works/actions";
import { saveSpace, createSpace } from "./studio/actions";
import { revalidatePath, updateTag } from "next/cache";
import { studioSpacePayload } from "@/test/studio-payloads";

type Raw = Record<string, unknown>;
const { client, patch, db, navigate } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), fetch: vi.fn(), create: vi.fn(), patch: vi.fn(), assets: { upload: vi.fn() } },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() }, db: { doc: {} as Raw, fields: {} as Raw }, navigate: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const file = () => new File(["mock"], "photo.png", { type: "image/png" });
const source = () => ({ _type: "image", asset: { _type: "reference", _ref: "image-original" }, crop: { top: 0.1 }, custom: "원본" });
function form() {
    const data = new FormData();
    for (const [field, value] of Object.entries({ documentId: "document", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정", name: "CREW", koName: "크루", role: "역할", slug: "new-page", title: "작품", artist: "가수", releaseDate: "2026-11-03", linkCount: "0" })) data.set(field, value);
    data.set("listsJson", JSON.stringify(studioSpacePayload({ images: [{ _key: "saved" }] })));
    return data;
}
function noWrites(uploaded = false) {
    if (!uploaded) expect(client.assets.upload).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled(); expect(client.create).not.toHaveBeenCalled(); expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
}
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "document", _type: "work", _rev: "v1", images: [{ ...source(), _key: "saved" }], contentBlocks: [{ _key: "saved", _type: "imageBlock", image: source() }], links: [{ _key: "saved", url: "https://example.com", iconImage: source() }] }; db.fields = {};
    client.getDocument.mockImplementation(async () => structuredClone(db.doc)); client.fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? 0 : []);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" }); client.patch.mockReturnValue(patch);
    patch.ifRevisionId.mockReturnValue(patch); patch.unset.mockReturnValue(patch); patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.commit.mockImplementation(async () => { Object.assign(db.doc, db.fields, { _rev: "v2" }); return db.doc; });
    client.create.mockImplementation(async (fields: Raw) => { db.fields = fields; return { _id: fields._id ?? "created", _type: fields._type, _rev: "v1" }; });
});
afterEach(() => vi.restoreAllMocks());
const paths = [
    ...["imageFile", "modalImageFile", "bgImageFile"].map((field) => ({ type: "instructor", save: saveInstructor, create: createInstructor, field })),
    { type: "crew", save: saveCrew, create: createCrew, field: "imageFile" },
    { type: "crew", save: saveCrew, create: createCrew, field: "linkIconFile_0" },
    { type: "work", save: saveWork, create: createWork, field: "imageFile" },
    { type: "work", save: saveWork, create: null, field: "blockImage_saved" },
    { type: "studioSpace", save: saveSpace, create: createSpace, field: "spaceImage_saved" },
];
function inputFor(field: string) {
    const data = form(); data.set(field, file());
    if (field.startsWith("linkIconFile")) for (const [name, value] of Object.entries({ linkCount: "1", linkKey_0: "saved", linkUrl_0: "https://example.com", linkIconKeep_0: "image-original" })) data.set(name, value);
    if (field.startsWith("blockImage")) data.set("blocksJson", JSON.stringify([{ _key: "saved", _type: "imageBlock", caption: "수정" }]));
    return data;
}
describe.each(paths)("$type $field 업로드 경계", ({ type, field, save, create }) => {
    for (const action of [save, ...(create ? [create] : [])]) it("중복 파일은 미선택+선택 순서여도 업로드 전 거부한다", async () => {
        db.doc._type = type; const before = structuredClone(db.doc); const data = inputFor(field);
        data.set("imageFile", file()); data.set("bgImageFile", file()); data.delete(field); data.append(field, new File([], "")); data.append(field, file());
        expect(await action(null, data)).toMatchObject({ ok: false, error: expect.stringContaining("중복") }); noWrites(); expect(db.doc).toEqual(before);
    });
    it("잘못된 업로드 응답이면 문서·revision·캐시는 유지한다", async () => {
        db.doc._type = type; const before = structuredClone(db.doc); client.assets.upload.mockResolvedValue({ _id: "" });
        expect(await save(null, inputFor(field))).toMatchObject({ ok: false, error: expect.stringContaining("사진을 올리지 못했어요") });
        expect(client.assets.upload).toHaveBeenCalledTimes(1); noWrites(true); expect(db.doc).toEqual(before);
    });
});
describe.each([{ type: "work", save: saveWork, json: "blocksJson", field: "blocks", file: "blockImage_saved" }, { type: "studioSpace", save: saveSpace, json: "listsJson", field: "images", file: "spaceImage_saved" }])("$type 기존 사진 참조 보호", ({ type, save, json, field, file: fileField }) => {
    const payload = () => type === "work" ? [{ _key: "new-first", _type: "imageBlock", caption: "새 사진" }, { _key: "saved", _type: "imageBlock", caption: "기존 사진" }] : studioSpacePayload({ images: [{ _key: "new-first" }, { _key: "saved" }] });
    it.each([{ value: null }, { value: "bad" }, { value: {} }, { value: { _ref: null } }, { value: { _ref: "" } }])("깨진 원본 asset #%#는 앞쪽 업로드보다 먼저 거부한다", async ({ value }) => {
        db.doc._type = type;
        if (type === "work") (db.doc.contentBlocks as Raw[])[0].image = { asset: value };
        else (db.doc.images as Raw[])[0].asset = value;
        const before = structuredClone(db.doc); const data = form(); data.set(json, JSON.stringify(payload())); data.set(type === "work" ? "blockImage_new-first" : "spaceImage_new-first", file());
        expect(await save(null, data)).toMatchObject({ ok: false, fields: [{ id: field }], error: expect.stringContaining("/admin") }); noWrites(); expect(db.doc).toEqual(before);
    });
    it("미선택 파일은 정상 기존 사진을 유지하고 업로드하지 않는다", async () => {
        db.doc._type = type; const data = inputFor(fileField); data.set(fileField, new File([], ""));
        const before = structuredClone(type === "work" ? (db.doc.contentBlocks as Raw[])[0].image : (db.doc.images as Raw[])[0]);
        expect(await save(null, data)).toEqual({ ok: true });
        expect(type === "work" ? (db.doc.contentBlocks as Raw[])[0].image : (db.doc.images as Raw[])[0]).toEqual(before); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("깨진 참조도 새 사진을 명시적으로 골랐을 때는 교체할 수 있다", async () => {
        db.doc._type = type; if (type === "work") (db.doc.contentBlocks as Raw[])[0].image = "bad"; else (db.doc.images as Raw[])[0].asset = "bad";
        expect(await save(null, inputFor(fileField))).toEqual({ ok: true }); expect(client.assets.upload).toHaveBeenCalledTimes(1);
        const image = type === "work" ? (db.doc.contentBlocks as Raw[])[0].image : (db.doc.images as Raw[])[0]; expect(image).toMatchObject({ asset: { _ref: "image-uploaded" } });
    });
    it("기존 행을 목록에서 명시적으로 제거하는 것은 계속 허용한다", async () => {
        db.doc._type = type; const data = form(); data.set(json, JSON.stringify(type === "work" ? [] : studioSpacePayload()));
        expect(await save(null, data)).toEqual({ ok: true }); expect(type === "work" ? db.doc.contentBlocks : db.doc.images).toEqual([]);
    });
});
