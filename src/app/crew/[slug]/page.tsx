import { Metadata } from "next";
import { notFound } from "next/navigation";
import { client, sanityFetch } from "@/sanity/lib/client";
import { crewBySlugQuery, crewsQuery, PUBLIC_VISIBILITY_PARAMS } from "@/sanity/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CrewDetailClient from "./CrewDetailClient";
import type { CrewMemberDetail, CrewMemberSummary } from "@/types/sanity";
import { serializeJsonLd } from "@/lib/json-ld";
import { decodePublicPageSlug, publicDetailPath, publicStaticParams } from "@/lib/public-routes";
import { socialImageUrl } from "@/lib/sanity-image";
import { publicPageMetadata } from "@/lib/public-metadata";

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
    const crews = await client.fetch<CrewMemberSummary[]>(crewsQuery, PUBLIC_VISIBILITY_PARAMS);
    return publicStaticParams(crews);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const path = publicDetailPath("crew", slug);
    if (!path) notFound();
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug }, tags: ['crew'] });

    if (!member) {
        notFound();
    }

    const shareImage = socialImageUrl(member.imageUrl);

    return publicPageMetadata({
        title: `${member.name} (${member.role})`,
        description: `White Light Studio Crew: ${member.name} - ${member.koName}`,
        path, shareImage,
    });
}

export default async function CrewDetailPage({ params }: Props) {
    const { slug: pageSlug } = await params;
    const slug = decodePublicPageSlug(pageSlug);
    if (slug === null) notFound();
    const path = publicDetailPath("crew", slug);
    if (!path) notFound();
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug }, tags: ['crew'] });

    if (!member) {
        notFound();
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app").replace(/\/+$/, "");
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: member.name,
        alternateName: member.koName,
        jobTitle: member.role,
        image: socialImageUrl(member.imageUrl) ?? undefined,
        url: `${baseUrl}${path}`,
        worksFor: {
            "@type": "Organization",
            name: "WHITE LIGHT STUDIO",
            url: baseUrl,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />
            <main id="main-content" className="relative bg-[#fafafa] min-h-screen w-full overflow-hidden text-black font-sans">
                <Header />
                <CrewDetailClient member={member} path={path} />
                <Footer />
            </main>
        </>
    );
}
