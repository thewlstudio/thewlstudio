import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveWork } from "./works/actions";
import { saveSpace } from "./studio/actions";
import { saveCrew } from "./crew/actions";
import { saveInstructor } from "./instructors/actions";
import { updateTag } from "next/cache";
import { studioSpacePayload } from "@/test/studio-payloads";
import { workPayloadFixture, crewPayloadFixture } from "@/test/body-payloads";

// 네트워크/Sanity 저장소만 교체한다. 실제 액션·검증·이미지 업로드·배열 정리 코드는 그대로 실행한다.
const { db, client } = vi.hoisted(() => {
    const db: { document: Record<string, unknown> } = { document: {} };
    const client = {
        getDocument: vi.fn(async () => ({ ...db.document })),
        assets: { upload: vi.fn(async () => ({ _id: "image-uploaded" })) },
        fetch: vi.fn(async (query: string) => {
            if (query.endsWith(".contentBlocks")) return db.document.contentBlocks ?? [];
            if (query.endsWith(".sections")) return db.document.sections ?? [];
            if (query.endsWith(".slug.current")) return "test";
            return db.document;
        }),
        patch: vi.fn(() => {
            let values: Record<string, unknown> = {};
            let removed: string[] = [];
            let expectedRevision: string | undefined;
            const patch = {
                ifRevisionId: (revision: string) => { expectedRevision = revision; return patch; },
                set: (data: Record<string, unknown>) => { values = data; return patch; },
                unset: (keys: string[]) => { removed = keys; return patch; },
                commit: async () => {
                    if (expectedRevision !== db.document._rev) throw new Error("revision conflict");
                    Object.assign(db.document, values);
                    for (const key of removed) delete db.document[key];
                    db.document._rev = `${db.document._rev}-saved`;
                    return db.document;
                },
            };
            return patch;
        }),
    };
    return { db, client };
});
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

function basic(values: Record<string, string>) {
    const data = new FormData();
    data.set("documentId", "test-document");
    for (const [key, value] of Object.entries(values)) {
        if (key === "listsJson") data.set(key, JSON.stringify(studioSpacePayload(JSON.parse(value))));
        else if (key === "blocksJson") data.set(key, JSON.stringify(workPayloadFixture(JSON.parse(value))));
        else if (key === "sectionsJson") data.set(key, JSON.stringify(crewPayloadFixture(JSON.parse(value))));
        else data.set(key, value);
    }
    return data;
}
const imageFile = () => new File(["image bytes"], "test.png", { type: "image/png" });
type Image = { _key: string; image?: { asset: { _ref: string } }; asset?: { _ref: string } };

