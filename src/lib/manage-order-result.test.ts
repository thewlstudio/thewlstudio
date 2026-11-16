import { describe, expect, it, vi } from "vitest";
import { commitManagedOrder, UNKNOWN_ORDER_RESULT } from "./manage-order-result";

const good = () => ({ transactionId: "tx-ok", documentIds: ["a", "b"], results: [{ id: "a", operation: "update" }, { id: "b", operation: "none" }] });
describe("트랜잭션 기본 응답 경계", () => {
    it("요청 집합이 같으면 서버가 결과 순서를 다르게 반환해도 허용한다", async () => {
        const result = good(); const before = JSON.stringify(result); const request = vi.fn(async () => result);
        await commitManagedOrder(request, Object.freeze(["b", "a"])); expect(request).toHaveBeenCalledTimes(1); expect(JSON.stringify(result)).toBe(before);
    });
    it.each([
        { transactionId: null }, { transactionId: " " }, { transactionId: 1 }, { documentIds: null }, { documentIds: "a,b" },
        { documentIds: ["a", 1] }, { results: null }, { results: {} }, { results: [null, { id: "b", operation: "none" }] },
        { results: [{ id: "a" }, { id: "b", operation: "none" }] },
        { results: [{ id: "a", operation: "create" }, { id: "b", operation: "none" }] },
        { results: [{ id: "a", operation: { toString: () => "update" } }, { id: "b", operation: "none" }] },
        { documentIds: Array(2) }, { results: Array(2) },
    ])("비정상 속성 #%#는 원문 없이 결과 확인 안내로 거부한다", async (patch) => {
        const request = vi.fn(async () => ({ ...good(), ...patch }));
        await expect(commitManagedOrder(request, ["a", "b"])).rejects.toThrow(UNKNOWN_ORDER_RESULT); expect(request).toHaveBeenCalledTimes(1);
    });
    it.each(["transactionId", "documentIds", "results"])("%s 속성을 생략한 응답도 성공으로 추측하지 않는다", async (field) => {
        const result: Record<string, unknown> = good(); delete result[field];
        await expect(commitManagedOrder(async () => result, ["a", "b"])).rejects.toThrow(UNKNOWN_ORDER_RESULT);
    });
});
