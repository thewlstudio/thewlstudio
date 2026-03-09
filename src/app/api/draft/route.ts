import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    (await draftMode()).enable()

    const { searchParams } = new URL(request.url)
    const redirectPath = searchParams.get('slug') || '/'

    redirect(redirectPath)
}
