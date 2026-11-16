"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { checklist } from "./checklist/storage";
import { callManageAction } from "./callManageAction";
import { formPayloadError } from "./formPayload";
import { useManageMutationLease } from "./useManageMutation";

type SaveResult = { ok: true } | { ok: false; error: string; fields?: { id: string; label: string }[]; committed?: true };
type SaveAction = (previous: SaveResult | null, data: FormData) => Promise<SaveResult>;
type RefreshFailure = { revision: string; state: { ok: false; error: string; committed: true } };
const SAVED_REFRESH_ERROR = "저장은 완료됐지만 최신 내용을 불러오지 못했어요. 입력을 따로 보관하고 새 탭에서 현재 내용을 확인해 주세요. 확인 전에는 재저장과 변경 버리기를 실행하지 않아요.";

/**
 * 결과는 바깥 래퍼에 보관하고, 저장된 문서의 revision이 바뀌면 안쪽 편집기만 재생성한다.
 * 서버가 발급한 배열 키·이미지 참조까지 반영해야 파일 없이 다시 저장해도 사진이 유지된다.
 */
export function useManagedFormAction(action: SaveAction, revision: string = "") {
    const [refreshFailure, setRefreshFailure] = useState<RefreshFailure | null>(null);
    const refreshFailureRef = useRef<RefreshFailure | null>(null);
    const rememberRefreshFailure = (error: string) => {
        const failure: RefreshFailure = { revision, state: { ok: false, error, committed: true } };
        refreshFailureRef.current = failure;
        setRefreshFailure(failure);
    };
    const [result, dispatch, actionPending] = useActionState<SaveResult | null, FormData>(async (previous, data) => {
        try {
            // 서버 키·사진 참조를 다시 받지 못한 상태에서 같은 입력을 재전송하지 않는다.
            const failure = refreshFailureRef.current;
            if (failure?.revision === revision) return failure.state;
            const error = formPayloadError(data);
            if (error) return { ok: false, error };
            const next = await callManageAction(() => action(previous, data));
            if (!lease.isCurrent()) return previous;
            if (!next.ok && next.committed === true) rememberRefreshFailure(next.error);
            if (next.ok) {
                try { checklist.markSave(window.location.pathname); }
                catch { /* 보조 체크 기록의 오류로 저장 결과·기준값 갱신을 깨뜨리지 않는다. */ }
                // 요청 종료 전에 새로고침을 시작해 그 사이에 잠금이 풀리지 않게 한다.
                startRefresh(() => {
                    try { router.refresh(); }
                    catch (error) {
                        unstable_rethrow(error);
                        if (lease.isCurrent()) rememberRefreshFailure(SAVED_REFRESH_ERROR);
                    }
                });
            }
            return next;
        } finally { lease.settle(); }
    }, null);
    const [refreshPending, startRefresh] = useTransition();
    const router = useRouter();
    const [discardCount, setDiscardCount] = useState(0);
    const [dismissedResult, setDismissedResult] = useState<SaveResult | null>(null);
    const lease = useManageMutationLease(actionPending || refreshPending);
    const oldCommittedNotice = refreshFailure !== null && refreshFailure.revision !== revision && result?.ok === false && result.committed === true;

    return {
        state: refreshFailure?.revision === revision ? refreshFailure.state : oldCommittedNotice || result === dismissedResult ? null : result,
        formAction: (data: FormData) => {
            if (lease.acquire()) dispatch(data);
        },
        isPending: actionPending || refreshPending || lease.isBusy,
        formKey: `${revision}:${discardCount}`,
        onDiscard: () => {
            if (refreshFailureRef.current?.revision === revision) {
                rememberRefreshFailure("최근 저장된 기준값을 확인하지 못해 변경을 버리지 않았어요. 입력을 따로 보관하고 새 탭에서 현재 내용을 확인해 주세요.");
                return;
            }
            setDismissedResult(result);
            setDiscardCount((n) => n + 1);
        },
    };
}

export type ManagedFormSession = ReturnType<typeof useManagedFormAction>;
