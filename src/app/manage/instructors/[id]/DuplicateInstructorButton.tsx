"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateInstructor } from "../actions";

export default function DuplicateInstructorButton({ documentId }: { documentId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div>
            <button
                type="button"
                disabled={isPending}
                onClick={() => {
                    startTransition(async () => {
                        const result = await duplicateInstructor(documentId);
                        if (result.ok) {
                            setError(null);
                            router.push(`/manage/instructors/${result.newId}`);
                        } else {
                            setError(result.error);
                        }
                    });
                }}
                className="text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
            >
                {isPending ? "복제하는 중…" : "복제해서 새로 만들기"}
            </button>
            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}
