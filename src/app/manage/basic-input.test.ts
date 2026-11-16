import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveInstructor, createInstructor } from "./instructors/actions";
import { saveCrew, createCrew } from "./crew/actions";
import { saveWork, createWork } from "./works/actions";
import { saveSpace, createSpace } from "./studio/actions";
import { saveSettings } from "./contact/actions";
import { saveStudioInfo } from "./studio/info/actions";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { studioInfoPayload, studioSpacePayload } from "@/test/studio-payloads";
import { revalidatePath, updateTag } from "next/cache";

type Raw = Record<string, unknown>;
const { auth, client, patch, db, navigate } = vi.hoisted(() => ({
    auth: vi.fn(), client: { getDocument: vi.fn(), fetch: vi.fn(), create: vi.fn(), patch: vi.fn(), assets: { upload: vi.fn() } },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() }, db: { doc: {} as Raw, fields: {} as Raw, unset: [] as string[] }, navigate: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const areas = [
    { type: "instructor", save: saveInstructor, create: createInstructor, fields: ["instructorName", "category", "subtitle", "lessonInfo", "portfolioUrl", "portfolioText", "portfolioBtn", "imagePosition", "isActive", "documentId"], optional: ["portfolioUrl", "portfolioText", "portfolioBtn", "imagePosition"] },
    { type: "crew", save: saveCrew, create: createCrew, fields: ["name", "koName", "role", "isActive", "documentId", "sectionsJson", "slug"], optional: [] },
    { type: "work", save: saveWork, create: createWork, fields: ["title", "artist", "releaseDate", "youtubeUrl", "instagramId", "instagramUrl", "isActive", "documentId", "blocksJson", "slug"], optional: ["youtubeUrl", "instagramId", "instagramUrl"] },
    { type: "studioSpace", save: saveSpace, create: createSpace, fields: ["name", "subtitle", "description", "isActive", "documentId", "kind", "listsJson"], optional: ["subtitle", "description"] },
];
const targets: Record<string, string> = { documentId: "", isActive: "visibility", imagePosition: "photo-position", kind: "name", sectionsJson: "sections", blocksJson: "blocks", listsJson: "name", dataJson: "services" };
const main = (type: string) => type === "instructor" ? "instructorName" : type === "work" ? "title" : "name";
function form(type: string): FormData {
    const data = new FormData();
    const values: Record<string, string> = {
        documentId: "document", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정",
        portfolioUrl: "https://example.com", portfolioText: "작업 설명", portfolioBtn: "듣기", imagePosition: "object-top", isActive: "false",
        name: "이름", koName: "한글", role: "역할", slug: "new-page", title: "작품", artist: "가수", releaseDate: "2026-11-03", youtubeUrl: "https://example.com", instagramId: "studio", instagramUrl: "https://instagram.com/studio", linkCount: "0", kind: "room", description: "공간 설명",
        listsJson: JSON.stringify(studioSpacePayload()), sectionsJson: "[]", blocksJson: "[]", dataJson: JSON.stringify(studioInfoPayload()),
    };
    if (type === "siteSettings") Object.assign(values, FALLBACK_SETTINGS);
    for (const [name, value] of Object.entries(values)) data.set(name, value);
    data.set("imageFile", new File(["mock"], "photo.png", { type: "image/png" }));
    data.set("bgImageFile", new File(["mock"], "bg.png", { type: "image/png" }));
    return data;
}
function noWrites() {
    expect(client.assets.upload).not.toHaveBeenCalled(); expect(client.patch).not.toHaveBeenCalled(); expect(client.create).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
}
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); auth.mockResolvedValue(undefined);
    db.doc = { _id: "document", _type: "instructor", _rev: "v1", isActive: false, portfolioUrl: "https://old.example.com", portfolioText: "기존 설명", portfolioBtn: "기존 버튼", imagePosition: "object-bottom", youtubeUrl: "https://old.example.com", instagramId: "old", instagramUrl: "https://instagram.com/old", subtitle: "기존 부제", description: "기존 설명", prices: [], images: [], links: [] };
    db.fields = {}; db.unset = []; client.getDocument.mockImplementation(async () => structuredClone(db.doc));
    client.fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? 0 : []); client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; }); patch.unset.mockImplementation((fields: string[]) => { db.unset = fields; return patch; });
    patch.commit.mockImplementation(async () => { Object.assign(db.doc, db.fields, { _rev: "v2" }); for (const field of db.unset) delete db.doc[field]; return db.doc; });
    client.create.mockImplementation(async (fields: Raw) => { db.fields = fields; return { _id: fields._id ?? "created", _type: fields._type, _rev: "v1" }; });
});
afterEach(() => vi.restoreAllMocks());

