// Sanity Studio의 Presentation 미리보기가 쓰던 진입점이다.
// 예전에는 인증 없이 미리보기 모드를 켰다. 이제 홈페이지 미리보기는 로그인한 관리자만 /manage/preview로 켠다.
// SANITY_API_READ_TOKEN을 발급해 Studio 미리보기를 다시 쓸 때는 next-sanity의 defineEnableDraftMode(시크릿 검증)로 교체한다.
// 그 전까지 이 경로는 아무것도 켜지 않는다.
export async function GET() {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } })
}
