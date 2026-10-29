/**
 * Sentry로 보내기 전에 비밀·개인정보를 지운다. (오류 이벤트에는 요청 정보가 붙을 수 있다)
 * 세션 쿠키, 인증 헤더, 요청 본문(로그인 비밀번호·작성 중인 내용), 쿼리 문자열을 제거한다.
 */
type Json = Record<string, unknown>;

const SENSITIVE_HEADERS = new Set(["cookie", "set-cookie", "authorization", "proxy-authorization", "x-api-key", "x-forwarded-for", "x-real-ip"]);

function scrubHeaders(headers: unknown): unknown {
    if (!headers || typeof headers !== "object") return headers;
    return Object.fromEntries(Object.entries(headers as Json).filter(([name]) => !SENSITIVE_HEADERS.has(name.toLowerCase())));
}

export function scrubEvent<T extends object>(event: T): T {
    const out = { ...event } as Json;
    const request = out.request;
    if (request && typeof request === "object") {
        const { cookies: _c, data: _d, query_string: _q, ...rest } = request as Json;
        void _c; void _d; void _q;
        out.request = { ...rest, headers: scrubHeaders(rest.headers) };
        const url = (out.request as Json).url;
        if (typeof url === "string") (out.request as Json).url = url.split("?")[0].split("#")[0];
    }
    if (out.user && typeof out.user === "object") {
        const { id } = out.user as Json;
        out.user = id ? { id } : undefined; // 이메일·IP 등 제거
    }
    return out as T;
}
