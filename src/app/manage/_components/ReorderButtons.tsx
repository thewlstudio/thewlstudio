"use client";

import { useContext, useState } from "react";
import { ListReorderContext, useReorderMutation } from "./useReorderMutation";
import { useToast } from "./Toast";

type Result = { ok: true } | { ok: false; error: string };

/** 목록 줄의 위/아래 순서 이동 버튼. 실제 이동은 영역별 서버 액션(move)이 한다. */
export default function ReorderButtons({
    documentId,
    label,
    disableUp,
    disableDown,
    move,
}: {
    documentId: string;
    /** 스크린 리더용 항목 이름. 버튼이 여러 줄에 반복되므로 "백광흠 위로 이동"처럼 읽히게 한다. */
    label?: string;
    disableUp: boolean;
    disableDown: boolean;
    move: (documentId: string, direction: "up" | "down") => Promise<Result>;
}) {
    const sharedMutation = useContext(ListReorderContext);
    const ownMutation = useReorderMutation();
    const { isPending, run: saveOrder } = sharedMutation ?? ownMutation;
    const toast = useToast();
    const [error, setError] = useState<string | null>(null);

    const run = (direction: "up" | "down") => {
        saveOrder(() => move(documentId, direction), {
            onStart: () => setError(null),
            onError: (message) => {
                setError(message);
                toast.show({ message, tone: "info" });
            },
        });
    };

    const btn =
        "w-9 h-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
    return (
        <div data-tour="list-reorder" className="flex flex-col shrink-0">
            <button type="button" disabled={disableUp || isPending} onClick={() => run("up")} aria-label={label ? `${label} 위로 이동` : "위로 이동"} className={`${btn} rounded-t-lg`}>
                ▲
            </button>
            <button type="button" disabled={disableDown || isPending} onClick={() => run("down")} aria-label={label ? `${label} 아래로 이동` : "아래로 이동"} className={`${btn} rounded-b-lg`}>
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