beforeEach(() => {
    db.document = { _id: "test-document", _type: "work", _rev: "rev-1" }; vi.clearAllMocks();
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("실제 서버 액션의 이미지 연속 저장", () => {
    it("Works — 첫 업로드 뒤 발급된 키로 두 번째 저장하면 파일 없이 이미지가 보존된다", async () => {
        const first = basic({ title: "작품", artist: "아티스트", releaseDate: "2026-10-26", blocksJson: JSON.stringify([{ _key: "new-photo", _type: "imageBlock", caption: "사진" }]) });
        first.set("blockImage_new-photo", imageFile());
        expect(await saveWork(null, first)).toEqual({ ok: true });
        const saved = (db.document.contentBlocks as Image[])[0];
        expect(saved._key).not.toMatch(/^new-/);
        const second = basic({ title: "작품 수정", artist: "아티스트", releaseDate: "2026-10-26", blocksJson: JSON.stringify([{ _key: saved._key, _type: "imageBlock", caption: "설명 수정" }]) });
        expect(await saveWork(null, second)).toEqual({ ok: true });
        expect(db.document.contentBlocks).toMatchObject([{ _key: saved._key, image: saved.image, caption: "설명 수정" }]);
        expect(client.assets.upload).toHaveBeenCalledTimes(1);
    });

    it("Studio — 사진의 서버 키와 기존 핫스팟을 파일 없는 재저장에도 유지한다", async () => {
        db.document._type = "studioSpace";
        const first = basic({ name: "ROOM A", listsJson: JSON.stringify({ images: [{ _key: "new-photo" }] }) });
        first.set("spaceImage_new-photo", imageFile());
        expect(await saveSpace(null, first)).toEqual({ ok: true });
        const saved = (db.document.images as Image[])[0];
        expect(saved._key).not.toMatch(/^new-/);
        Object.assign(saved, { hotspot: { x: 0.4, y: 0.6, width: 0.5, height: 0.5 } });
        const second = basic({ name: "ROOM A 수정", listsJson: JSON.stringify({ images: [{ _key: saved._key }] }) });
        expect(await saveSpace(null, second)).toEqual({ ok: true });
        expect(db.document.images).toEqual([saved]);
        expect(client.assets.upload).toHaveBeenCalledTimes(1);
    });

    it("Crew — 저장된 링크 키·사용자 아이콘 참조로 다시 저장하면 아이콘이 유지된다", async () => {
        db.document._type = "crew";
        const fields = { name: "CREW", koName: "크루", role: "프로듀서", linkCount: "1", linkUrl_0: "https://example.com" };
        const first = basic(fields);
        first.set("linkIconFile_0", imageFile());
        expect(await saveCrew(null, first)).toEqual({ ok: true });
        const saved = (db.document.links as { _key: string; iconImage: { asset: { _ref: string } } }[])[0];
        const second = basic({ ...fields, role: "디렉터", linkKey_0: saved._key, linkIconKeep_0: saved.iconImage.asset._ref });
        expect(await saveCrew(null, second)).toEqual({ ok: true });
        expect(db.document.links).toEqual([saved]);
        expect(client.assets.upload).toHaveBeenCalledTimes(1);
    });

    it("Crew — 같은 아이콘을 유지할 때 서버 원본의 crop·hotspot·추가 메타데이터도 보존한다", async () => {
        const icon = Object.freeze({ _type: "image", asset: { _type: "reference", _ref: "image-existing" }, crop: { top: 0.1, left: 0.2, right: 0, bottom: 0 }, hotspot: { x: 0.4, y: 0.6, width: 0.5, height: 0.5 }, attribution: "기존 정보" });
        db.document._type = "crew";
        db.document.links = [{ _key: "existing-link", url: "https://old.example", iconImage: icon }];
        const data = basic({ name: "CREW", koName: "크루", role: "역할 수정", linkCount: "1", linkKey_0: "existing-link", linkUrl_0: "https://new.example", linkIconKeep_0: "image-existing" });
        expect(await saveCrew(null, data)).toEqual({ ok: true });
        expect(db.document.links).toEqual([{ _key: "existing-link", url: "https://new.example", iconImage: icon }]);
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Crew — 다른 에셋을 고르면 이전 사진의 crop·hotspot을 옮겨 붙이지 않는다", async () => {
        db.document._type = "crew";
        db.document.links = [{ _key: "link", url: "https://example.com", iconImage: { _type: "image", asset: { _ref: "image-old" }, crop: { top: 0.1 } } }];
        const data = basic({ name: "CREW", koName: "크루", role: "역할", linkCount: "1", linkKey_0: "link", linkUrl_0: "https://example.com", linkIconKeep_0: "image-other" });
        expect(await saveCrew(null, data)).toEqual({ ok: true });
        expect(db.document.links).toEqual([{ _key: "link", url: "https://example.com", iconImage: { _type: "image", asset: { _type: "reference", _ref: "image-other" } } }]);
    });
});

describe("중복 키 저장은 업로드·문서 변경 전에 차단", () => {
    const shared = { title: "작품", artist: "가수", releaseDate: "2026-10-26", name: "이름", koName: "한글", role: "역할", linkCount: "0" };
    const duplicateTracks = [{ _key: "same", title: "첫 트랙" }, { _key: "same", title: "둘째 트랙" }];
    it.each([
        { label: "Works 블록", type: "work", save: saveWork, field: "blocksJson", payload: [{ _key: "same", _type: "descriptionBlock", paragraphs: ["첫 문단"] }, { _key: "same", _type: "descriptionBlock", paragraphs: ["둘째 문단"] }] },
        { label: "Works 중첩 트랙", type: "work", save: saveWork, field: "blocksJson", payload: [{ _key: "new-photo", _type: "imageBlock" }, { _key: "tracks", _type: "tracklistBlock", tracks: duplicateTracks }] },
        { label: "Crew 섹션", type: "crew", save: saveCrew, field: "sectionsJson", payload: [{ _key: "same", _type: "aboutSection", text: "첫 소개" }, { _key: "same", _type: "aboutSection", text: "둘째 소개" }] },
        { label: "Studio 가격", type: "studioSpace", save: saveSpace, field: "listsJson", payload: { prices: [{ _key: "same", label: "첫 가격" }, { _key: "same", label: "둘째 가격" }], images: [{ _key: "new-photo" }] } },
        { label: "Studio 사진", type: "studioSpace", save: saveSpace, field: "listsJson", payload: { images: [{ _key: "new-photo" }, { _key: "new-photo" }] } },
    ])("$label — 본문·revision·사진·캐시 유지", async ({ type, save, field, payload }) => {
        Object.assign(db.document, { _type: type, title: "기존 제목", images: [], sections: [], contentBlocks: [], links: [] });
        const before = JSON.stringify(db.document);
        const data = basic({ ...shared, [field]: JSON.stringify(payload) });
        data.set("imageFile", imageFile());
        data.set("spaceImage_new-photo", imageFile());
        data.set("blockImage_new-photo", imageFile());
        const result = await save(null, data);
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("중복") });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.patch).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
        expect(JSON.stringify(db.document)).toBe(before);
    });
    it("Crew 링크 — 뒤쪽 키가 중복이면 앞쪽 아이콘도 업로드하지 않는다", async () => {
        Object.assign(db.document, { _type: "crew", links: [] });
        const before = JSON.stringify(db.document);
        const data = basic({ ...shared, linkCount: "2", linkKey_0: "same", linkKey_1: "same", linkUrl_0: "https://first.example", linkUrl_1: "https://second.example" });
        data.set("linkIconFile_0", imageFile());
        expect(await saveCrew(null, data)).toMatchObject({ ok: false, error: expect.stringContaining("중복") });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.patch).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
        expect(JSON.stringify(db.document)).toBe(before);
    });
    it.each(["-1", "1.5", "11", "Infinity", "NaN", "bad-count"])("Crew 링크 수 %s는 반복문 범위가 달라지기 전에 거부한다", async (count) => {
        db.document._type = "crew";
        const data = basic({ ...shared, linkCount: count, linkUrl_0: "https://example.com" });
        data.set("linkIconFile_0", imageFile());
        expect(await saveCrew(null, data)).toMatchObject({ ok: false });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.patch).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
    });
    it.each(["work", "studioSpace"] as const)("%s — 긴 사진 키를 재정렬하고 두 번 저장해도 에셋이 뒤바뀌지 않는다", async (type) => {
        const keys = [`${"prefix-".repeat(7)}first`, `${"prefix-".repeat(7)}second`];
        const pictures = keys.map((_key, i) => ({ _key, _type: "imageBlock", image: { _type: "image", asset: { _ref: `image-${i}` }, crop: { top: i / 10 } } }));
        Object.assign(db.document, { _type: type, contentBlocks: pictures, images: pictures.map((p) => ({ ...p.image, _key: p._key })) });
        for (const order of [[keys[1], keys[0]], keys]) {
            const data = basic({ ...shared, [type === "work" ? "blocksJson" : "listsJson"]: JSON.stringify(type === "work" ? order.map((_key) => ({ _key, _type: "imageBlock" })) : { images: order.map((_key) => ({ _key })) }) });
            expect(await (type === "work" ? saveWork : saveSpace)(null, data)).toEqual({ ok: true });
            const saved = (type === "work" ? db.document.contentBlocks : db.document.images) as { _key: string; image?: unknown; asset?: unknown }[];
            expect(saved.map((p) => p._key)).toEqual(order);
            for (const [i, key] of keys.entries()) {
                const image = saved.find((p) => p._key === key)!;
                expect(type === "work" ? image.image : image).toMatchObject(pictures[i].image);
            }
        }
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Studio 가격 — 공통 접두사가 같은 긴 키를 그대로 유지한다", async () => {
        db.document._type = "studioSpace";
        const prices = ["first", "second"].map((suffix) => ({ _key: `${"prefix-".repeat(7)}${suffix}`, label: suffix, value: "1000", unit: "원" }));
        expect(await saveSpace(null, basic({ ...shared, listsJson: JSON.stringify({ prices }) }))).toEqual({ ok: true });
        expect(db.document.prices).toEqual(prices);
    });
    it("Crew 링크 — 공백을 포함한 원래 키도 정규화하지 않아 원본 아이콘 메타데이터를 유지한다", async () => {
        const key = " original-key ";
        const icon = { _type: "image", asset: { _ref: "image-original" }, hotspot: { x: 0.5 } };
        Object.assign(db.document, { _type: "crew", links: [{ _key: key, url: "https://example.com", iconImage: icon }] });
        const data = basic({ ...shared, linkCount: "1", linkKey_0: key, linkUrl_0: "https://example.com", linkIconKeep_0: "image-original" });
        expect(await saveCrew(null, data)).toEqual({ ok: true });
        expect(db.document.links).toEqual([{ _key: key, url: "https://example.com", iconImage: icon }]);
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
});

