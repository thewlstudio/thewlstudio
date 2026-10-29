import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveInstructor, createInstructor, deleteInstructor, restoreInstructor, duplicateInstructor, moveInstructorOrder } from "./instructors/actions";
import { saveCrew, createCrew, deleteCrew, restoreCrew, moveCrewOrder } from "./crew/actions";
import { saveWork, createWork, deleteWork, restoreWork } from "./works/actions";
import { saveSpace, createSpace, deleteSpace, restoreSpace, moveSpaceOrder } from "./studio/actions";
import { saveSettings } from "./contact/actions";
import { saveStudioInfo } from "./studio/info/actions";
import { FALLBACK_SETTINGS, mergeSettings } from "@/lib/site-settings";
import { FALLBACK_INFO } from "@/lib/studio-info";
import { revalidatePath, updateTag } from "next/cache";
import { studioSpacePayload } from "@/test/studio-payloads";

const { auth, getClient, client, patch, db, navigate } = vi.hoisted(() => ({
    auth: vi.fn(), getClient: vi.fn(), navigate: vi.fn(),
    client: { getDocument: vi.fn(), fetch: vi.fn(), patch: vi.fn(), transaction: vi.fn(), create: vi.fn(), assets: { upload: vi.fn() } },
    patch: { set: vi.fn(), unset: vi.fn(), ifRevisionId: vi.fn(), patch: vi.fn(), createIfNotExists: vi.fn(), commit: vi.fn() },
    db: { doc: undefined as Record<string, unknown> | undefined },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: getClient }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));

function form(type: string, id = "target") {
    const data = new FormData();
    const values: Record<string, string> = {
        documentId: id, instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정",
        name: "이름", koName: "한글 이름", role: "역할", title: "작품", artist: "아티스트", releaseDate: "2026-10-26",
        listsJson: JSON.stringify(studioSpacePayload()), linkCount: "0",
    };
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    if (["instructor", "crew", "work", "studioSpace"].includes(type)) {
        const image = new File(["photo"], "photo.png", { type: "image/png" });
        if (type === "studioSpace") {
            data.set("listsJson", JSON.stringify(studioSpacePayload({ images: [{ _key: "new-photo" }] })));
            data.set("spaceImage_new-photo", image);
        } else data.set("imageFile", image);
    }
    if (type === "siteSettings") for (const [key, value] of Object.entries(FALLBACK_SETTINGS)) data.set(key, value);
    if (type === "studioInfo") data.set("dataJson", JSON.stringify(FALLBACK_INFO));
    return data;
}
const areas = [
    { name: "강사", type: "instructor", save: saveInstructor, remove: deleteInstructor, restore: restoreInstructor },
    { name: "Crew", type: "crew", save: saveCrew, remove: deleteCrew, restore: restoreCrew },
    { name: "Works", type: "work", save: saveWork, remove: deleteWork, restore: restoreWork },
    { name: "Studio", type: "studioSpace", save: saveSpace, remove: deleteSpace, restore: restoreSpace },
];
const mutations = areas.flatMap((area) => [
    { name: `${area.name} 저장`, type: area.type, run: (id: string) => area.save(null, form(area.type, id)) },
    { name: `${area.name} 삭제`, type: area.type, run: area.remove },
    { name: `${area.name} 복원`, type: area.type, run: area.restore },
]).concat([{ name: "강사 복제", type: "instructor", run: duplicateInstructor }]);

function refreshPaths(type: string, slug = "100%25-live") {
    if (type === "instructor") return [["/class"], ["/manage/instructors"]];
    if (type === "crew" || type === "work") {
        const area = type === "crew" ? "crew" : "works";
        return [[`/${area}`], [`/${area}/${slug}`], ["/sitemap.xml"], [`/manage/${area}`]];
    }
    if (type === "siteSettings") return [["/", "layout"]];
    if (type === "studioInfo") return [["/studio"]];
    return [["/studio"], ["/manage/studio"]];
}
function expectRefresh(type: string, paths = refreshPaths(type)) {
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(type);
    expect(vi.mocked(revalidatePath).mock.calls).toHaveLength(paths.length);
    expect(vi.mocked(revalidatePath).mock.calls).toEqual(expect.arrayContaining(paths));
}
function expectNoRefresh() {
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
}

