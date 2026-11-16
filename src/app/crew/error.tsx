"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function CrewError({
    error,
    retry,
}: {
    error: unknown;
    retry: () => void;
}) {
    return (
        <ErrorFallback
            error={error}
            retry={retry}
            title="크루 정보를 불러올 수 없습니다"
            logLabel="CrewError"
        />
    );
}
