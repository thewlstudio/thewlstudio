"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function About() {
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
                            당신의 이야기가<br />음악이 되는 곳
                        </h3>
                    </div>

                    <div className="text-lg md:text-[1.15rem] lg:text-[1.25rem] text-neutral-400 font-light leading-[1.8] tracking-wide space-y-4 break-keep">
                        <p>
                            W.L Studio는 단순히 소리를 녹음하는 것을 넘어,{' '}
                            <br className="hidden md:block" />
                            아티스트가 전하고자 하는 진심과 감정을{' '}
                            <br className="hidden md:block" />
                            가장 순수한 형태로 담아내는 공간입니다.
                        </p>
                        <p>
                            최상의 장비와 쾌적한 환경,{' '}
                            <br className="hidden md:block" />
                            그리고 프로페셔널한 크루들이{' '}
                            <br className="hidden md:block" />
                            당신만의 특별한 작품을 완성할 수 있도록 함께합니다.
                        </p>
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
