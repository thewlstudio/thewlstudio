import { describe, expect, it } from "vitest";
import { applyOrder, moveOrder, type OrderRow } from "./manage-reorder";

function mock(docs: Array<{ _id: string; _rev?: string; order?: number | null; group?: string }>) {
    const patches: Array<[string, number]> = [];
    const revisions: Array<[string, string | undefined]> = [];
    let committed = 0;
    const client = {
        fetch: async () => docs.map((doc) => ({ _rev: `rev-${doc._id}`, ...doc })),
        transaction: () => {
            const t = {
                patch: (id: string, op: { ifRevisionID?: string; set: { order: number } }) => {
                    patches.push([id, op.set.order]);
                    revisions.push([id, op.ifRevisionID]);
                    return t;
                },
                commit: async () => {
                    committed++;
                },
            };
            return t;
        },
    };
    return { client: client as never, patches, revisions, committedCount: () => committed };
}

const docs = [
    { _id: "a", order: 1 },
    { _id: "b", order: 2 },
    { _id: "c", order: 3 },
];

describe("applyOrder — 끌어서 정한 순서 저장", () => {
    it("새 순서대로 기존 순서값(1부터)을 다시 매기고 한 번에 저장한다", async () => {
        const m = mock(docs);
        expect(await applyOrder(m.client, "q", {}, ["c", "a", "b"])).toEqual({ ok: true });
        expect(m.patches).toEqual([["c", 1], ["a", 2], ["b", 3]]);
        expect(m.revisions).toEqual([["c", "rev-c"], ["a", "rev-a"], ["b", "rev-b"]]);
        expect(m.committedCount()).toBe(1);
    });

    it("순서가 그대로면 아무것도 저장하지 않는다", async () => {
        const m = mock(docs);
        expect(await applyOrder(m.client, "q", {}, ["a", "b", "c"])).toEqual({ ok: true });
        expect(m.patches).toHaveLength(0);
        expect(m.committedCount()).toBe(0);
    });

    it("바뀐 항목만 저장한다", async () => {
        const m = mock(docs);
        await applyOrder(m.client, "q", {}, ["b", "a", "c"]);
        expect(m.patches).toEqual([["b", 1], ["a", 2]]);
    });

    it.each([
        ["빠진 항목(오래된 화면)", ["a", "b"]],
        ["모르는 항목", ["a", "b", "x"]],
        ["중복", ["a", "a", "b"]],
        ["너무 많음", ["a", "b", "c", "d"]],
    ])("현재 목록과 다르면 거부한다 — %s", async (_name, ids) => {
        const m = mock(docs);
        const r = await applyOrder(m.client, "q", {}, ids);
        expect(r.ok).toBe(false);
        expect(m.committedCount()).toBe(0);
    });

    it("빈 값·잘못된 형식은 거부한다", async () => {
        const m = mock(docs);
        expect((await applyOrder(m.client, "q", {}, [])).ok).toBe(false);
        expect((await applyOrder(m.client, "q", {}, [1 as unknown as string])).ok).toBe(false);
    });
    it("초안 ID나 버전 정보가 없는 목록에는 쓰지 않는다", async () => {
        const m = mock([{ _id: "a", _rev: "" }, { _id: "b", order: 1 }]);
        expect((await applyOrder(m.client, "q", {}, ["b", "a"])).ok).toBe(false);
        expect(m.committedCount()).toBe(0);
        expect((await applyOrder(m.client, "q", {}, ["drafts.a", "b"])).ok).toBe(false);
    });

    it("순서값이 비어 있는 항목이 있어도 가장 작은 값부터 이어서 매긴다", async () => {
        const m = mock([{ _id: "a" }, { _id: "b", order: 5 }, { _id: "c", order: 9 }]);
        await applyOrder(m.client, "q", {}, ["a", "b", "c"]);
        expect(m.patches).toEqual([["a", 5], ["b", 6], ["c", 7]]);
    });
    it.each([
        { name: "중복", values: [1, 1] },
        { name: "누락", values: [undefined, null] },
        { name: "소수", values: [0.5, 1.5] },
        { name: "범위 초과", values: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER] },
        { name: "비정상 숫자", values: [NaN, Infinity] },
    ])("$name 값은 안전한 연속 정수로 정리한다", async ({ values }) => {
        const m = mock([{ _id: "a", order: values[0] }, { _id: "b", order: values[1] }]);
        expect(await applyOrder(m.client, "q", {}, ["b", "a"])).toEqual({ ok: true });
        const stored = new Map<string, number | null | undefined>([["a", values[0]], ["b", values[1]]]);
        m.patches.forEach(([id, value]) => stored.set(id, value));
        const next = [...stored.values()];
        expect(next.every(Number.isSafeInteger)).toBe(true);
        expect(new Set(next).size).toBe(2);
        expect(m.committedCount()).toBe(1);
    });
    it("그룹 정보가 없는 그룹 정렬은 거부한다", async () => {
        const m = mock(docs);
        expect((await applyOrder(m.client, "q", {}, ["b", "a", "c"], true)).ok).toBe(false);
        expect(m.committedCount()).toBe(0);
    });
    it("그룹별 순서가 그대로면 불필요한 정규화나 쓰기를 하지 않는다", async () => {
        const m = mock([{ _id: "a", order: 1, group: "room" }, { _id: "b", order: 8, group: "room" }, { _id: "l", order: 20, group: "lobby" }]);
        expect(await applyOrder(m.client, "q", {}, ["a", "b", "l"], true)).toEqual({ ok: true });
        expect(m.patches).toHaveLength(0);
        expect(m.committedCount()).toBe(0);
    });
});

describe("moveOrder — 조회한 목록으로 화살표 이동", () => {
    const rows: OrderRow[] = docs.map((row) => ({ ...row, _rev: `rev-${row._id}` }));
    it("위로 한 칸 옮기고 바뀐 두 항목만 저장한다", async () => {
        const m = mock(docs);
        expect(await moveOrder(m.client, rows, "b", "up")).toEqual({ ok: true });
        expect(m.patches).toEqual([["b", 1], ["a", 2]]);
        expect(m.revisions).toEqual([["b", "rev-b"], ["a", "rev-a"]]);
    });
    it("마지막 항목의 아래 이동과 없는 항목은 거부한다", async () => {
        const m = mock(docs);
        expect((await moveOrder(m.client, rows, "c", "down")).ok).toBe(false);
        expect((await moveOrder(m.client, rows, "missing", "up")).ok).toBe(false);
        expect(m.committedCount()).toBe(0);
    });
});
