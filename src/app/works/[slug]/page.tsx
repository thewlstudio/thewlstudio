import { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { workBySlugQuery, worksQuery } from "@/sanity/lib/queries";
import WorkDetailClient from "./WorkDetailClient";
import { notFound } from "next/navigation";

export const revalidate = 10; // ISR validation

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const work = await client.fetch(workBySlugQuery, { slug: params.slug });

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
    const works = await client.fetch(worksQuery);
    return works.map((work: any) => ({
        slug: work.slug,
    }));
}

export default async function WorkPage({ params }: { params: { slug: string } }) {
    const work = await client.fetch(workBySlugQuery, { slug: params.slug });

    if (!work) {
        return notFound();
    }

    return <WorkDetailClient initialWork={work} />;
}
