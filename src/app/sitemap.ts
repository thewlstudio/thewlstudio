import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { crewSitemapQuery, workSitemapQuery } from "@/sanity/lib/queries";
import { publicDetailPath } from "@/lib/public-routes";

export const revalidate = 86400; // Revalidate sitemap daily (24h)

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app").replace(/\/+$/, "");

type SanitySlugEntry = { slug: string; _updatedAt: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 한 영역의 조회 실패가 다른 영역의 정상 URL까지 없애지 않도록 따로 정착시킨다.
    const results = await Promise.allSettled([
        client.fetch<SanitySlugEntry[]>(workSitemapQuery),
        client.fetch<SanitySlugEntry[]>(crewSitemapQuery),
    ]);
    const dynamicUrls: MetadataRoute.Sitemap = [];
    results.forEach((result, index) => {
        const area = index === 0 ? "works" : "crew";
        if (result.status === "rejected") {
            console.error(`[sitemap] ${area} fetch failed:`, result.reason);
            return;
        }
        const seen = new Set<string>();
        for (const row of result.value) {
            const path = publicDetailPath(area, row.slug);
            if (!path || seen.has(path)) continue;
            seen.add(path);
            const date = typeof row._updatedAt === "string" ? new Date(row._updatedAt) : null;
            dynamicUrls.push({
                url: `${BASE_URL}${path}`,
                ...(date && Number.isFinite(date.getTime()) ? { lastModified: date } : {}),
                changeFrequency: area === "works" ? "weekly" : "monthly",
                priority: area === "works" ? 0.8 : 0.7,
            });
        }
    });

    const staticUrls: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${BASE_URL}/works`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/crew`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/class`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/studio`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.7,
        },
    ];

    return [...staticUrls, ...dynamicUrls];
}
