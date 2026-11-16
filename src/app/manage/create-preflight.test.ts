import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstructor, duplicateInstructor } from "./instructors/actions";
import { createCrew } from "./crew/actions";
import { createWork } from "./works/actions";
import { createSpace } from "./studio/actions";
import { studioSpacePayload } from "@/test/studio-payloads";
import { revalidatePath, updateTag } from "next/cache";
import { nextManagedOrder } from "@/lib/manage-create-preflight";

type Raw = Record<string, unknown>;
const { client, state, navigate, auth } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), fetch: vi.fn(), assets: { upload: vi.fn() }, create: vi.fn() },
    state: { orders: [] as unknown, count: 0 as unknown, fields: {} as Raw }, navigate: vi.fn(), auth: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const redirect = new Error("test redirect");
function form(type: string): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries({ instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: "소개", process: "과정", name: "CREW", koName: "크루", role: "역할", slug: "new-page", title: "작품", artist: "가수", releaseDate: "2026-11-03", linkCount: "1", linkUrl_0: "https://example.com" })) data.set(key, value);
    for (const key of ["imageFile", "bgImageFile", "linkIconFile_0", "spaceImage_new-photo"]) data.set(key, new File(["mock image"], "photo.png", { type: "image/png" }));
    if (type === "studioSpace") data.set("listsJson", JSON.stringify(studioSpacePayload({ images: [{ _key: "new-photo" }] })));
    return data;
}
function noWrites() {
    expect(client.assets.upload).not.toHaveBeenCalled(); expect(client.create).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
}
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); auth.mockResolvedValue(undefined);
    state.orders = [0, 2]; state.count = 0; state.fields = {};
    client.getDocument.mockResolvedValue({ _id: "source", _type: "instructor", _rev: "v1", instructorName: "강사", order: 2, about: ["소개"], process: ["과정"], custom: { keep: true } });
    client.fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? state.count : state.orders);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.create.mockImplementation(async (fields: Raw) => { state.fields = fields; return { _id: fields._id ?? "created", _type: fields._type, _rev: "v1" }; });
    navigate.mockImplementation(() => { throw redirect; });
});
afterEach(() => vi.restoreAllMocks());
const ordered = [
    { type: "instructor", run: () => createInstructor(null, form("instructor")) },
    { type: "crew", run: () => createCrew(null, form("crew")) },
    { type: "studioSpace", run: () => createSpace(null, form("studioSpace")) },
    { type: "복제", run: () => duplicateInstructor("source") },
];
const badOrders = [undefined, null, "not-array", {}, ["4"], [true], [NaN], [Infinity], [-Infinity], [Number.MAX_SAFE_INTEGER], [Number.MAX_SAFE_INTEGER + 1], [Number.MIN_SAFE_INTEGER - 1], [undefined]];
describe.each(ordered)("$type 순서 사전 조회", ({ run }) => {
    it.each(badOrders.map((value) => ({ value })))("비정상 응답 #%#이면 사진·문서를 생성하지 않는다", async ({ value }) => {
        state.orders = value;
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("순서") }); noWrites();
    });
    it("조회 실패도 업로드보다 먼저 종료한다", async () => {
        client.fetch.mockImplementation(async (query: string) => { if (query.startsWith("count(")) return 0; throw new Error("순서 조회 실패"); });
        expect(await run()).toMatchObject({ ok: false }); noWrites();
    });
    it("조회가 끝나기 전에는 업로드·생성을 시작하지 않는다", async () => {
        let resolve!: (value: unknown) => void;
        let started!: () => void;
        const waiting = new Promise<void>((ready) => { started = ready; });
        client.fetch.mockImplementation(async (query: string) => {
            if (query.startsWith("count(")) return 0;
            started(); return new Promise((done) => { resolve = done; });
        });
        const result = run().catch((error) => { expect(error).toBe(redirect); });
        await waiting; noWrites(); resolve([3]); await result;
        expect(state.fields.order).toBe(4); expect(client.create).toHaveBeenCalledTimes(1);
    });
    it.each([{ values: [], next: 0 }, { values: [null], next: 1 }, { values: [-4, null, -2], next: 1 }, { values: [1.5, 2.25], next: 3 }, { values: [-5, -3.5], next: -3 }, { values: [2, 2, 7], next: 8 }, { values: [Number.MAX_SAFE_INTEGER - 1], next: Number.MAX_SAFE_INTEGER }])("기존 값 $values는 건드리지 않고 안전한 다음 값 $next를 쓴다", async ({ values, next }) => {
        state.orders = structuredClone(values);
        try { await run(); } catch (error) { expect(error).toBe(redirect); }
        expect(client.create).toHaveBeenCalledTimes(1); expect(state.fields.order).toBe(next); expect(state.orders).toEqual(values);
        expect(Number.isSafeInteger(state.fields.order)).toBe(true);
    });
    it("정렬 조회에는 순서 없는 문서도 포함한다", async () => {
        try { await run(); } catch (error) { expect(error).toBe(redirect); }
        const orderQueries = client.fetch.mock.calls.map(([query]) => String(query)).filter((query) => !query.startsWith("count("));
        expect(orderQueries).toHaveLength(1); expect(orderQueries[0]).not.toContain("defined(order)");
        expect(orderQueries[0]).toContain(".order");
    });
});
it("큰 순서 목록도 인자 펼치기 없이 처리하고 원본을 유지한다", () => {
    const values = Array.from({ length: 200_000 }, (_, i) => i);
    expect(nextManagedOrder(values)).toBe(200_000); expect(values[0]).toBe(0); expect(values.at(-1)).toBe(199_999);
});
it("순서 목록의 빈 슬롯을 기본값 null로 추측하지 않는다", () => {
    expect(() => nextManagedOrder(Array(1))).toThrow("순서");
});
it("강사 복제는 비공개와 원본 사용자 필드 보존 규칙을 유지한다", async () => {
    expect(await duplicateInstructor("source")).toEqual({ ok: true, newId: "created" });
    expect(state.fields).toMatchObject({ isActive: false, custom: { keep: true }, about: ["소개"], process: ["과정"], order: 3 });
});
describe.each([{ type: "crew", run: createCrew }, { type: "work", run: createWork }])("$type 주소 중복 확인", ({ type, run }) => {
    it.each([undefined, null, "0", false, [], {}, -1, 0.5, Infinity, NaN].map((value) => ({ value })))("잘못된 개수 #%#를 사용 가능한 주소로 보지 않는다", async ({ value }) => {
        state.count = value;
        expect(await run(null, form(type))).toMatchObject({ ok: false, fields: [{ id: "slug" }] }); noWrites();
    });
    it("이미 쓰는 주소는 업로드 전에 거부한다", async () => {
        state.count = 1;
        expect(await run(null, form(type))).toMatchObject({ ok: false, error: expect.stringContaining("이미 쓰고"), fields: [{ id: "slug" }] }); noWrites();
    });
    it("중복 조회 예외면 생성하지 않는다", async () => {
        client.fetch.mockRejectedValue(new Error("조회 실패")); expect(await run(null, form(type))).toMatchObject({ ok: false }); noWrites();
    });
});
