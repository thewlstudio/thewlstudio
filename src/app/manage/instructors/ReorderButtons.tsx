"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveInstructorOrder } from "./actions";

export default function ReorderButtons({
    documentId,
    disableUp,
    disableDown,
}: {
    documentId: string;
    disableUp: boolean;
    disableDown: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const move = (direction: "up" | "down") => {
        startTransition(async () => {
            const result = await moveInstructorOrder(documentId, direction);
            if (result.ok) {
                setError(null);
                router.refresh();
            } else {
                setError(result.error);
            }
        });
    };

    return (
        <div className="flex flex-col shrink-0">
            <button
                type="button"
                disabled={disableUp || isPending}
                onClick={() => move("up")}
                aria-label="위로 이동"
                className="w-9 h-8 flex items-center justify-center rounded-t-lg text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                ▲
            </button>
            <button
                type="button"
                disabled={disableDown || isPending}
                onClick={() => move("down")}
                aria-label="아래로 이동"
                className="w-9 h-8 flex items-center justify-center rounded-b-lg text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                ▼
            </button>
            {error && (
                <p role="alert" className="sr-only">
                    {error}
                </p>
            )}
        </div>
    );
}
