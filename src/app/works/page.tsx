import { client } from "@/sanity/lib/client";
import { worksQuery } from "@/sanity/lib/queries";
import WorksClient from "./WorksClient";

export const revalidate = 10; // Refresh data every 10 seconds (ISR)

export default async function WorksIndexPage() {
    const works = await client.fetch(worksQuery);

    return <WorksClient initialWorks={works} />;
}
