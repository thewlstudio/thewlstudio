import { sanityFetch } from "@/sanity/lib/client";
import { instructorsQuery } from "@/sanity/lib/queries";
import ClassClient, { type Instructor } from "./ClassClient";

export default async function ClassIndexPage() {
    const instructors = await sanityFetch<Instructor[]>({ query: instructorsQuery, tags: ['instructor'] });

    return <ClassClient initialInstructors={instructors} />;
}
