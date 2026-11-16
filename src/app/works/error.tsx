"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function WorksError({
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
            title="작업물을 불러올 수 없습니다"
            logLabel="WorksError"
        />
    );
}
