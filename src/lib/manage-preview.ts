import "server-only";
import { draftMode } from "next/headers";
import { isAuthenticated } from "./manage-auth";

/** 미리보기 쿠키는 표시 모드일 뿐, 관리자 세션을 대신하는 권한이 아니다. */
export async function isManagedPreview(): Promise<boolean> {
    // 일반 공개 요청에서 인증 쿠키를 읽으면 공개 페이지의 ISR까지 동적으로 바뀐다.
    if (!(await draftMode()).isEnabled) return false;
    return isAuthenticated();
}
