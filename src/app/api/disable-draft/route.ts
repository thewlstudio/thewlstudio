import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { sanitizeRedirectPath } from '@/lib/internal-redirect'

export async function GET(request: Request) {
    (await draftMode()).disable()

    const { searchParams } = new URL(request.url)
    const redirectPath = sanitizeRedirectPath(searchParams.get('slug'))

    redirect(redirectPath)
}
