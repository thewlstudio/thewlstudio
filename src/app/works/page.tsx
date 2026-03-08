import { sanityFetch } from "@/sanity/lib/client";
import { worksQuery } from "@/sanity/lib/queries";
import WorksClient from "./WorksClient";
import type { WorkSummary } from "@/types/sanity";

export default async function WorksIndexPage() {
    const works = await sanityFetch<WorkSummary[]>({ query: worksQuery, tags: ['work'] });

    return <WorksClient initialWorks={works} />;
}
