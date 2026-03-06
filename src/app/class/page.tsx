import { sanityFetch } from "@/sanity/lib/client";
import { instructorsQuery } from "@/sanity/lib/queries";
import ClassClient from "./ClassClient";

export default async function ClassIndexPage() {
    const instructors = await sanityFetch<any[]>({ query: instructorsQuery, tags: ['instructor'] });

    return <ClassClient initialInstructors={instructors} />;
}