describe("저장·삭제·복원·복제 후 캐시 갱신", () => {
    it.each(mutations)("$name은 자기 태그와 공개·관리 경로를 갱신한다", async ({ type, run, name }) => {
        db.doc = { _id: "target", _type: type, _rev: "rev-1", slug: { current: "100%-live" }, trashed: name.includes("복원"), contentBlocks: [], sections: [] };
        expect((await run("target")).ok).toBe(true);
        expectRefresh(type);
    });
    it.each(mutations)("$name의 쓰기가 실패하면 성공용 캐시 갱신을 호출하지 않는다", async ({ type, run, name }) => {
        db.doc = { _id: "target", _type: type, _rev: "rev-1", slug: { current: "target" } };
        patch.commit.mockRejectedValue({ statusCode: 409 });
        client.create.mockRejectedValue(new Error("write failed"));
        expect((await run("target")).ok).toBe(false);
        if (name === "강사 복제") expect(client.create).toHaveBeenCalledTimes(1);
        else expect(patch.commit).toHaveBeenCalledTimes(1);
        expectNoRefresh();
    });
    it("저장 완료를 기다린 뒤에만 태그·경로를 갱신한다", async () => {
        db.doc = { _id: "target", _type: "work", _rev: "rev-1", slug: { current: "100%-live" } };
        let started!: () => void;
        let finish!: (value: { _id: string }) => void;
        const committing = new Promise<void>((resolve) => { started = resolve; });
        patch.commit.mockImplementation(() => { started(); return new Promise((resolve) => { finish = resolve; }); });
        const result = saveWork(null, form("work"));
        await committing;
        expectNoRefresh();
        finish({ _id: "target" });
        expect(await result).toEqual({ ok: true });
        expectRefresh("work");
    });
});

