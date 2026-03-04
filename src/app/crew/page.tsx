"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const CREW_MEMBERS = [
    {
        id: "ceo-bkh",
        role: "CEO / Head Producer",
        name: "Baek Kwang-heum",
        image: "/images/artist.jpg",
        links: [
            { type: "youtube", icon: "▶️", url: "https://www.youtube.com/@bkh__official" },
            { type: "instagram", url: "https://instagram.com/lifelikemovie.bkh" }
        ],
        classes: ["Sing a song & Vocal", "Guitar", "Compose", "Piano"]
    },
    {
        id: "prod-shcord",
        role: "Production / PA / Video Filming",
        name: "Oh Seung-hwan",
        image: "/images/crew_shcord.jpg",
        links: [
            { type: "instagram", url: "https://www.instagram.com/shcord_re/" }
        ],
        classes: ["Production", "Recording", "Mixing", "Mastering", "PA : FOH / SYSTEM", "Video Filming"]
    },
    {
        id: "vocal-scon",
        role: "Producer / Singer-songwriter / Engineer",
        name: "Scon",
        image: "/images/crew_scon.png",
        links: [
            { type: "youtube", icon: "▶️", url: "https://www.youtube.com/@boxscon" },
            { type: "instagram", url: "https://instagram.com/boxscon" }
        ],
        classes: ["Producing", "Vocal", "Instruments", "Mixing", "Mastering"]
    }
];

export default function CrewPage() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            <section className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-[90rem]">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-black"
                >
                    <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-black ml-4">
                        OUR CREW
                    </h1>
                </motion.div>

                {/* Grid Layout for Crew (JYP Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-16 gap-x-6">
                    {CREW_MEMBERS.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="group flex flex-col cursor-pointer"
                        >
                            {/* Default State Name (Above) */}
                            <Link href={`/crew/${member.id}`} className="mb-3 font-black text-xl md:text-2xl tracking-tighter transition-colors duration-300 group-hover:text-black">
                                {member.name}
                            </Link>

                            {/* Image Container */}
                            <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden shadow-lg">
                                {/* Invisible overlapping link for card navigation */}
                                <Link href={`/crew/${member.id}`} className="absolute inset-0 z-10" />

                                {/* Default cover */}
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover transition-transform duration-700"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />

                                {/* JYP Style Hover Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-between p-6 pointer-events-none">
                                    <div className="w-full text-right">
                                        <span className="text-[10px] text-white/50 tracking-widest font-bold uppercase">{member.role}</span>
                                    </div>

                                    {/* Center Text (Hover State Name) */}
                                    <div className="w-full flex items-center justify-center px-2">
                                        <h3 className="text-white text-lg sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap drop-shadow-lg italic">
                                            <u className="underline-offset-[6px] decoration-2">{member.name}</u>
                                        </h3>
                                    </div>

                                    {/* Bottom Social Icons */}
                                    <div className="w-full flex items-center justify-start space-x-6 z-20 pointer-events-auto">
                                        {member.links.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-white hover:scale-110 transition-transform flex items-center justify-center w-8 h-8"
                                            >
                                                {link.type === 'instagram' ? (
                                                    <Image src="/images/insta_favi_light.png" alt="Instagram" width={32} height={32} className="object-contain" />
                                                ) : link.type === 'youtube' ? (
                                                    <Image src="/images/youtube_favi_light.png" alt="YouTube" width={32} height={32} className="object-contain" />
                                                ) : (
                                                    <span className="text-2xl">{link.icon}</span>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </section>

            <Footer />
        </main>
    );
}
