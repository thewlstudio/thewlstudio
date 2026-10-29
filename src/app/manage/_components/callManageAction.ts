import { unstable_rethrow } from "next/navigation";

export type ActionFailure = { ok: false; error: string };
export const UNKNOWN_ACTION_RESULT = "통신 상태 때문에 처리 결과를 확인하지 못했어요. 새 탭에서 목록을 확인한 뒤 다시 시도해 주세요.";

/** 전송 실패도 화면에 남는 결과로 돌리되, 생성 후 redirect 같은 Next 제어 신호는 통과시킨다. */
export async function callManageAction<T extends { ok: boolean }>(request: () => Promise<T>): Promise<T | ActionFailure> {
    try {
        return await request();
    } catch (error) {
        unstable_rethrow(error);
        // 서버에서 이미 저장했을 수도 있으므로 실패로 단정하거나 자동 재시도하지 않는다.
        return { ok: false, error: UNKNOWN_ACTION_RESULT };
    }
}
