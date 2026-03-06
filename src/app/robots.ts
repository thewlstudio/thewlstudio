import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewlstudio.com";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/studio/"], // Prevent crawling internal API endpoints and the Sanity Studio
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