describe("본문 한도 초과 시 업로드·문서 변경 차단", () => {
    const cases = [
        { name: "Works 문단", type: "work", save: saveWork, json: "blocksJson", target: "blocks", payload: [{ _key: "new-text", _type: "descriptionBlock", paragraphs: ["가".repeat(10001)] }] },
        { name: "Works 트랙 수", type: "work", save: saveWork, json: "blocksJson", target: "blocks", payload: [{ _key: "new-track", _type: "tracklistBlock", tracks: Array.from({ length: 101 }, (_, i) => ({ _key: `t-${i}`, title: "트랙" })) }] },
        { name: "Crew 소개 글", type: "crew", save: saveCrew, json: "sectionsJson", target: "sections", payload: [{ _key: "new-text", _type: "aboutSection", text: "가".repeat(5001) }] },
        { name: "Crew 경력 수", type: "crew", save: saveCrew, json: "sectionsJson", target: "sections", payload: [{ _key: "new-career", _type: "careerSection", items: Array.from({ length: 101 }, (_, i) => ({ _key: `r-${i}`, title: "경력" })) }] },
    ];
    it.each(cases)("$name — 함께 보낸 사진도 올리지 않고 기존 revision·본문을 유지한다", async ({ type, save, json, target, payload }) => {
        Object.assign(db.document, {
            _type: type, title: "저장된 제목", name: "저장된 이름", links: [],
            contentBlocks: [{ _key: "saved-work", _type: "descriptionBlock", paragraphs: ["기존 문단"] }],
            sections: [{ _key: "saved-crew", _type: "aboutSection", text: "기존 소개" }],
        });
        const before = JSON.stringify(db.document);
        const data = basic({ title: "새 작품", artist: "가수", releaseDate: "2026-10-26", name: "새 이름", koName: "한글", role: "역할", linkCount: "1", linkUrl_0: "https://example.com", [json]: JSON.stringify(payload) });
        data.set("imageFile", imageFile());
        data.set("linkIconFile_0", imageFile());
        const result = await save(null, data);
        expect(result).toMatchObject({ ok: false, fields: [{ id: target }] });
        expect("error" in result && result.error).toContain("내용은 저장하지 않았어요");
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.patch).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
        expect(JSON.stringify(db.document)).toBe(before);
    });
});

