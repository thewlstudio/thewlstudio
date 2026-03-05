import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { crewBySlugQuery } from "@/sanity/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CrewDetailClient from "./CrewDetailClient";

// Revalidate every 10 seconds for ISR
export const revalidate = 10;

type Props = {
    params: { slug: string };
};

export default async function CrewDetailPage({ params }: Props) {
    const member = await client.fetch(crewBySlugQuery, { slug: params.slug });

    if (!member) {
        notFound();
    }

    return (
        <main className="relative bg-[#fafafa] min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />
            <CrewDetailClient member={member} />
            <Footer />
        </main>
    );
}
