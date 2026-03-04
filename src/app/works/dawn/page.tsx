"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 }
    }
};

export default function DawnPage() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            <section className="pt-40 pb-0 px-4 flex flex-col items-center justify-center">

                {/* Title Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-8 flex flex-col items-center"
                >
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest text-[#222]">
                        슬
                    </h2>
                    <a href="https://instagram.com/koiibiitoe" target="_blank" rel="noopener noreferrer" className="mt-2 text-xs md:text-sm font-bold text-neutral-400 hover:text-neutral-800 transition-colors tracking-widest">
                        @koiibiitoe
                    </a>
                    <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tighter text-black">새벽의 틈</h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href="https://www.youtube.com/watch?v=Fga8eBBYDIA"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6"
                >
                    <Image
                        src="/images/dawn_seul.png"
                        alt="새벽의 틈"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 384px"
                    />
                    {/* Hover Overlay - JYP Style */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="relative w-10 h-10">
                            {/* Vertical line */}
                            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white -translate-x-1/2"></div>
                            {/* Horizontal line */}
                            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white -translate-y-1/2"></div>
                        </div>
                    </div>
                </motion.a>

                {/* Release Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-center text-xs md:text-sm text-neutral-500 mb-12"
                >
                    <p>Release Date</p>
                    <p>2025. 11. 20.</p>
                </motion.div>

                {/* Vertical Line & Description */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="flex flex-col items-center w-full max-w-3xl"
                >
                    <div className="w-[1px] h-12 bg-neutral-300 mb-12"></div>

                    <div className="text-center font-medium leading-relaxed md:leading-loose text-sm md:text-base text-neutral-800 space-y-6 px-4">
                        <p>슬님의 24살이 온전히 담긴 Ep 새벽의 틈의 1번 트랙과 2번 트랙 업라이트 피아노 레코딩으로 함께 했습니다.</p>
                    </div>

                    <div className="w-[1px] h-20 md:h-28 bg-neutral-300 mt-12 mb-12"></div>
                </motion.div>

            </section>

            {/* Credits Section */}
            <section className="bg-white pb-24 pt-8 md:pt-16 border-t-0">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16"
                >
                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            음반 정보
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Composed & Lyrics by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            1. intro : 편지
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed & Arranged by</span>
                                <span className="text-neutral-800 break-keep">슬, 조서현</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Piano by</span>
                                <span className="text-neutral-800 break-keep">조서현</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            2. 연서
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Piano by</span>
                                <span className="text-neutral-800 break-keep">조서현</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            3. 새벽의 틈
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Nylon Guitar by</span>
                                <span className="text-neutral-800 break-keep">Scon</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            4. 구와 담
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Chorus by</span>
                                <span className="text-neutral-800 break-keep">윤형준, 슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Acoustic Guitar by</span>
                                <span className="text-neutral-800 break-keep">Scon, 슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Electric Guitar by</span>
                                <span className="text-neutral-800 break-keep">백승빈</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            5. 그늘
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">슬, 삼월생</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Chorus by</span>
                                <span className="text-neutral-800 break-keep">삼월생, 슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Nylon Guitar by</span>
                                <span className="text-neutral-800 break-keep">Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Acoustic Guitar by</span>
                                <span className="text-neutral-800 break-keep">슬</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Synth by</span>
                                <span className="text-neutral-800 break-keep">Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Bass by</span>
                                <span className="text-neutral-800 break-keep">Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Flute & Oboe by</span>
                                <span className="text-neutral-800 break-keep">삼월생</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Staff Credits
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixing & Mastering</span>
                                <span className="text-neutral-800 break-keep">Scon at White Light Sound</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recording Engineer</span>
                                <span className="text-neutral-800 break-keep">오승환 at White light studio(track1,2)<br />Scon at White light sound (track2,3,4,5)</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Artwork by</span>
                                <span className="text-neutral-800 break-keep flex gap-1">지극히 <a href="https://instagram.com/jigueki" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-500 transition-colors">@jigueki</a></span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Profile Photo by</span>
                                <span className="text-neutral-800 break-keep">김서연, 삼월생</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Visual Marketing by</span>
                                <span className="text-neutral-800 break-keep">김서연</span>
                            </li>
                        </ul>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