const creates = [
    { type: "instructor", area: "instructors", create: createInstructor },
    { type: "crew", area: "crew", create: createCrew },
    { type: "work", area: "works", create: createWork },
    { type: "studioSpace", area: "studio", create: createSpace },
];
function createForm(type: string) {
    const data = form(type);
    data.set("slug", "test-slug");
    if (type === "instructor") data.set("bgImageFile", new File(["photo"], "bg.png", { type: "image/png" }));
    return data;
}
describe.each(creates)("$area 생성 후 갱신과 이동", ({ type, area, create }) => {
    it("생성 완료 후 캐시를 갱신하고 실제 새 문서로 이동한다", async () => {
        await expect(create(null, createForm(type))).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
        expectRefresh(type, refreshPaths(type, "test-slug"));
        expect(navigate).toHaveBeenCalledExactlyOnceWith(`/manage/${area}/new-document?created=1`);
        expect(client.create.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(updateTag).mock.invocationCallOrder[0]);
        expect(vi.mocked(revalidatePath).mock.invocationCallOrder.at(-1)!).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    });
    it("최종 저장 실패 때는 캐시 갱신이나 성공 이동을 하지 않는다", async () => {
        client.create.mockRejectedValue(new Error("create failed"));
        expect((await create(null, createForm(type))).ok).toBe(false);
        expect(client.create).toHaveBeenCalledTimes(1);
        expectNoRefresh();
        expect(navigate).not.toHaveBeenCalled();
    });
    it("인증이 실패하면 쓰기·캐시 갱신·이동을 하지 않는다", async () => {
        auth.mockRejectedValue(new Error("인증이 필요해요."));
        expect((await create(null, createForm(type))).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
        expectNoRefresh();
        expect(navigate).not.toHaveBeenCalled();
    });
    it("필수 입력이 빠지면 쓰기·캐시 갱신·이동을 하지 않는다", async () => {
        expect((await create(null, new FormData())).ok).toBe(false);
        expect(client.create).not.toHaveBeenCalled();
        expectNoRefresh();
        expect(navigate).not.toHaveBeenCalled();
    });
});

describe.each([
    ...areas.map((area) => ({ name: `${area.name} 저장`, type: area.type, run: area.save })),
    ...creates.map((area) => ({ name: `${area.area} 생성`, type: area.type, run: area.create })),
])("$name 이미지 사전 검사", ({ type, run }) => {
    const imageField = type === "studioSpace" ? "spaceImage_new-photo" : "imageFile";
    it.each([
        { name: "파일 대신 문자열", make: () => "not-a-file", message: "다시 선택" },
        { name: "선택한 빈 파일", make: () => new File([], "empty.png", { type: "image/png" }), message: "비어 있어요" },
        { name: "이미지 아닌 파일", make: () => new File(["text"], "bad.png", { type: "text/plain" }), message: "이미지 파일만" },
        { name: "장당 상한 초과", make: () => new File([new Uint8Array(2_800_001)], "large.png", { type: "image/png" }), message: "2.8MB 이하" },
    ])("$name는 저장소 접근·업로드 전에 거부한다", async ({ make, message }) => {
        db.doc = { _id: "target", _type: type, _rev: "rev-1" };
        const data = createForm(type); data.set(imageField, make());
        expect(await run(null, data)).toMatchObject({ ok: false, error: expect.stringContaining(message) });
        expect(getClient).not.toHaveBeenCalled();
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(patch.commit).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
        expectNoRefresh();
    });
    it("각 사진은 상한 이하여도 합계가 크면 저장소 접근 전에 거부한다", async () => {
        const data = createForm(type);
        data.set(imageField, new File([new Uint8Array(1_900_000)], "one.png", { type: "image/png" }));
        data.set("blockImage_budget-test", new File([new Uint8Array(1_900_000)], "two.png", { type: "image/png" }));
        expect(await run(null, data)).toMatchObject({ ok: false, error: expect.stringContaining("한 번에 보내는") });
        expect(getClient).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expectNoRefresh();
    });
    it("사진이 잘못되어도 인증을 먼저 검사한다", async () => {
        auth.mockRejectedValue(new Error("인증이 필요해요."));
        const data = createForm(type); data.set(imageField, "not-a-file");
        expect(await run(null, data)).toMatchObject({ ok: false, error: "인증이 필요해요." });
        expect(getClient).not.toHaveBeenCalled(); expectNoRefresh();
    });
});

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "target", _type: "unrelated", _rev: "rev-1", name: "그대로 둘 값" };
    auth.mockResolvedValue(undefined);
    navigate.mockImplementation(() => { throw Object.assign(new Error("test redirect"), { digest: "TEST_REDIRECT" }); });
    getClient.mockReturnValue(client);
    client.getDocument.mockImplementation(async () => db.doc ? { ...db.doc } : undefined);
    client.fetch.mockImplementation(async (query: string) => {
        if (query.startsWith("count(")) return 0;
        if (query.includes("defined(order)")) return [0];
        if (query.endsWith(".contentBlocks")) return db.doc?.contentBlocks ?? [];
        if (query.endsWith(".sections")) return db.doc?.sections ?? [];
        if (query.endsWith(".slug.current")) return "slug";
        if (query.includes('_type == "instructor"')) return db.doc?._type === "instructor" ? db.doc : null;
        return db.doc ?? null;
    });
    client.patch.mockReturnValue(patch);
    client.transaction.mockReturnValue(patch);
    for (const method of [patch.set, patch.unset, patch.ifRevisionId, patch.patch, patch.createIfNotExists]) method.mockReturnValue(patch);
    patch.commit.mockResolvedValue({ _id: "target" });
    client.create.mockResolvedValue({ _id: "new-document" });
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
});
afterEach(() => vi.restoreAllMocks());