describe.each(areas)("$type 기본 입력", ({ type, save, create, fields, optional }) => {
    beforeEach(() => { db.doc._type = type; });
    for (const action of [{ label: "수정", run: save }, { label: "생성", run: create }]) {
        it.each(fields)(`${action.label} — %s 파일 입력은 변환/비우기 없이 거부한다`, async (field) => {
            const data = form(type); data.set(field, new File(["DO_NOT_ECHO"], "field.txt")); const before = structuredClone(db.doc);
            const result = await action.run(null, data);
            expect(result).toMatchObject({ ok: false, fields: [{ id: field === "documentId" ? main(type) : targets[field] ?? field }] });
            expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); noWrites(); expect(db.doc).toEqual(before);
        });
        it.each(fields)(`${action.label} — 중복 %s의 첫 값만 저장하지 않는다`, async (field) => {
            const data = form(type); data.append(field, "DO_NOT_ECHO"); const before = structuredClone(db.doc);
            expect(await action.run(null, data)).toMatchObject({ ok: false, fields: [{ id: field === "documentId" ? main(type) : targets[field] ?? field }] });
            noWrites(); expect(db.doc).toEqual(before);
        });
        it.each(["", "TRUE", "0", "false "])(`${action.label} — 잘못된 공개 값 #%#를 비공개로 추측하지 않는다`, async (value) => {
            const data = form(type); data.set("isActive", value);
            expect(await action.run(null, data)).toMatchObject({ ok: false, fields: [{ id: "visibility" }] }); noWrites();
        });
    }
    it("수정에서 공개 상태가 생략되면 비공개 원본을 공개하지 않는다", async () => {
        const data = form(type); data.delete("isActive"); expect(await save(null, data)).toEqual({ ok: true });
        expect(db.fields).not.toHaveProperty("isActive"); expect(db.doc.isActive).toBe(false);
    });
    it.each(optional)("수정에서 선택 %s가 생략되면 원본을 유지한다", async (field) => {
        const before = db.doc[field]; const data = form(type); data.delete(field); expect(await save(null, data)).toEqual({ ok: true });
        expect(db.fields).not.toHaveProperty(field); expect(db.unset).not.toContain(field); expect(db.doc[field]).toEqual(before);
    });
    it.each(["true", "false"])("공개 상태 %s의 명시적 변경은 유지한다", async (value) => {
        const data = form(type); data.set("isActive", value); expect(await save(null, data)).toEqual({ ok: true }); expect(db.doc.isActive).toBe(value === "true");
    });
    it("생성에서 공개 상태 생략은 기존의 공개 기본값을 사용한다", async () => {
        const data = form(type); data.delete("isActive"); await create(null, data); expect(db.fields.isActive).toBe(true);
    });
});
describe.each([{ type: "siteSettings", action: saveSettings, fields: Object.keys(FALLBACK_SETTINGS) }, { type: "studioInfo", action: saveStudioInfo, fields: ["dataJson"] }])("$type 단일 문서 입력", ({ type, action, fields }) => {
    beforeEach(() => { db.doc = { _id: type, _type: type, _rev: "v1" }; });
    it.each(fields)("%s 자리에 파일을 넣어도 문자열로 바꾸지 않는다", async (field) => {
        const data = form(type); data.set(field, new File(["bad"], "value.txt"));
        expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: targets[field] ?? field }] }); noWrites();
    });
    it.each(fields)("중복된 %s는 첫 값으로 저장하지 않는다", async (field) => {
        const data = form(type); data.append(field, "ignored");
        expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: targets[field] ?? field }] }); noWrites();
    });
});
it.each([saveSpace, createSpace])("잘못된 공간 종류를 room으로 바꾸지 않는다 #%#", async (action) => {
    db.doc._type = "studioSpace"; const data = form("studioSpace"); data.set("kind", "unknown");
    expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: "name" }] }); noWrites();
});
it.each([saveInstructor, createInstructor])("새로운 미지원 사진 위치는 저장하지 않는다 #%#", async (action) => {
    const data = form("instructor"); data.set("imagePosition", "unregistered-class");
    expect(await action(null, data)).toMatchObject({ ok: false, fields: [{ id: "photo-position" }] }); noWrites();
});
it("이미 존재하는 예전 사진 위치를 그대로 유지하는 저장은 허용한다", async () => {
    db.doc.imagePosition = "legacy-position"; const data = form("instructor"); data.set("imagePosition", "legacy-position");
    expect(await saveInstructor(null, data)).toEqual({ ok: true }); expect(db.doc.imagePosition).toBe("legacy-position");
});
it.each([
    { type: "instructor", save: saveInstructor, fields: ["portfolioUrl", "portfolioText"] },
    { type: "work", save: saveWork, fields: ["youtubeUrl", "instagramId", "instagramUrl"] },
    { type: "studioSpace", save: saveSpace, fields: ["subtitle", "description"] },
])("$type 선택 텍스트를 명시적으로 비우면 원본 필드를 지운다", async ({ type, save, fields }) => {
    db.doc._type = type; const data = form(type); for (const field of fields) data.set(field, "");
    expect(await save(null, data)).toEqual({ ok: true }); for (const field of fields) expect(db.doc).not.toHaveProperty(field);
});
it.each([...areas.map(({ type, save }) => ({ type, save })), { type: "siteSettings", save: saveSettings }, { type: "studioInfo", save: saveStudioInfo }])("$type 입력 검증보다 인증을 먼저 한다", async ({ type, save }) => {
    auth.mockRejectedValue(new Error("로그인이 필요해요")); const data = form(type); data.append("isActive", "bad");
    expect(await save(null, data)).toMatchObject({ ok: false, error: "로그인이 필요해요" }); expect(client.getDocument).not.toHaveBeenCalled(); noWrites();
});
