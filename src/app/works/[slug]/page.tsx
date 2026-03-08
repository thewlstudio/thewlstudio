import { Metadata } from "next";
import { client, sanityFetch } from "@/sanity/lib/client";
import { workBySlugQuery, worksQuery } from "@/sanity/lib/queries";
import WorkDetailClient from "./WorkDetailClient";
import { notFound } from "next/navigation";
import type { WorkDetail, WorkSummary } from "@/types/sanity";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const decodedSlug = decodeURIComponent(params.slug);
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug: decodedSlug }, tags: ['work'] });

    if (!work) {
        return { title: "Work Not Found | WHITE LIGHT STUDIO" };
    }

    return {
        title: `${work.artist} - ${work.title} | WHITE LIGHT STUDIO`,
        description: `White Light Studio Portfolio: ${work.artist} - ${work.title}`,
        openGraph: {
            title: `${work.artist} - ${work.title} | WHITE LIGHT STUDIO`,
            description: `White Light Studio Portfolio: ${work.artist} - ${work.title}`,
            images: work.imageUrl ? [work.imageUrl] : [],
        },
        twitter: {
            card: "summary_large_image",
            title: `${work.artist} - ${work.title} | WHITE LIGHT STUDIO`,
            description: `White Light Studio Portfolio: ${work.artist} - ${work.title}`,
            images: work.imageUrl ? [work.imageUrl] : [],
        }
    };
}

export async function generateStaticParams() {
    // Build-time only — use client directly (no draft mode needed)
    const works = await client.fetch<WorkSummary[]>(worksQuery);
    return works.map((work) => ({
        slug: work.slug,
    }));
}

export default async function WorkPage({ params }: { params: { slug: string } }) {
    const decodedSlug = decodeURIComponent(params.slug);
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug: decodedSlug }, tags: ['work'] });

    if (!work) {
        return notFound();
    }

    return <WorkDetailClient initialWork={work} />;
}
