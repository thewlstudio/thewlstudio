import { sanityFetch } from "@/sanity/lib/client";
import { worksQuery } from "@/sanity/lib/queries";
import WorksClient from "./WorksClient";

export default async function WorksIndexPage() {
    const works = await sanityFetch<any[]>({ query: worksQuery, tags: ['work'] });

    return <WorksClient initialWorks={works} />;
}
