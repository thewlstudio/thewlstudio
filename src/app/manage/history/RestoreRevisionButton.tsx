"use client";

import { useState } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { restoreRevision } from "./actions";
import { flashToast } from "../_components/Toast";
import { useManageMutation } from "../_components/useManageMutation";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";
import { callManageAction, UNKNOWN_ACTION_RESULT } from "../_components/callManageAction";

const UNKNOWN_RESTORE_RESULT = "통신 상태 때문에 복원 결과를 확인하지 못했어요. 화면을 새로고침해 확인해 주세요.";
const CONFIRMED_MOVE_ERROR = "복원은 완료됐지만 화면을 이동하지 못했어요. 같은 복원을 반복하지 말고 새 탭에서 현재 내용을 확인해 주세요.";

export default function RestoreRevisionButton({ area, documentId, time, expectedRevision, backHref }: { area: string; documentId: string; time: string; expectedRevision: string; backHref: string }) {
    const router = useRouter();
    const { isPending, isBusy, startTransition, run } = useManageMutation();
    const [error, setError] = useState<string | null>(null);

    return (
        <div>
            <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                    if (isBusy || isManageMutationPending()) return;
                    if (!window.confirm("이 시점의 내용으로 되돌릴까요? 홈페이지에 바로 반영돼요. 지금 상태도 이력에 남아서 다시 되돌릴 수 있어요.")) return;
                    run(async (isCurrent) => {
                        setError(null);
                        const result = await callManageAction(() => restoreRevision(area, documentId, time, expectedRevision));
                        if (!isCurrent()) return;
                        if (!result.ok) {
                            setError(result.error === UNKNOWN_ACTION_RESULT ? UNKNOWN_RESTORE_RESULT : result.error);
                            return;
                        }
                        startTransition(() => {
                            // 전환 콜백의 오류는 바깥 비동기 작업의 catch로 전달되지 않을 수 있다.
                            try { router.push(backHref); }
                            catch (error) {
                                unstable_rethrow(error);
                                if (isCurrent()) setError(CONFIRMED_MOVE_ERROR);
                                return;
                            }
                            flashToast({ message: "이전 상태로 되돌렸어요. 되돌리기 직전 상태도 이력에 남아 있어요." });
                        });
                    });
                }}
                className="h-12 px-6 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                {isPending ? "되돌리는 중…" : "이 시점으로 되돌리기"}
            </button>
            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 mt-2">
                    {error}
                </p>
            )}
        </div>
    );
}
