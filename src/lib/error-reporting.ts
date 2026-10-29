import "server-only";

/**
 * 서버 오류 보고. 항상 콘솔(Vercel 로그)에 남기고, SENTRY_DSN이 있으면 Sentry에도 보낸다.
 * DSN이 없으면 Sentry 코드를 아예 불러오지 않는다(휴면).
 */

/** 운영자에게 이미 안내 문구로 돌려준 "예상된 오류"는 보내지 않는다(잡음 방지). */
export function shouldReport(error: unknown): boolean {
    const status = error && typeof error === "object" && "statusCode" in error ? (error as { statusCode?: unknown }).statusCode : undefined;
    if (status === 409) return false; // 동시 수정 충돌 — 안내 문구로 처리됨
    // 이 앱이 직접 던지는 한글 안내 문구(검증·용량 등)는 사용자 실수이므로 제외. Sanity/네트워크 오류는 상태 코드·영문 메시지로 구분된다.
    if (error instanceof Error && status === undefined && /[가-힣]/.test(error.message)) return false;
    return true;
}

export function reportError(scope: string, error: unknown): void {
    console.error(`[${scope}]`, error);
    if (!process.env.SENTRY_DSN || !shouldReport(error)) return;
    // 보고 실패가 원래 요청을 깨뜨리면 안 되므로 기다리지 않고, 실패는 삼킨다.
    void import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error, { tags: { scope } }))
        .catch(() => {});
}
