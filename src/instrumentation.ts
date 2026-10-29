import type { Instrumentation } from "next";
import { scrubEvent } from "./lib/sentry-scrub";

/**
 * 서버 오류 감시(Sentry). SENTRY_DSN 환경변수가 있을 때만 켜지고, 없으면 아무것도 하지 않는다.
 * - 오류만 보낸다(성능 추적·세션 기록 없음), 개인정보 전송 끔, 전송 직전에 쿠키·본문·쿼리를 지운다.
 * - 브라우저(클라이언트) 오류는 보내지 않는다(공개 페이지 용량에 영향이 없게).
 * 설정 방법: docs/INSTALL_GUIDE.md "오류 감시"
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
        tracesSampleRate: 0,
        // v11 기본값은 쿠키·헤더·요청 본문·쿼리·사용자 정보를 모두 수집하므로 전부 끈다(세션 쿠키·로그인 비밀번호 보호).
        dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
        beforeSend: (event) => scrubEvent(event),
    });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
    if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(error, request, context);
};
