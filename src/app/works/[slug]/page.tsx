import { Metadata } from "next";
import { SITE_NAME_TEXT, getSiteUrl } from "@/config/site";
import { client, sanityFetch } from "@/sanity/lib/client";
import { workBySlugQuery, worksQuery, PUBLIC_VISIBILITY_PARAMS } from "@/sanity/lib/queries";
import WorkDetailClient from "./WorkDetailClient";
import { notFound } from "next/navigation";
import type { WorkDetail, WorkSummary } from "@/types/sanity";
import { jsonLdDate, serializeJsonLd } from "@/lib/json-ld";
import { decodePublicPageSlug, publicDetailPath, publicStaticParams } from "@/lib/public-routes";
import { socialImageUrl } from "@/lib/sanity-image";
import { publicPageMetadata } from "@/lib/public-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const path = publicDetailPath("works", slug);
    if (!path) notFound();
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug }, tags: ['work'] });

    if (!work) {
        notFound();
    }

    const shareImage = socialImageUrl(work.imageUrl);

    return publicPageMetadata({
        title: `${work.artist} - ${work.title}`,
        description: `${SITE_NAME_TEXT} Portfolio: ${work.artist} - ${work.title}`,
        path, shareImage,
    });
}

export async function generateStaticParams() {
    // Build-time only — use client directly (no draft mode needed)
    const works = await client.fetch<WorkSummary[]>(worksQuery, PUBLIC_VISIBILITY_PARAMS);
    return publicStaticParams(works);
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug: pageSlug } = await params;
    const slug = decodePublicPageSlug(pageSlug);
    if (slug === null) notFound();
    const path = publicDetailPath("works", slug);
    if (!path) notFound();
    const work = await sanityFetch<WorkDetail>({ query: workBySlugQuery, params: { slug }, tags: ['work'] });

    if (!work) {
        return notFound();
    }

    const baseUrl = getSiteUrl();
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: work.title,
        byArtist: { "@type": "Person", name: work.artist },
        datePublished: jsonLdDate(work.releaseDate),
        image: socialImageUrl(work.imageUrl) ?? undefined,
        url: `${baseUrl}${path}`,
        // recordedAt은 장소가 아니라 Event를 요구한다. 실제 이벤트 정보가 없으므로 선언하지 않는다.
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />
            <WorkDetailClient initialWork={work} />
        </>
    );
}
