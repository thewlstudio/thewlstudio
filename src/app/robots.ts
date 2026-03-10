import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewlstudio.com";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/admin/"], // API 엔드포인트와 Sanity Studio CMS 크롤링 차단
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
