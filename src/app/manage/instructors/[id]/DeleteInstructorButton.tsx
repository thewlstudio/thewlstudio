"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInstructor } from "../actions";

export default function DeleteInstructorButton({
    documentId,
    instructorName,
}: {
    documentId: string;
    instructorName: string;
}) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-sm font-semibold text-red-600 hover:text-red-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm"
            >
                이 강사 삭제하기
            </button>
        );
    }

    return (
        <div role="alertdialog" aria-label="삭제 확인" className="rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700 mb-3 break-keep">
                정말 &quot;{instructorName || "이 강사"}&quot;을(를) 삭제할까요? 되돌릴 수 없습니다.
            </p>

            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 mb-3">
                    {error}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={isPending}
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
                    disabled={isPending}
                    onClick={() => {
                        startTransition(async () => {
                            const result = await deleteInstructor(documentId);
                            if (result.ok) {
                                router.push("/manage/instructors");
                            } else {
                                setError(result.error);
                            }
                        });
                    }}
                    className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    {isPending ? "삭제하는 중…" : "예, 삭제합니다"}
                </button>
            </div>
        </div>
    );
}
