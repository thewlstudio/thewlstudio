import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.SANITY_PREVIEW_SECRET) {
        return new Response('Invalid token', { status: 401 })
    }

    (await draftMode()).enable()

    const redirectPath = searchParams.get('slug') || '/'
    redirect(redirectPath)
}
