"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checklist } from "./checklist/storage";
import { callManageAction } from "./callManageAction";
import { formPayloadError } from "./formPayload";
import { useManageMutationLease } from "./useManageMutation";

type SaveResult = { ok: true } | { ok: false; error: string; fields?: { id: string; label: string }[] };
type SaveAction = (previous: SaveResult | null, data: FormData) => Promise<SaveResult>;

/**
 * 결과는 바깥 래퍼에 보관하고, 저장된 문서의 revision이 바뀌면 안쪽 편집기만 재생성한다.
 * 서버가 발급한 배열 키·이미지 참조까지 반영해야 파일 없이 다시 저장해도 사진이 유지된다.
 */
export function useManagedFormAction(action: SaveAction, revision: string = "") {
    const [result, dispatch, actionPending] = useActionState<SaveResult | null, FormData>(async (previous, data) => {
        try {
            const error = formPayloadError(data);
            if (error) return { ok: false, error };
            const next = await callManageAction(() => action(previous, data));
            if (next.ok && lease.isCurrent()) {
                checklist.markSave(window.location.pathname);
                // 요청 종료 전에 새로고침을 시작해 그 사이에 잠금이 풀리지 않게 한다.
                startRefresh(() => router.refresh());
            }
            return next;
        } finally { lease.settle(); }
    }, null);
    const [refreshPending, startRefresh] = useTransition();
    const router = useRouter();
    const [discardCount, setDiscardCount] = useState(0);
    const [dismissedResult, setDismissedResult] = useState<SaveResult | null>(null);
    const lease = useManageMutationLease(actionPending || refreshPending);

    return {
        state: result === dismissedResult ? null : result,
        formAction: (data: FormData) => {
            if (lease.acquire()) dispatch(data);
        },
        isPending: actionPending || refreshPending || lease.isBusy,
        formKey: `${revision}:${discardCount}`,
        onDiscard: () => {
            setDismissedResult(result);
            setDiscardCount((n) => n + 1);
        },
    };
}

export type ManagedFormSession = ReturnType<typeof useManagedFormAction>;
