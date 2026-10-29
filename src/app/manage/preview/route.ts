import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import { previewTarget } from "@/lib/preview-path";

/**
 * 로그인한 관리자만 홈페이지 미리보기(비공개 항목 포함)를 켠다.
 * 쿠키(__prerender_bypass)는 이 브라우저에서만 유효하고, 켜진 요청은 공개 캐시를 쓰지 않는다.
 */
export async function GET(request: Request) {
    if (!(await isAuthenticated())) redirect("/manage/login");
    (await draftMode()).enable();
    redirect(previewTarget(new URL(request.url).searchParams.get("to")));
}
