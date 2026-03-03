import { client } from "@/sanity/lib/client";
import { instructorsQuery } from "@/sanity/lib/queries";
import ClassClient from "./ClassClient";

export default async function ClassIndexPage() {
    const instructors = await client.fetch(instructorsQuery);

    return <ClassClient initialInstructors={instructors} />;
}


