import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sanityFetch } from "@/sanity/lib/client";
import { crewsQuery } from "@/sanity/lib/queries";
import CrewClient from "./CrewClient";

export default async function CrewPage() {
    const members = await sanityFetch<any[]>({ query: crewsQuery, tags: ['crew'] });

    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />
            <CrewClient members={members} />
            <Footer />
        </main>
    );
}
