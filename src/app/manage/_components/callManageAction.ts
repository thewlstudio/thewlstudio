import { unstable_rethrow } from "next/navigation";

export type ActionFailure = { ok: false; error: string; committed?: true };
export const UNKNOWN_ACTION_RESULT = "통신 상태 때문에 처리 결과를 확인하지 못했어요. 새 탭에서 목록을 확인한 뒤 다시 시도해 주세요.";

/** 전송 실패도 화면에 남는 결과로 돌리되, 생성 후 redirect 같은 Next 제어 신호는 통과시킨다. */
export async function callManageAction<T extends { ok: boolean }>(request: () => Promise<T>, validSuccess?: (value: T) => boolean): Promise<T | ActionFailure> {
    try {
        const result = await request();
        if (!result || typeof result !== "object" || Array.isArray(result) || !Object.hasOwn(result, "ok") || typeof result.ok !== "boolean") return { ok: false, error: UNKNOWN_ACTION_RESULT };
        if ("committed" in result && (!Object.hasOwn(result, "committed") || result.ok || result.committed !== true)) return { ok: false, error: UNKNOWN_ACTION_RESULT };
        if (result.ok) return !validSuccess || validSuccess(result) ? result : { ok: false, error: UNKNOWN_ACTION_RESULT };
        const failure = result as T & { error?: unknown; fields?: unknown };
        if (typeof failure.error !== "string" || !failure.error.trim() || failure.fields !== undefined && (!Array.isArray(failure.fields) || Array.from(failure.fields).some((field) => !field || typeof field !== "object" || typeof field.id !== "string" || !field.id.trim() || typeof field.label !== "string" || !field.label.trim()))) return { ok: false, error: UNKNOWN_ACTION_RESULT };
        return result;
    } catch (error) {
        unstable_rethrow(error);
        // 서버에서 이미 저장했을 수도 있으므로 실패로 단정하거나 자동 재시도하지 않는다.
        return { ok: false, error: UNKNOWN_ACTION_RESULT };
    }
}
