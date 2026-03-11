"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <ErrorFallback
            error={error}
            reset={reset}
            title="문제가 발생했습니다"
            message="일시적인 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요."
            bg="bg-black"
            textColor="text-white"
            logLabel="GlobalError"
        />
    );
}
