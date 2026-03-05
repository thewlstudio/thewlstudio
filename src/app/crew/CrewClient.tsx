"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";

type CrewMember = {
    name: string;
    koName: string;
    role: string;
    slug: string;
    imageUrl: any;
    links?: { url: string; iconUrl: any }[];
};

export default function CrewClient({ members }: { members: CrewMember[] }) {
    return (
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

            {/* Grid Layout for Crew */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-10 gap-x-4 md:gap-y-16 md:gap-x-6 mt-8 px-2 md:px-0">
                {members.map((member, index) => (
                    <motion.div
                        key={member.slug}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="group flex flex-col cursor-pointer"
                    >
                        {/* Default State Name (Above) */}
                        <Link href={`/crew/${member.slug}`} className="mb-2 md:mb-3 font-black text-lg md:text-2xl tracking-tighter transition-colors duration-300 group-hover:text-black w-full truncate text-left">
                            {member.name}
                        </Link>

                        {/* Image Container */}
                        <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden shadow-lg">
                            {/* Invisible overlapping link for card navigation */}
                            <Link href={`/crew/${member.slug}`} className="absolute inset-0 z-10" />

                            {/* Default cover */}
                            <Image
                                src={member.imageUrl ? urlFor(member.imageUrl).url() : '/images/placeholder.jpg'}
                                alt={member.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-700"
                            />

                            {/* JYP Style Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-between p-4 md:p-6 pointer-events-none text-center">
                                {/* Top Text */}
                                <div className="w-full text-right h-6 md:h-8 flex items-start justify-end">
                                    <span className="text-[8px] md:text-[10px] text-white/50 tracking-widest font-bold uppercase w-full truncate text-right">{member.role}</span>
                                </div>

                                {/* Center Text (Hover State Name) */}
                                <div className="w-full flex flex-col items-center justify-center px-1 md:px-2">
                                    <h3 className="text-white text-xs md:text-lg lg:text-2xl font-black tracking-tighter uppercase whitespace-nowrap drop-shadow-lg italic text-center w-full">
                                        <u className="underline-offset-[4px] md:underline-offset-[6px] decoration-[1.5px] md:decoration-2">{member.name}</u>
                                    </h3>
                                </div>

                                {/* Bottom Social Icons (Spacer or Icons) */}
                                <div className="w-full h-6 md:h-8 flex items-end justify-start space-x-3 md:space-x-6 z-20 pointer-events-auto">
                                    {member.links && member.links.map((link: any, i: number) => (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative text-white hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 md:w-8 md:h-8"
                                        >
                                            <Image src={urlFor(link.iconUrl).url()} alt={`SNS Link ${i}`} fill sizes="32px" className="object-contain" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
