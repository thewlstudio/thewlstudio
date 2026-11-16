import "server-only";

type Raw = Record<string, unknown>;
export class ManagedPatchResultError extends Error {}
export const UNKNOWN_PATCH_RESULT = "변경 요청의 결과를 확인하지 못했어요. 이미 반영됐을 수 있으니 새 탭에서 현재 내용을 확인한 뒤 다시 시도해 주세요.";
export const PATCH_REFRESH_FAILED = "변경은 완료됐지만 화면을 갱신하지 못했어요. 같은 작업을 반복하지 말고 새 탭에서 현재 내용을 확인해 주세요.";
export class ManagedRefreshError extends ManagedPatchResultError {
    constructor() { super(PATCH_REFRESH_FAILED); }
}

/** 저장이 확인된 뒤의 갱신 실패를 저장 실패와 구분한다. */
export function refreshManagedChange(refresh?: () => void): void {
    try { refresh?.(); } catch { throw new ManagedRefreshError(); }
}

/** 단일 ID 패치의 기본 문서 응답을 확인한다. 재시도·재조회·추가 쓰기는 하지 않는다. */
export async function commitManagedPatch(request: () => Promise<unknown>, id: string, type: string, refresh?: () => void, matches?: (document: Raw) => boolean): Promise<void> {
    let result: unknown;
    try { result = await request(); }
    catch (error) {
        if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) throw Object.assign(new Error("문서 변경 충돌"), { statusCode: 409 });
        throw new ManagedPatchResultError(UNKNOWN_PATCH_RESULT);
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new ManagedPatchResultError(UNKNOWN_PATCH_RESULT);
    const row = result as Raw;
    if (!["_id", "_type", "_rev"].every((key) => Object.hasOwn(row, key)) || row._id !== id || row._type !== type || typeof row._rev !== "string" || !row._rev.trim() || matches && !matches(row)) throw new ManagedPatchResultError(UNKNOWN_PATCH_RESULT);
    refreshManagedChange(refresh);
}
