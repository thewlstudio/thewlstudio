"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CrewError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[CrewError]", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-black px-6">
            <h1 className="text-3xl font-black tracking-tight mb-4">
                크루 정보를 불러올 수 없습니다
            </h1>
            <p className="text-neutral-500 mb-8 text-center max-w-md">
                데이터를 가져오는 중 문제가 발생했습니다.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                >
                    다시 시도
                </button>
                <Link
                    href="/"
                    className="px-6 py-3 border border-black text-black font-semibold rounded-lg hover:bg-black hover:text-white transition-colors"
                >
                    홈으로
                </Link>
            </div>
        </div>
    );
}
