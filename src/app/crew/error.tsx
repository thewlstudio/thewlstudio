"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function CrewError({
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
            title="크루 정보를 불러올 수 없습니다"
            logLabel="CrewError"
        />
    );
}
