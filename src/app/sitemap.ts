import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'

export const revalidate = 60 * 60 * 24; // Revalidate sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://whitelightstudio.vercel.app'

    // Fetch Works
    const works = await client.fetch(`*[_type == "work" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`)

    // Fetch Crew
    const crew = await client.fetch(`*[_type == "crew" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`)

    const worksUrls = works.map((w: any) => ({
        url: `${baseUrl}/works/${w.slug}`,
        lastModified: new Date(w._updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    const crewUrls = crew.map((c: any) => ({
        url: `${baseUrl}/crew/${c.slug}`,
        lastModified: new Date(c._updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    const staticUrls = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/works`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/crew`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/class`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        }
    ]

    return [...staticUrls, ...worksUrls, ...crewUrls]
}
