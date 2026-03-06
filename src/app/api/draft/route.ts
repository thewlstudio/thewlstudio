import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    draftMode().enable()

    // Extract custom 'slug' or 'route' from the query parameters if using Presentation tool
    const { searchParams } = new URL(request.url)
    const redirectPath = searchParams.get('slug') || '/'

    redirect(redirectPath)
}