describe("새 문서 생성의 중복 배열 키 차단", () => {
    it.each([
        { label: "Crew 링크", type: "crew", create: createCrew, configure: (data: FormData) => {
            data.set("slug", "new-crew"); data.set("linkCount", "2");
            for (const i of [0, 1]) { data.set(`linkKey_${i}`, "same"); data.set(`linkUrl_${i}`, "https://example.com"); }
            data.set("linkIconFile_0", new File(["photo"], "icon.png", { type: "image/png" }));
        } },
        { label: "Studio 가격", type: "studioSpace", create: createSpace, configure: (data: FormData) => data.set("listsJson", JSON.stringify(studioSpacePayload({ prices: [{ _key: "same", label: "기본" }, { _key: "same", label: "회원" }], images: [{ _key: "new-photo" }] }))) },
        { label: "Studio 사진", type: "studioSpace", create: createSpace, configure: (data: FormData) => data.set("listsJson", JSON.stringify(studioSpacePayload({ images: [{ _key: "new-photo" }, { _key: "new-photo" }] }))) },
    ])("$label은 생성·업로드·이동을 실행하지 않는다", async ({ type, create, configure }) => {
        const data = form(type); configure(data);
        const result = await create(null, data);
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("중복") });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
        expect(client.patch).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expectNoRefresh();
    });
});

describe("공개 링크와 같은 규칙으로 저장 주소를 검증한다", () => {
    const cases = [
        { type: "instructor", field: "portfolioUrl", save: saveInstructor },
        { type: "crew", field: "linkUrl_0", save: saveCrew },
        { type: "work", field: "youtubeUrl", save: saveWork },
        { type: "work", field: "instagramUrl", save: saveWork },
        { type: "siteSettings", field: "blogUrl", save: saveSettings },
    ];
    it.each(cases)("$type/$field — 잘못된 주소는 필드 오류로 반환하고 업로드·쓰기를 하지 않는다", async ({ type, field, save }) => {
        db.doc = { _id: "target", _type: type, _rev: "v1", slug: { current: "target" } };
        for (const url of ["javascript:alert(1)", "https://user:pass@example.com", "https://example.com/\npath"]) {
            const data = form(type);
            data.set(field, url);
            if (type === "crew") data.set("linkCount", "1");
            const result = await save(null, data);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.fields).toEqual(expect.arrayContaining([expect.objectContaining({ id: field })]));
            expect(client.assets.upload).not.toHaveBeenCalled();
            expect(patch.commit).not.toHaveBeenCalled();
            expect(client.create).not.toHaveBeenCalled();
        }
    });
    it("YouTube 위장 주소는 작품 블록 필드 오류로 반환한다", async () => {
        db.doc = { _id: "target", _type: "work", _rev: "v1", contentBlocks: [], slug: { current: "target" } };
        const data = form("work");
        data.set("blocksJson", JSON.stringify([{ _key: "video", _type: "videoEmbedBlock", url: "https://example.com/watch?v=R86SFBXqEdM" }]));
        const result = await saveWork(null, data);
        expect(result).toMatchObject({ ok: false, fields: [{ id: "blocks" }] });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(patch.commit).not.toHaveBeenCalled();
    });
});

