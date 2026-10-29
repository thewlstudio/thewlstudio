"use client";

import { useState, useEffect, useRef } from "react";
import { useManageMutation } from "../../_components/useManageMutation";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";
import { useRouter } from "next/navigation";
import { flashToast } from "../../_components/Toast";
import { eulReul } from "@/lib/josa";
import { callManageAction } from "../../_components/callManageAction";
import { deleteCrew } from "../actions";

export default function DeleteCrewButton({
    documentId,
    memberName,
}: {
    documentId: string;
    memberName: string;
}) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isPending, isBusy, startTransition, run } = useManageMutation();
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const openButtonRef = useRef<HTMLButtonElement>(null);
    const requestInFlight = useRef(false);
    const wasConfirming = useRef(false);
    useEffect(() => {
        if (!isPending) requestInFlight.current = false;
    }, [isPending]);

    // 확인창이 뜨면 "안전한" 선택지(취소)로 포커스를 옮기고,
    // Escape로 바로 닫을 수 있게 한다. 닫히면 원래 열었던 버튼으로 되돌린다.
    useEffect(() => {
        if (!confirming) {
            if (wasConfirming.current) openButtonRef.current?.focus();
            wasConfirming.current = false;
            return;
        }
        wasConfirming.current = true;
        cancelButtonRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !requestInFlight.current) {
                setConfirming(false);
                setError(null);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [confirming]);

    if (!confirming) {
        return (
            <button
                data-tour="form-danger"
                ref={openButtonRef}
                type="button"
                disabled={isBusy}
                onClick={() => { if (!isManageMutationPending()) setConfirming(true); }}
                className="py-2 text-sm font-semibold text-red-600 hover:text-red-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm"
            >
                이 크루 삭제하기
            </button>
        );
    }

    return (
        <div role="alertdialog" aria-label="삭제 확인" className="rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700 mb-3 break-keep">
                &quot;{memberName || "이 크루"}&quot;{eulReul(memberName || "이 크루")} 휴지통으로 옮길까요? 사이트와 목록에서 바로 사라지지만,
                나중에 휴지통에서 복원할 수 있어요.
            </p>

            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 mb-3">
                    {error}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    ref={cancelButtonRef}
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                        setConfirming(false);
                        setError(null);
                    }}
                    className="h-10 px-4 rounded-lg border border-neutral-300 bg-white text-sm font-bold hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                    취소
                </button>
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                        if (requestInFlight.current) return;
                        run(async (isCurrent) => {
                            requestInFlight.current = true;
                            setError(null);
                            const result = await callManageAction(() => deleteCrew(documentId));
                            if (!isCurrent()) return;
                            if (result.ok) {
                                flashToast({ message: `"${memberName || "이 크루"}"${eulReul(memberName || "이 크루")} 휴지통으로 옮겼어요.`, undo: { area: "crew", id: documentId } });
                                startTransition(() => router.push("/manage/crew"));
                            } else {
                                setError(result.error);
                            }
                        });
                    }}
                    className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    {isPending ? "이동하는 중…" : "휴지통으로 이동"}
                </button>
            </div>
        </div>
    );
}
