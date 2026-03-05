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

export default function FolkfolioPage() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            <section className="pt-40 pb-0 px-4 flex flex-col items-center justify-center">

                {/* Title Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-8"
                >
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest text-[#222]">포크폴리오</h2>
                    <h1 className="text-3xl md:text-5xl font-black mt-2 tracking-tighter text-black">오빠야 강변살자</h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href="https://www.youtube.com/watch?v=R86SFBXqEdM"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6"
                >
                    <Image
                        src="/images/folkfolio_1.png"
                        alt="오빠야 강변살자"
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
                    <p>2025. 09. 19.</p>
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
                        <p>‘Folk’ 음악의 따뜻한 감성과 ‘Portfolio’의 집약된 기록을 담은 이 이름은, 함께 노래하고 오래 기억될 수 있는 음악을 지향하며, 잊혀졌던 포크음악의 놀이문화를 복원하고자 하는 목적과 정체성이 담겨있습니다.</p>
                        <p>데뷔곡 〈오빠야 강변 살자〉는 지역과 언어, 세대를 뛰어넘는 사랑의 이야기를 노래합니다. 정겨운 경상도 사투리의 매력을 소재로 한 가사와 강변의 목가적 풍경을 배경으로, 통기타와 화음, 멜로디카 연주 등으로 어우러지는 포크 사운드가 청바지와 통기타 세대의 감성을 오늘의 멜로디로 다시금 되살려냅니다.</p>
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
                            Project Info
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Project</span>
                                <span className="text-neutral-800 break-keep">포크폴리오(Folk-Folio)</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics & Composed by</span>
                                <span className="text-neutral-800 break-keep">김은총</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">포크폴리오</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal</span>
                                <span className="text-neutral-800 break-keep">김은총, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Chorus</span>
                                <span className="text-neutral-800 break-keep">김은총, 백광흠</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Instruments
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">A. Guitar</span>
                                <span className="text-neutral-800 break-keep">김은총, 박경재</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Keyboard</span>
                                <span className="text-neutral-800 break-keep">백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Melodica & Tambourine</span>
                                <span className="text-neutral-800 break-keep">박경재</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Staff Credits
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recording Engineer</span>
                                <span className="text-neutral-800 break-keep">박경재 <a href="https://instagram.com/이상한작업실" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-800 transition-colors">@이상한작업실</a></span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixing & Mastering</span>
                                <span className="text-neutral-800 break-keep">White Light Studio(오승환) <a href="https://instagram.com/shcord_re" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-800 transition-colors">@shcord_re</a></span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Photography</span>
                                <span className="text-neutral-800 break-keep">천승환</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Production</span>
                                <span className="text-neutral-800 break-keep">포크폴리오(Folk-Folio) <a href="https://instagram.com/이상컴퍼니" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-800 transition-colors">@이상컴퍼니</a></span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Thanks to
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex flex-col">
                                <span className="text-neutral-800 break-keep leading-loose">
                                    “2024 청춘마이크 전라권 쥬스컴퍼니, 촬영팀 바닐라씨, 전보영 매니저, 이상한계절 팬클럽 이데아, 군산시청, 군산에서 함께 노래불렀던 모든 분들”
                                </span>
                            </li>
                        </ul>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
