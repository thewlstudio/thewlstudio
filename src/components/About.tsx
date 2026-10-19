"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import Lines from "@/components/Lines";

export default function About() {
    const { homeHeadline, homeIntro } = useSiteSettings();
    const paragraphs = homeIntro.split(/\n{2,}/).filter((p) => p.trim());
    return (
        <section id="about" className="relative w-full py-32 bg-black text-white px-6 lg:px-24">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                {/* Text Column */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col space-y-8"
                >
                    <div className="space-y-4">
                        <h2 className="text-sm tracking-[0.3em] text-neutral-500 font-semibold uppercase">WHITE LIGHT STUDIO</h2>
                        <h3 className="text-4xl md:text-6xl font-black tracking-tighter shrink-0 pt-2 break-keep">
                            <Lines text={homeHeadline} always />
                        </h3>
                    </div>

                    <div className="text-lg md:text-[1.15rem] lg:text-[1.25rem] text-neutral-400 font-light leading-[1.8] tracking-wide space-y-4 break-keep">
                        {paragraphs.map((para, i) => (
                            <p key={i}>
                                <Lines text={para} />
                            </p>
                        ))}
                    </div>
                </motion.div>

                {/* Image Collage Column */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative w-full max-w-xl mx-auto xl:max-w-2xl"
                >
                    <div className="grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 h-[500px] md:h-[600px] group">

                        {/* 1. Large Main Box (2x2) */}
                        <div className="relative col-span-2 row-span-2 overflow-hidden shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700">
                            <Image src="/images/lobby_2.jpg" alt="White Light Studio Spaces" fill className="object-cover hover:scale-105 transition-transform duration-1000 origin-center" sizes="(max-width: 768px) 66vw, 40vw" />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        </div>

                        {/* 2. Top Right Box (1x1) */}
                        <div className="relative col-span-1 row-span-1 overflow-hidden shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700 delay-75">
                            <Image src="/images/room_a_3.jpg" alt="White Light Studio Amenities" fill className="object-cover scale-125 hover:scale-[1.35] transition-transform duration-1000 origin-center" sizes="(max-width: 768px) 33vw, 20vw" />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        </div>

                        {/* 3. Mid Right Box (1x1) */}
                        <div className="relative col-span-1 row-span-1 overflow-hidden shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700 delay-150">
                            <Image src="/images/room_c_3.jpg" alt="White Light Studio Gear" fill className="object-cover object-bottom scale-110 hover:scale-[1.20] transition-transform duration-1000 origin-bottom" sizes="(max-width: 768px) 33vw, 20vw" />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        </div>

                        {/* 4. Bottom Left Box (1x1) */}
                        <div className="relative col-span-1 row-span-1 overflow-hidden shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700 delay-200">
                            <Image src="/images/room_d_1.jpg" alt="White Light Studio Interior" fill className="object-cover scale-125 hover:scale-[1.35] transition-transform duration-1000 origin-center" sizes="(max-width: 768px) 33vw, 20vw" />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        </div>

                        {/* 5. Bottom Right Wide Box (2x1) */}
                        <div className="relative col-span-2 row-span-1 overflow-hidden shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700 delay-300">
                            <Image src="/images/room_b_3.jpg" alt="White Light Studio Lobby" fill className="object-cover hover:scale-105 transition-transform duration-1000 origin-center" sizes="(max-width: 768px) 66vw, 40vw" />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        </div>

                    </div>

                    {/* Aesthetic borders/decorations like JYP */}
                    <div className="absolute -inset-5 md:-inset-6 border border-white/10 pointer-events-none z-[-1]" />
                    <div className="absolute -bottom-8 md:-bottom-12 -left-6 md:-left-12 text-6xl md:text-8xl lg:text-9xl font-black text-white/5 pointer-events-none uppercase tracking-tighter truncate w-full">
                        PRODUCER
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
