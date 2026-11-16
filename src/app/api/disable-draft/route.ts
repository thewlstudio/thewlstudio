import { draftMode } from 'next/headers'
import { sanitizeRedirectPath } from '@/lib/internal-redirect'

export async function GET(request: Request) {
    (await draftMode()).disable()

    const { searchParams } = new URL(request.url)
    const redirectPath = sanitizeRedirectPath(searchParams.get('slug'))

    return new Response(null, {
        status: 307,
        headers: { Location: redirectPath, 'Cache-Control': 'private, no-store' },
    })
}
