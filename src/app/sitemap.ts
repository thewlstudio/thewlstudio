import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

export const revalidate = 86400; // Revalidate sitemap daily (24h)

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app";

type SanitySlugEntry = { slug: string; _updatedAt: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch dynamic routes from Sanity — gracefully fall back to empty arrays
    let works: SanitySlugEntry[] = [];
    let crew: SanitySlugEntry[] = [];

    try {
        [works, crew] = await Promise.all([
            client.fetch<SanitySlugEntry[]>(
                `*[_type == "work" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`
            ),
            client.fetch<SanitySlugEntry[]>(
                `*[_type == "crew" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`
            ),
        ]);
    } catch (err) {
        console.error("[sitemap] Sanity fetch failed:", err);
    }

    const worksUrls: MetadataRoute.Sitemap = works.map((w) => ({
        url: `${BASE_URL}/works/${w.slug}`,
        lastModified: new Date(w._updatedAt),
        changeFrequency: "weekly",
        priority: 0.8,
    }));

    const crewUrls: MetadataRoute.Sitemap = crew.map((c) => ({
        url: `${BASE_URL}/crew/${c.slug}`,
        lastModified: new Date(c._updatedAt),
        changeFrequency: "monthly",
        priority: 0.7,
    }));

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

    return [...staticUrls, ...worksUrls, ...crewUrls];
}
