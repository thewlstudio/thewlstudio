import { client } from "@/sanity/lib/client";
import { workBySlugQuery, worksQuery } from "@/sanity/lib/queries";
import WorkDetailClient from "./WorkDetailClient";
import { notFound } from "next/navigation";

export const revalidate = 10; // ISR validation

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
