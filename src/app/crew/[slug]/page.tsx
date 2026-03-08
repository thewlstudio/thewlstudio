import { Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/client";
import { crewBySlugQuery } from "@/sanity/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CrewDetailClient from "./CrewDetailClient";
import type { CrewMemberDetail } from "@/types/sanity";

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const decodedSlug = decodeURIComponent(params.slug);
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug: decodedSlug }, tags: ['crew'] });

    if (!member) {
        return { title: "Crew Not Found | WHITE LIGHT STUDIO" };
    }

    return {
        title: `${member.name} (${member.role}) | WHITE LIGHT STUDIO`,
        description: `White Light Studio Crew: ${member.name} - ${member.koName}`,
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
    const decodedSlug = decodeURIComponent(params.slug);
    const member = await sanityFetch<CrewMemberDetail>({ query: crewBySlugQuery, params: { slug: decodedSlug }, tags: ['crew'] });

    if (!member) {
        notFound();
    }

    return (
        <main className="relative bg-[#fafafa] min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />
            <CrewDetailClient member={member} />
            <Footer />
        </main>
    );
}
