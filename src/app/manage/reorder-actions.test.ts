import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moveInstructorOrder, reorderInstructors } from "./instructors/actions";
import { moveCrewOrder, reorderCrew } from "./crew/actions";
import { moveSpaceOrder, reorderSpaces } from "./studio/actions";

const { client, db, auth, invalidate, tag } = vi.hoisted(() => ({
    client: { fetch: vi.fn(), getDocument: vi.fn(), transaction: vi.fn() },
    db: { rows: [] as { _id: string; _rev: string; order?: number | null; group?: string }[] },
    auth: vi.fn(), invalidate: vi.fn(), tag: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: tag, revalidatePath: invalidate }));
let writes: { id: string; value: number; revision?: string }[];
let failCommit = false;
let commitAttempts = 0;
beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue(undefined);
    writes = [];
    failCommit = false;
    commitAttempts = 0;
    db.rows = [{ _id: "a", _rev: "ra", order: 1 }, { _id: "b", _rev: "rb", order: 1 }, { _id: "c", _rev: "rc", order: 9 }];
    client.fetch.mockImplementation(async () => db.rows.map((row) => ({ ...row })));
    client.getDocument.mockResolvedValue({ _id: "a", _type: "studioSpace", _rev: "ra", kind: "room" });
    client.transaction.mockImplementation(() => {
        const planned: typeof writes = [];
        const tx = {
            patch: (id: string, op: { ifRevisionID?: string; set: { order: number } }) => {
                planned.push({ id, value: op.set.order, revision: op.ifRevisionID });
                return tx;
            },
            commit: async () => {
                commitAttempts++;
                if (failCommit) throw { statusCode: 409 };
                for (const p of planned) {
                    const row = db.rows.find((r) => r._id === p.id)!;
                    if (row._rev !== p.revision) throw { statusCode: 409 };
                }
                writes.push(...planned);
                for (const p of planned) db.rows.find((r) => r._id === p.id)!.order = p.value;
            },
        };
        return tx;
    });
});
afterEach(() => vi.restoreAllMocks());
const order = () => [...db.rows].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || a._id.localeCompare(b._id)).map((r) => r._id);

describe.each([
    { area: "instructor", move: moveInstructorOrder, reorder: reorderInstructors, paths: ["/class", "/manage/instructors"] },
    { area: "crew", move: moveCrewOrder, reorder: reorderCrew, paths: ["/crew", "/sitemap.xml", "/manage/crew"] },
    { area: "studioSpace", move: moveSpaceOrder, reorder: reorderSpaces, paths: ["/studio", "/manage/studio"] },
])("$area 순서 변경의 실제 저장 결과", ({ area, move, reorder, paths }) => {
    beforeEach(() => {
        if (area === "studioSpace") db.rows = db.rows.map((row) => ({ ...row, group: "room" }));
    });
    it("동일한 순서값끼리도 한 칸 이동하고 중복값을 정리한다", async () => {
        expect(await move("a", "down")).toEqual({ ok: true });
        expect(order()).toEqual(["b", "a", "c"]);
        expect(new Set(db.rows.map((r) => r.order)).size).toBe(3);
        expect(tag).toHaveBeenCalledExactlyOnceWith(area);
        expect(invalidate.mock.calls).toEqual(expect.arrayContaining(paths.map((path) => [path])));
        expect(invalidate).toHaveBeenCalledTimes(paths.length);
    });
    it("순서값이 빠진 행도 유한한 숫자로 저장한다", async () => {
        db.rows[0].order = undefined;
        db.rows[1].order = null;
        expect(await move("a", "down")).toEqual({ ok: true });
        expect(order()).toEqual(["b", "a", "c"]);
        expect(db.rows.every((r) => Number.isSafeInteger(r.order))).toBe(true);
    });
    it("목록 끝에서는 아무것도 쓰지 않는다", async () => {
        expect((await move("a", "up")).ok).toBe(false);
        expect(writes).toHaveLength(0);
        expect(tag).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });
    it("정리 도중 버전 충돌이 나면 일부만 적용하거나 성공 처리하지 않는다", async () => {
        failCommit = true;
        const before = db.rows.map((r) => ({ ...r }));
        expect(await move("a", "down")).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") });
        expect(db.rows).toEqual(before);
        expect(commitAttempts).toBe(1);
        expect(invalidate).not.toHaveBeenCalled();
        expect(tag).not.toHaveBeenCalled();
    });
    it("드래그 저장도 자기 태그·목록·필요한 사이트맵만 갱신한다", async () => {
        expect(await reorder(["b", "a", "c"])).toEqual({ ok: true });
        expect(order()).toEqual(["b", "a", "c"]);
        expect(tag).toHaveBeenCalledExactlyOnceWith(area);
        expect(invalidate.mock.calls).toEqual(expect.arrayContaining(paths.map((path) => [path])));
        expect(invalidate).toHaveBeenCalledTimes(paths.length);
    });
    it("드래그 저장 충돌 때는 태그·경로 갱신을 하지 않는다", async () => {
        failCommit = true;
        expect((await reorder(["b", "a", "c"])).ok).toBe(false);
        expect(writes).toHaveLength(0);
        expect(commitAttempts).toBe(1);
        expect(tag).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });
});

describe("Studio 드래그의 서버 그룹 검증", () => {
    beforeEach(() => {
        db.rows = [
            { _id: "a", _rev: "ra", order: 1, group: "room" },
            { _id: "b", _rev: "rb", order: 2, group: "room" },
            { _id: "lobby", _rev: "rl", order: 50, group: "lobby" },
        ];
    });
    it("변조한 그룹 간 이동 요청은 쓰기 전에 거부한다", async () => {
        expect((await reorderSpaces(["lobby", "a", "b"])).ok).toBe(false);
        expect(writes).toHaveLength(0);
    });
    it("연습실 순서를 바꿀 때 로비의 순서값은 건드리지 않는다", async () => {
        expect(await reorderSpaces(["b", "a", "lobby"])).toEqual({ ok: true });
        expect(db.rows.find((r) => r._id === "lobby")!.order).toBe(50);
        expect(writes.map((w) => w.id)).toEqual(["b", "a"]);
    });
    it("다른 그룹에 순서값 중복·간격이 있어도 이번 조작에서 정리하지 않는다", async () => {
        db.rows.push({ _id: "lobby-2", _rev: "rl2", order: 50, group: "lobby" });
        expect(await reorderSpaces(["b", "a", "lobby", "lobby-2"])).toEqual({ ok: true });
        expect(db.rows.filter((row) => row.group === "lobby").map((row) => row.order)).toEqual([50, 50]);
        expect(writes.map((w) => w.id)).toEqual(["b", "a"]);
    });
    it("화살표 이동도 해당 종류의 목록만 조회해 처리한다", async () => {
        client.fetch.mockImplementation(async (_query, params: { kind: string }) => db.rows.filter((row) => row.group === params.kind).map((row) => ({ ...row })));
        expect(await moveSpaceOrder("a", "down")).toEqual({ ok: true });
        expect(client.fetch).toHaveBeenCalledWith(expect.stringContaining("$kind"), { kind: "room" });
        expect(db.rows.find((row) => row._id === "lobby")!.order).toBe(50);
        expect(writes.map((w) => w.id)).toEqual(["b", "a"]);
    });
});
