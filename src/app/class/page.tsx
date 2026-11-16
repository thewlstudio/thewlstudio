import { sanityFetch } from "@/sanity/lib/client";
import { instructorsQuery } from "@/sanity/lib/queries";
import ClassClient from "./ClassClient";
import { readPublicList } from "@/lib/public-list-read";

export default async function ClassIndexPage() {
    const instructors = readPublicList("instructor", await sanityFetch<unknown>({ query: instructorsQuery, tags: ['instructor'] }));

    return <ClassClient initialInstructors={instructors} />;
}
