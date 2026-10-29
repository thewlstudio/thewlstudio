const INTERNAL_ORIGIN = "https://internal.invalid";

/** 미리보기 복귀 주소는 URL 정규화 이후에도 내부 절대 경로여야 한다. */
export function sanitizeRedirectPath(path: string | null): string {
    if (!path?.startsWith("/") || path.startsWith("//")) return "/";
    // 브라우저는 역슬래시를 슬래시로, 탭·개행은 없는 문자로 해석할 수 있다.
    if (/[\\\u0000-\u001f\u007f]/.test(path)) return "/";
    try {
        const url = new URL(path, INTERNAL_ORIGIN);
        if (url.origin !== INTERNAL_ORIGIN || url.pathname.startsWith("//")) return "/";
        return url.pathname + url.search + url.hash;
    } catch {
        return "/";
    }
}
