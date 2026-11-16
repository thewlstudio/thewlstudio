import "server-only";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
export class ManagedOrderResultError extends Error {}
export const UNKNOWN_ORDER_RESULT = "순서 변경 요청의 결과를 확인하지 못했어요. 이미 반영됐을 수 있으니 목록을 새로고침해 확인한 뒤 다시 시도해 주세요.";
const unknownResult = () => new ManagedOrderResultError(UNKNOWN_ORDER_RESULT);

/** 기본 트랜잭션 응답을 실제 요청한 문서 집합과 대조한다. 자동 재시도·롤백하지 않는다. */
export async function commitManagedOrder(request: () => Promise<unknown>, expected: readonly string[]): Promise<void> {
    let result: unknown;
    try { result = await request(); }
    catch (error) {
        if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) throw Object.assign(new Error("순서 변경 충돌"), { statusCode: 409 });
        throw unknownResult();
    }
    if (!object(result) || !["transactionId", "documentIds", "results"].every((key) => Object.hasOwn(result, key)) || typeof result.transactionId !== "string" || !result.transactionId.trim() || !Array.isArray(result.documentIds) || !Array.isArray(result.results)) throw unknownResult();
    const ids = Array.from(result.documentIds);
    if (ids.length !== expected.length || new Set(ids).size !== expected.length || ids.some((id) => typeof id !== "string" || !expected.includes(id)) || result.results.length !== ids.length) throw unknownResult();
    for (const [index, row] of Array.from(result.results).entries()) {
        if (!object(row) || !Object.hasOwn(row, "id") || !Object.hasOwn(row, "operation") || row.id !== ids[index] || row.operation !== "update" && row.operation !== "none") throw unknownResult();
    }
}

export function refreshManagedOrder(refresh: (() => void) | undefined, changed: boolean): void {
    try { refresh?.(); }
    catch {
        throw new ManagedOrderResultError(changed
            ? "순서 변경은 완료됐지만 화면을 갱신하지 못했어요. 같은 이동을 반복하지 말고 목록을 새로고침해 확인해 주세요."
            : "순서는 변경하지 않았지만 목록을 갱신하지 못했어요. 새로고침해 확인해 주세요.");
    }
}
