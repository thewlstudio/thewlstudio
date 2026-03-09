"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
            <h1 className="text-4xl font-black tracking-tight mb-4">
                문제가 발생했습니다
            </h1>
            <p className="text-neutral-400 mb-8 text-center max-w-md">
                일시적인 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
            </p>
            <button
                onClick={reset}
                className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
            >
                다시 시도
            </button>
        </div>
    );
}
