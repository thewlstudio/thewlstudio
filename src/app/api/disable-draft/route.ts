import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

function sanitizeRedirectPath(path: string | null): string {
    if (!path) return '/'
    // 내부 경로만 허용: 반드시 /로 시작하고 //는 불허 (protocol-relative URL 차단)
    if (!path.startsWith('/') || path.startsWith('//')) return '/'
    return path
}

export async function GET(request: Request) {
    (await draftMode()).disable()

    const { searchParams } = new URL(request.url)
    const redirectPath = sanitizeRedirectPath(searchParams.get('slug'))

    redirect(redirectPath)
}
