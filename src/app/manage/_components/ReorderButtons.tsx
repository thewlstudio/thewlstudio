"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true } | { ok: false; error: string };

/** 목록 줄의 위/아래 순서 이동 버튼. 실제 이동은 영역별 서버 액션(move)이 한다. */
export default function ReorderButtons({
    documentId,
    disableUp,
    disableDown,
    move,
}: {
    documentId: string;
    disableUp: boolean;
    disableDown: boolean;
    move: (documentId: string, direction: "up" | "down") => Promise<Result>;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const run = (direction: "up" | "down") => {
        startTransition(async () => {
            const result = await move(documentId, direction);
            if (result.ok) {
                setError(null);
                router.refresh();
            } else {
                setError(result.error);
            }
        });
    };

    const btn =
        "w-9 h-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
    return (
        <div className="flex flex-col shrink-0">
            <button type="button" disabled={disableUp || isPending} onClick={() => run("up")} aria-label="위로 이동" className={`${btn} rounded-t-lg`}>
                ▲
            </button>
            <button type="button" disabled={disableDown || isPending} onClick={() => run("down")} aria-label="아래로 이동" className={`${btn} rounded-b-lg`}>
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