describe("연락처 저장과 공개 조회의 정책 일치", () => {
    it.each([
        { field: "naverMapPlaceUrl", value: "https://naver.com.evil.example/path" },
        { field: "naverReservationUrl", value: "https://notnaver.me/path" },
        { field: "instagramUrl", value: "https://notinstagram.com/profile" },
        { field: "phone", value: "12\n345" },
        { field: "phone", value: "12\t345" },
        { field: "phone", value: "-----" },
    ])("$field의 $value는 저장하지 않고 해당 칸의 오류를 반환한다", async ({ field, value }) => {
        const data = form("siteSettings"); data.set(field, value);
        expect(await saveSettings(null, data)).toMatchObject({ ok: false, fields: [{ id: field }] });
        expect(client.getDocument).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled(); expect(patch.commit).not.toHaveBeenCalled();
        expectNoRefresh();
    });
    it.each([
        { field: "naverMapPlaceUrl", value: "https://naver.me/map" },
        { field: "naverReservationUrl", value: "https://booking.naver.com/booking/1?a=%252F#info" },
        { field: "instagramUrl", value: "https://www.instagram.com/studio/" },
        { field: "blogUrl", value: "https://custom-blog.example/post" },
        { field: "phone", value: "+82 (0)2-1234-5678" },
    ])("$field의 승인된 값을 저장한 뒤에도 같은 공개 값으로 사용한다", async ({ field, value }) => {
        db.doc = { _id: "siteSettings", _type: "siteSettings", _rev: "v1" };
        const data = form("siteSettings"); data.set(field, value);
        expect(await saveSettings(null, data)).toEqual({ ok: true });
        const saved = patch.set.mock.calls[0][0];
        expect(saved[field]).toBe(value);
        expect(mergeSettings(saved)[field as keyof typeof FALLBACK_SETTINGS]).toBe(value);
        expectRefresh("siteSettings");
    });
});

