import { Metadata } from "next";
import { client, sanityFetch } from "@/sanity/lib/client";
import { workBySlugQuery, worksQuery } from "@/sanity/lib/queries";
import WorkDetailClient from "./WorkDetailClient";
import { notFound } from "next/navigation";
import type { WorkDetail, WorkSummary } from "@/types/sanity";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug: decodedSlug }, tags: ['work'] });

    if (!work) {
        return { title: "Work Not Found | WHITE LIGHT STUDIO" };
    }

    return {
        title: `${work.artist} - ${work.title} | WHITE LIGHT STUDIO`,
        description: `White Light Studio Portfolio: ${work.artist} - ${work.title}`,
        alternates: { canonical: `/works/${decodedSlug}` },
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

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug: decodedSlug }, tags: ['work'] });

    if (!work) {
        return notFound();
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app";
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: work.title,
        byArtist: { "@type": "Person", name: work.artist },
        datePublished: work.releaseDate,
        image: work.imageUrl ?? undefined,
        url: `${baseUrl}/works/${decodedSlug}`,
        recordedAt: {
            "@type": "MusicVenue",
            name: "WHITE LIGHT STUDIO",
            url: baseUrl,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <WorkDetailClient initialWork={work} />
        </>
    );
}
