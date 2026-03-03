import { client } from "@/sanity/lib/client";
import { instructorsQuery } from "@/sanity/lib/queries";
import ClassClient from "./ClassClient";

export const revalidate = 10; // Refresh data every 10 seconds (ISR)

export default async function ClassIndexPage() {
    const instructors = await client.fetch(instructorsQuery);

    return <ClassClient initialInstructors={instructors} />;
}