describe.each(mutations)("$name의 대상 검증", ({ type, run }) => {
    it("다른 종류의 문서에는 쓰지 않는다", async () => {
        expect((await run("target")).ok).toBe(false);
        expect(patch.commit).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("이미 사라진 문서를 성공 처리하지 않는다", async () => {
        db.doc = undefined;
        expect((await run("target")).ok).toBe(false);
        expect(patch.commit).not.toHaveBeenCalled();
    });
    it.each(["drafts.target", "versions.release.target", "bad/id", "../target"])("관리 범위 밖의 ID %s는 쓰기 전에 거부한다", async (id) => {
        db.doc = { _id: id, _type: type, _rev: "rev-1" };
        expect((await run(id)).ok).toBe(false);
        expect(patch.commit).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
    });
    it("인증 실패 시 저장소에 접근하지 않는다", async () => {
        auth.mockRejectedValue(new Error("인증이 필요해요."));
        expect((await run("target")).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
        expectNoRefresh();
    });
});

describe.each(areas)("$name의 정상 변경", (area) => {
    it("유효한 대상은 확인한 revision으로 저장한다", async () => {
        db.doc = { _id: "target", _type: area.type, _rev: "rev-1", slug: { current: "slug" }, images: [] };
        expect(await area.save(null, form(area.type))).toEqual({ ok: true });
        expect(patch.ifRevisionId).toHaveBeenCalledWith("rev-1");
        expect(patch.commit).toHaveBeenCalledTimes(1);
    });
    it("삭제·복원도 확인한 문서의 revision을 조건으로 건다", async () => {
        db.doc = { _id: "target", _type: area.type, _rev: "rev-1" };
        expect(await area.remove("target")).toEqual({ ok: true });
        expect(patch.ifRevisionId).toHaveBeenCalledWith("rev-1");
        expect(patch.set).toHaveBeenCalledWith({ trashed: true });
        expect(await area.restore("target")).toEqual({ ok: true });
        expect(patch.set).toHaveBeenCalledWith({ trashed: false });
    });
    it("업로드 전에 종류를 확인하고, 저장 직전 충돌은 성공 처리하지 않는다", async () => {
        db.doc = { _id: "target", _type: area.type, _rev: "rev-1", images: [] };
        const data = form(area.type);
        data.set("imageFile", new File(["photo"], "photo.png", { type: "image/png" }));
        patch.commit.mockRejectedValue({ statusCode: 409 });
        const result = await area.save(null, data);
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("내용이 바뀌었어요") });
        expect(client.assets.upload).toHaveBeenCalledTimes(1);
        expect(client.getDocument.mock.invocationCallOrder[0]).toBeLessThan(client.assets.upload.mock.invocationCallOrder[0]);
        expect(patch.ifRevisionId).toHaveBeenCalledWith("rev-1");
    });
});

describe.each([
    { type: "siteSettings", save: saveSettings }, { type: "studioInfo", save: saveStudioInfo },
])("고정 문서 $type", ({ type, save }) => {
    it("같은 고정 ID가 다른 문서 종류에 쓰이고 있으면 덮어쓰지 않는다", async () => {
        db.doc = { _id: type, _type: "work", _rev: "rev-1" };
        expect((await save(null, form(type))).ok).toBe(false);
        expect(patch.commit).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
        expectNoRefresh();
    });
    it("문서가 없을 때만 고정 ID로 새로 만든다", async () => {
        db.doc = undefined;
        expect(await save(null, form(type))).toEqual({ ok: true });
        expect(client.create).toHaveBeenCalledWith(expect.objectContaining({ _id: type, _type: type }));
        expect(patch.commit).not.toHaveBeenCalled();
        expectRefresh(type);
    });
    it("기존 설정 문서는 종류·revision을 확인한 뒤 필요한 필드만 바꾼다", async () => {
        db.doc = { _id: type, _type: type, _rev: "rev-1", extraField: "유지" };
        expect(await save(null, form(type))).toEqual({ ok: true });
        expect(patch.ifRevisionId).toHaveBeenCalledWith("rev-1");
        expect(client.create).not.toHaveBeenCalled();
        expectRefresh(type);
    });
    it("처음 생성하는 사이 같은 ID가 생기면 덮어쓰지 않는다", async () => {
        db.doc = undefined;
        client.create.mockRejectedValue({ statusCode: 409 });
        expect(await save(null, form(type))).toMatchObject({ ok: false, error: expect.stringContaining("내용이 바뀌었어요") });
        expect(client.patch).not.toHaveBeenCalled();
        expectNoRefresh();
    });
    it("설정 저장 충돌 때는 성공용 태그·경로 갱신을 하지 않는다", async () => {
        db.doc = { _id: type, _type: type, _rev: "rev-1" };
        patch.commit.mockRejectedValue({ statusCode: 409 });
        expect((await save(null, form(type))).ok).toBe(false);
        expect(patch.commit).toHaveBeenCalledTimes(1);
        expectNoRefresh();
    });
});

describe.each([moveInstructorOrder, moveCrewOrder, moveSpaceOrder])("순서 이동 입력 검증", (move) => {
    it("타입 선언만 믿지 않고 실제 방향 값을 검사한다", async () => {
        expect((await move("target", "sideways" as "up")).ok).toBe(false);
        expect(client.fetch).not.toHaveBeenCalled();
        expect(client.getDocument).not.toHaveBeenCalled();
        expect(patch.commit).not.toHaveBeenCalled();
    });
    it("정상 이동은 양쪽 문서의 revision을 한 트랜잭션에 건다", async () => {
        db.doc = { _id: "target", _type: "studioSpace", _rev: "rev-1", kind: "room" };
        client.fetch.mockResolvedValue([{ _id: "target", _rev: "rev-1", order: 1 }, { _id: "other", _rev: "rev-2", order: 2 }]);
        expect(await move("target", "down")).toEqual({ ok: true });
        expect(patch.patch).toHaveBeenCalledWith("target", { ifRevisionID: "rev-1", set: { order: 2 } });
        expect(patch.patch).toHaveBeenCalledWith("other", { ifRevisionID: "rev-2", set: { order: 1 } });
        expect(patch.commit).toHaveBeenCalledTimes(1);
    });
    it("대상 목록에 버전 정보가 없으면 쓰지 않는다", async () => {
        db.doc = { _id: "target", _type: "studioSpace", _rev: "rev-1" };
        client.fetch.mockResolvedValue([{ _id: "target", order: 1 }, { _id: "other", order: 2 }]);
        expect((await move("target", "down")).ok).toBe(false);
        expect(patch.commit).not.toHaveBeenCalled();
    });
});
