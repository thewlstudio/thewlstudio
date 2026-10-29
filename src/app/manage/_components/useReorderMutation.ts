"use client";

import { createContext } from "react";
import { useRouter } from "next/navigation";
import { useManageMutation } from "./useManageMutation";

type Result = { ok: true } | { ok: false; error: string };
type Callbacks = { onStart?: () => void; onSuccess?: () => void; onError: (message: string) => void };

/** 한 목록의 드래그·모든 행의 화살표가 같은 저장 잠금을 사용한다. */
export function useReorderMutation() {
    const router = useRouter();
    const mutation = useManageMutation();

    const run = (save: () => Promise<Result>, callbacks: Callbacks) => {
        mutation.run(async (isCurrent) => {
            try {
                const result = await save();
                if (!isCurrent()) return;
                if (!result.ok) {
                    callbacks.onError(result.error);
                    return;
                }
                callbacks.onSuccess?.();
                // 비동기 저장 뒤의 새로고침도 잠금이 유지되는 전환에 포함한다.
                mutation.startTransition(() => router.refresh());
            } catch {
                if (!isCurrent()) return;
                // 요청이 서버에 도달했을 가능성도 있으므로 성공/실패를 단정하지 않는다.
                callbacks.onError("통신 상태 때문에 저장 결과를 확인하지 못했어요. 목록을 새로고침해 확인한 뒤 다시 시도해 주세요.");
            }
        }, callbacks.onStart);
    };

    return { isPending: mutation.isBusy, run };
}

export const ListReorderContext = createContext<ReturnType<typeof useReorderMutation> | null>(null);
