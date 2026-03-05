import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://whitelightstudio.vercel.app'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/studio/'], // Prevent crawling internal API endpoints and the Sanity Studio
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
