"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function GlobalError({
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
            title="문제가 발생했습니다"
            message="일시적인 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요."
            dark
            logLabel="GlobalError"
        />
    );
}
