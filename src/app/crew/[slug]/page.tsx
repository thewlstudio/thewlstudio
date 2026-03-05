import { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { crewBySlugQuery } from "@/sanity/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CrewDetailClient from "./CrewDetailClient";

// Revalidate every 10 seconds for ISR
export const revalidate = 10;

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const decodedSlug = decodeURIComponent(params.slug);
    const member = await client.fetch(crewBySlugQuery, { slug: decodedSlug });

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
    const member = await client.fetch(crewBySlugQuery, { slug: decodedSlug });

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
