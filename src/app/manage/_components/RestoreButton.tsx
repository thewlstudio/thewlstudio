"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
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
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                disabled={isPending}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startTransition(async () => {
                        const result = await restore(documentId);
                        if (result.ok) {
                            setError(null);
                            toast.show({ message: "복원했어요. 목록에서 다시 볼 수 있어요." });
                            router.refresh();
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
