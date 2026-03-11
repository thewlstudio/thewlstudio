import { Metadata } from "next";
import { notFound } from "next/navigation";
import { client, sanityFetch } from "@/sanity/lib/client";
import { crewBySlugQuery, crewsQuery } from "@/sanity/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CrewDetailClient from "./CrewDetailClient";
import type { CrewMemberDetail, CrewMemberSummary } from "@/types/sanity";

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
    const crews = await client.fetch<CrewMemberSummary[]>(crewsQuery);
    return crews.map((crew) => ({ slug: crew.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug: decodedSlug }, tags: ['crew'] });

    if (!member) {
        return { title: "Crew Not Found | WHITE LIGHT STUDIO" };
    }

    return {
        title: `${member.name} (${member.role}) | WHITE LIGHT STUDIO`,
        description: `White Light Studio Crew: ${member.name} - ${member.koName}`,
        alternates: { canonical: `/crew/${decodedSlug}` },
        openGraph: {
            title: `${member.name} (${member.role}) | WHITE LIGHT STUDIO`,
            description: `White Light Studio Crew: ${member.name} - ${member.koName}`,
            images: member.imageUrl ? [member.imageUrl] : [],
        },
        twitter: {
            card: "summary_large_image",
            title: `${member.name} (${member.role}) | WHITE LIGHT STUDIO`,
            description: `White Light Studio Crew: ${member.name} - ${member.koName}`,
            images: member.imageUrl ? [member.imageUrl] : [],
        }
    };
}

export default async function CrewDetailPage({ params }: Props) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug: decodedSlug }, tags: ['crew'] });

    if (!member) {
        notFound();
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewlstudio.com";
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: member.name,
        alternateName: member.koName,
        jobTitle: member.role,
        image: member.imageUrl ?? undefined,
        url: `${baseUrl}/crew/${decodedSlug}`,
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
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <main id="main-content" className="relative bg-[#fafafa] min-h-screen w-full overflow-hidden text-black font-sans">
                <Header />
                <CrewDetailClient member={member} />
                <Footer />
            </main>
        </>
    );
}
