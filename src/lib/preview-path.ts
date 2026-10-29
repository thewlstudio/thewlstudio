import { sanitizeRedirectPath } from "./internal-redirect";

/** 미리보기로 열 수 있는 곳은 홈페이지 화면뿐이다. 관리·API·Sanity 편집기 경로는 홈으로 돌린다. */
export function previewTarget(raw: string | null): string {
    const path = sanitizeRedirectPath(raw);
    return /^\/(manage|api|admin)(\/|\?|#|$)/.test(path) ? "/" : path;
}

/** 관리 화면의 "홈페이지에서 미리보기" 링크 주소. 로그인한 관리자만 통과한다. */
export function previewHref(path: string): string {
    return `/manage/preview?to=${encodeURIComponent(path)}`;
}

/** 미리보기를 끄고 돌아갈 곳(관리 화면). */
export const PREVIEW_EXIT_HREF = `/api/disable-draft?slug=${encodeURIComponent("/manage")}`;
