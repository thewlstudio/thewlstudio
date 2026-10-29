"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreRevision } from "./actions";
import { flashToast } from "../_components/Toast";
import { useManageMutation } from "../_components/useManageMutation";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";

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
                        try {
                            const result = await restoreRevision(area, documentId, time, expectedRevision);
                            if (!isCurrent()) return;
                            if (result.ok) {
                                flashToast({ message: "이전 상태로 되돌렸어요. 되돌리기 직전 상태도 이력에 남아 있어요." });
                                startTransition(() => router.push(backHref));
                            } else {
                                setError(result.error);
                            }
                        } catch {
                            if (!isCurrent()) return;
                            setError("통신 상태 때문에 복원 결과를 확인하지 못했어요. 화면을 새로고침해 확인해 주세요.");
                        }
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