describe("업로드 실패 시 기존 문서 보존", () => {
    const fields = { title: "작품", artist: "아티스트", releaseDate: "2026-10-26", name: "이름", koName: "한글 이름", role: "역할", linkCount: "0", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "안내", process: "과정" };
    it.each([
        { name: "강사 목록 사진", type: "instructor", save: saveInstructor, field: "imageFile" },
        { name: "강사 상세 사진", type: "instructor", save: saveInstructor, field: "modalImageFile" },
        { name: "강사 배경 사진", type: "instructor", save: saveInstructor, field: "bgImageFile" },
        { name: "Crew 대표 사진", type: "crew", save: saveCrew, field: "imageFile" },
        { name: "Crew 링크 아이콘", type: "crew", save: saveCrew, field: "linkIconFile_0" },
        { name: "Works 커버", type: "work", save: saveWork, field: "imageFile" },
        { name: "Works 본문 사진", type: "work", save: saveWork, field: "blockImage_existing" },
        { name: "Studio 사진", type: "studioSpace", save: saveSpace, field: "spaceImage_existing" },
    ])("$name 실패는 문서·참조·revision을 바꾸지 않는다", async ({ type, save, field }) => {
        const oldImage = { _type: "image", asset: { _type: "reference", _ref: "image-existing" }, hotspot: { x: 0.4, y: 0.6, width: 0.5, height: 0.5 } };
        Object.assign(db.document, { _type: type, title: "이전 제목", image: oldImage, modalImage: oldImage, bgImage: oldImage, coverImage: oldImage, images: [{ ...oldImage, _key: "existing" }], contentBlocks: [{ _type: "imageBlock", _key: "existing", image: oldImage }], links: [{ _key: "existing", url: "https://example.com", iconImage: oldImage }] });
        const before = JSON.stringify(db.document);
        const data = basic(fields); data.set(field, imageFile());
        if (field.startsWith("spaceImage_")) data.set("listsJson", JSON.stringify(studioSpacePayload({ images: [{ _key: "existing" }] })));
        if (field.startsWith("blockImage_")) data.set("blocksJson", JSON.stringify(workPayloadFixture([{ _type: "imageBlock", _key: "existing" }])));
        if (field.startsWith("linkIconFile_")) {
            data.set("linkCount", "1"); data.set("linkKey_0", "existing"); data.set("linkUrl_0", "https://example.com"); data.set("linkIconKeep_0", "image-existing");
        }
        client.assets.upload.mockRejectedValueOnce(new Error("private upstream details"));
        expect(await save(null, data)).toMatchObject({ ok: false, error: expect.stringContaining("사진을 올리지 못했어요") });
        expect(client.assets.upload).toHaveBeenCalledTimes(1);
        expect(client.patch).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
        expect(JSON.stringify(db.document)).toBe(before);
    });
});
