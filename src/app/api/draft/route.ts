import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

function sanitizeRedirectPath(path: string | null): string {
    if (!path) return '/'
    // 내부 경로만 허용: 반드시 /로 시작하고 //는 불허 (protocol-relative URL 차단)
    if (!path.startsWith('/') || path.startsWith('//')) return '/'
    return path
}

// TODO: SANITY_API_READ_TOKEN을 사용해 실제 Draft Preview를 활성화할 때
// 이 임시 호환 로직을 next-sanity의 defineEnableDraftMode로 교체한다.
// 현재는 draft 콘텐츠를 읽지 않으므로 기존 Presentation 화면 유지를 위해
// 별도 시크릿 검증을 강제하지 않는다.
export async function GET(request: Request) {
    (await draftMode()).enable()

    const { searchParams } = new URL(request.url)
    const redirectPath = sanitizeRedirectPath(searchParams.get('slug'))

    redirect(redirectPath)
}
