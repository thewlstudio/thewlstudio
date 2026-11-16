import { describe, expect, it, vi } from "vitest";
import { applyOrder, moveOrder, type OrderRow } from "./manage-reorder";

const rows = () => [{ _id: "a", _rev: "ra", order: 1 }, { _id: "b", _rev: "rb", order: 2 }];
function mock(source: unknown) {
    const ids: string[] = [];
    const patch = vi.fn((id: string) => { ids.push(id); return tx; });
    const commit = vi.fn(async () => ({ transactionId: "tx-ok", documentIds: ids, results: ids.map((id) => ({ id, operation: "update" })) }));
    const tx = { patch, commit };
    const fetch = vi.fn(async () => source);
    const transaction = vi.fn(() => tx);
    const refresh = vi.fn();
    return { client: { fetch, transaction } as never, fetch, transaction, patch, commit, refresh };
}

const invalidSources = [
    { name: "null", make: () => null },
    { name: "객체", make: () => ({}) },
    { name: "빈 슬롯", make: () => [rows()[0], , rows()[1]] },
    { name: "null 행", make: () => [null, rows()[1]] },
    { name: "문자열 행", make: () => ["a", rows()[1]] },
    { name: "배열 행", make: () => [Object.assign([], rows()[0]), rows()[1]] },
    { name: "중복 문서", make: () => [rows()[0], { ...rows()[0], _rev: "other" }, rows()[1]] },
    { name: "초안 문서", make: () => [{ ...rows()[0], _id: "drafts.a" }, rows()[1]] },
    { name: "버전 문서", make: () => [{ ...rows()[0], _id: "versions.a" }, rows()[1]] },
    { name: "빈 버전", make: () => [{ ...rows()[0], _rev: "" }, rows()[1]] },
    { name: "공백 버전", make: () => [{ ...rows()[0], _rev: " \t\n" }, rows()[1]] },
    { name: "버전 자료형", make: () => [{ ...rows()[0], _rev: 1 }, rows()[1]] },
    { name: "상속 ID", make: () => [Object.assign(Object.create({ _id: "a" }), { _rev: "ra", order: 1 }), rows()[1]] },
    { name: "상속 버전", make: () => [Object.assign(Object.create({ _rev: "ra" }), { _id: "a", order: 1 }), rows()[1]] },
    { name: "문자열 순서", make: () => [{ ...rows()[0], order: "1" }, rows()[1]] },
    { name: "불리언 순서", make: () => [{ ...rows()[0], order: false }, rows()[1]] },
    { name: "객체 순서", make: () => [{ ...rows()[0], order: {} }, rows()[1]] },
    { name: "배열 순서", make: () => [{ ...rows()[0], order: [] }, rows()[1]] },
    { name: "상속 순서", make: () => [Object.assign(Object.create({ order: 1 }), { _id: "a", _rev: "ra" }), rows()[1]] },
];

describe.each(["drag", "arrow"] as const)("%s 순서 원본 검증", (path) => {
    it.each(invalidSources)("$name 원본은 트랜잭션 생성 전 거부한다", async ({ make }) => {
        const source = make(); const m = mock(source);
        const result = path === "drag"
            ? await applyOrder(m.client, "q", {}, ["b", "a"], false, m.refresh)
            : await moveOrder(m.client, source as OrderRow[], "a", "down", m.refresh);
        expect(result).toMatchObject({ ok: false, error: expect.any(String) });
        expect(m.transaction).not.toHaveBeenCalled(); expect(m.commit).not.toHaveBeenCalled(); expect(m.refresh).not.toHaveBeenCalled();
    });
});

describe("드래그 요청 사전 검증", () => {
    it.each([
        { name: "null", value: null }, { name: "문자열", value: "a,b" }, { name: "빈 배열", value: [] },
        { name: "빈 슬롯", value: [, "b"] }, { name: "중복", value: ["a", "a"] },
        { name: "숫자", value: [1, "b"] }, { name: "초안", value: ["drafts.a", "b"] },
        { name: "버전", value: ["versions.a", "b"] },
    ])("$name 요청은 조회·쓰기·갱신하지 않는다", async ({ value }) => {
        const m = mock(rows());
        expect((await applyOrder(m.client, "q", {}, value as string[], false, m.refresh)).ok).toBe(false);
        expect(m.fetch).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled(); expect(m.refresh).not.toHaveBeenCalled();
    });
});

describe("그룹 원본과 정상 순서 계약", () => {
    it.each([undefined, null, "", " \t", 1])("잘못된 그룹 #%#은 쓰지 않는다", async (group) => {
        const m = mock(rows().map((row) => ({ ...row, group })));
        expect((await applyOrder(m.client, "q", {}, ["b", "a"], true, m.refresh)).ok).toBe(false);
        expect(m.transaction).not.toHaveBeenCalled(); expect(m.refresh).not.toHaveBeenCalled();
    });
    it("상속 그룹은 쓰지 않는다", async () => {
        const m = mock(rows().map((row) => Object.assign(Object.create({ group: "room" }), row)));
        expect((await applyOrder(m.client, "q", {}, ["b", "a"], true)).ok).toBe(false);
        expect(m.transaction).not.toHaveBeenCalled();
    });
    it.each([undefined, null, -3, 0.5, Number.MAX_SAFE_INTEGER, NaN, Infinity])("기존 숫자·누락 순서는 안전한 정수로 정리하며 원본을 바꾸지 않는다 #%#", async (order) => {
        const source = rows().map((row) => ({ ...row, order })); const before = structuredClone(source); const m = mock(source);
        expect(await applyOrder(m.client, "q", {}, ["b", "a"], false, m.refresh)).toEqual({ ok: true });
        expect(source).toEqual(before);
        for (const [, value] of m.patch.mock.calls as unknown as [string, { set: { order: number } }][]) expect(Number.isSafeInteger(value.set.order)).toBe(true);
        expect(m.refresh).toHaveBeenCalledTimes(1);
    });
    it("큰 정상 목록에서도 함수 인자 수 제한 없이 최솟값을 구한다", async () => {
        const source = Array.from({ length: 150_000 }, (_, order) => ({ _id: `item-${order}`, _rev: "r", order })); const m = mock(source);
        expect(await applyOrder(m.client, "q", {}, source.map((row) => row._id))).toEqual({ ok: true });
        expect(m.patch).not.toHaveBeenCalled(); expect(m.commit).not.toHaveBeenCalled();
    });
});
