"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function WorksError({
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
            title="작업물을 불러올 수 없습니다"
            logLabel="WorksError"
        />
    );
}
