"use client";

import { useEffect, useRef, useState } from "react";
import { useManageMutation } from "./useManageMutation";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { callManageAction } from "./callManageAction";
type Result = { ok: true } | { ok: false; error: string };

export default function RestoreButton({
    documentId,
    restore,
}: {
    documentId: string;
    restore: (documentId: string) => Promise<Result>;
}) {
    const router = useRouter();
    const toast = useToast();
    const { isPending, isBusy, startTransition, run } = useManageMutation();
    const [error, setError] = useState<string | null>(null);
    const requestInFlight = useRef(false);
    useEffect(() => {
        if (!isPending) requestInFlight.current = false;
    }, [isPending]);

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (requestInFlight.current) return;
                    if (!confirmLeaveIfDirty("저장하지 않은 내용이 있어요. 복원 후 화면을 다시 불러오면 입력한 내용이 사라질 수 있어요. 그래도 복원할까요?")) return;
                    run(async (isCurrent) => {
                        requestInFlight.current = true;
                        setError(null);
                        const result = await callManageAction(() => restore(documentId));
                        if (!isCurrent()) return;
                        if (result.ok) {
                            setError(null);
                            toast.show({ message: "복원했어요. 목록에서 다시 볼 수 있어요." });
                            startTransition(() => router.refresh());
                        } else {
                            setError(result.error);
                        }
                    });
                }}
                className="h-9 px-4 rounded-lg border-2 border-black text-sm font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                {isPending ? "복원하는 중…" : "복원"}
            </button>
            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
