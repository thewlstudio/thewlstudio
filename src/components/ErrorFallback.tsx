"use client";

import { useEffect } from "react";
import Link from "next/link";
import PublicRecoveryTitle from "./PublicRecoveryTitle";

export default function ErrorFallback({
    error,
    retry,
    title = "문제가 발생했습니다",
    message = "데이터를 가져오는 중 문제가 발생했습니다.",
    dark = false,
    logLabel = "Error",
}: {
    error: unknown;
    retry: () => void;
    title?: string;
    message?: string;
    dark?: boolean;
    logLabel?: string;
}) {
    useEffect(() => {
        console.error(`[${logLabel}]`, error);
    }, [error, logLabel]);

    return (
        <main id="main-content" className={`min-h-screen flex flex-col items-center justify-center ${dark ? "bg-black text-white" : "bg-[#fafafa] text-black"} px-6`}>
            <PublicRecoveryTitle focusOnMount className="text-3xl font-black tracking-tight mb-4">{title}</PublicRecoveryTitle>
            <p className="text-neutral-500 mb-8 text-center max-w-md">{message}</p>
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={retry}
                    className={`px-6 py-3 font-semibold rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${dark ? "bg-white text-black hover:bg-neutral-200 focus-visible:outline-white" : "bg-black text-white hover:bg-neutral-800 focus-visible:outline-black"}`}
                >
                    다시 시도
                </button>
                <Link
                    href="/"
                    className={`px-6 py-3 border font-semibold rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${dark ? "border-white text-white hover:bg-white hover:text-black focus-visible:outline-white" : "border-black text-black hover:bg-black hover:text-white focus-visible:outline-black"}`}
                >
                    홈으로
                </Link>
            </div>
        </main>
    );
}
