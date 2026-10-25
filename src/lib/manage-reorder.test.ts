import { describe, expect, it } from "vitest";
import { applyOrder } from "./manage-reorder";

function mock(docs: Array<{ _id: string; order?: number }>) {
    const patches: Array<[string, number]> = [];
    let committed = 0;
    const client = {
        fetch: async () => docs,
        transaction: () => {
            const t = {
                patch: (id: string, op: { set: { order: number } }) => {
                    patches.push([id, op.set.order]);
                    return t;
                },
                commit: async () => {
                    committed++;
                },
            };
            return t;
        },
    };
    return { client: client as never, patches, committedCount: () => committed };
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

    it("순서값이 비어 있는 항목이 있어도 가장 작은 값부터 이어서 매긴다", async () => {
        const m = mock([{ _id: "a" }, { _id: "b", order: 5 }, { _id: "c", order: 9 }]);
        await applyOrder(m.client, "q", {}, ["a", "b", "c"]);
        expect(m.patches).toEqual([["a", 5], ["b", 6], ["c", 7]]);
    });
});
