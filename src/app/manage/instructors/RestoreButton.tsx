"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreInstructor } from "./actions";

export default function RestoreButton({ documentId }: { documentId: string }) {
    const router = useRouter();
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
                        const result = await restoreInstructor(documentId);
                        if (result.ok) {
                            setError(null);
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
