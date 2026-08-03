import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { timingSafeEqual } from 'crypto'

function sanitizeRedirectPath(path: string | null): string {
    if (!path) return '/'
    // 내부 경로만 허용: 반드시 /로 시작하고 //는 불허 (protocol-relative URL 차단)
    if (!path.startsWith('/') || path.startsWith('//')) return '/'
    return path
}

function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    // 시크릿이 설정돼 있으면 반드시 일치해야 draft 모드를 켤 수 있다.
    // 인증 없이 이 URL만 알면 누구나 미공개 콘텐츠를 볼 수 있게 되는 것을 막는다.
    // (Next.js 공식 권장 패턴)
    const secret = process.env.DRAFT_MODE_SECRET
    if (secret) {
        const provided = searchParams.get('secret')
        if (!provided || !safeEqual(provided, secret)) {
            return new Response('잘못된 접근입니다.', { status: 401 })
        }
    }

    (await draftMode()).enable()

    const redirectPath = sanitizeRedirectPath(searchParams.get('slug'))

    redirect(redirectPath)
}
