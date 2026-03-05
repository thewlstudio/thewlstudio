import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { client } from "@/sanity/lib/client";
import { crewsQuery } from "@/sanity/lib/queries";
import CrewClient from "./CrewClient";

// Revalidate every 10 seconds for ISR
export const revalidate = 10;

export default async function CrewPage() {
    // Fetch crew members where isActive == true, sorted by order
    const members = await client.fetch(crewsQuery);

    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />
            <CrewClient members={members} />
            <Footer />
        </main>
    );
}
