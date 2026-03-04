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

export default function FirstLetterPage() {
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
                        양민서
                    </h2>
                    <a href="https://instagram.com/yangminseo03" target="_blank" rel="noopener noreferrer" className="mt-2 text-xs md:text-sm font-bold text-neutral-400 hover:text-neutral-800 transition-colors tracking-widest">
                        @yangminseo03
                    </a>
                    <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tighter text-black break-keep">First Letter</h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href="https://www.youtube.com/playlist?list=OLAK5uy_noyzRQpXUSAhp4kgdkphAydEDvd78qqnA"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="group relative block w-full max-w-sm xl:max-w-md aspect-square shadow-2xl overflow-hidden mb-6"
                >
                    <Image
                        src="/images/firstlove_yangminseo03.jpg"
                        alt="First Letter"
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
                    <p>2026. 02. 24.</p>
                </motion.div>

                {/* Vertical Line & Description */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="flex flex-col items-center w-full max-w-3xl"
                >
                    <div className="w-[1px] h-12 bg-neutral-300 mb-12"></div>

                    <div className="text-center font-medium leading-relaxed md:leading-loose text-sm md:text-base text-neutral-600 space-y-6 px-4 break-keep w-full">
                        <p>
                            전하지 못했던 빼곡히 적은 민서님의 어린 시절부터 오늘까지 담긴 EP에 레코딩, 디렉팅, 편곡, 마스터링, 아트웍 등에 WL Studio가 함께 했습니다.
                        </p>
                    </div>

                    <div className="w-[1px] h-20 md:h-28 bg-neutral-300 mt-12 mb-16"></div>
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
                            1. Winter
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">양민서, 김형래, Scon, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Guitar by</span>
                                <span className="text-neutral-800 break-keep">김재욱</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recorded & Vocal Direct by</span>
                                <span className="text-neutral-800 break-keep">백광흠 @WhiteLightStudio</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mastered by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon @WhiteLightSound</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            2. Star
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">양민서, 김형래, Scon, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Guitar by</span>
                                <span className="text-neutral-800 break-keep">김재욱</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recorded & Vocal Direct by</span>
                                <span className="text-neutral-800 break-keep">백광흠 @WhiteLightStudio</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mastered by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            3. First love
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">양민서, 김형래, Scon, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Guitar by</span>
                                <span className="text-neutral-800 break-keep">김재욱</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recorded & Vocal Direct by</span>
                                <span className="text-neutral-800 break-keep">백광흠 @WhiteLightStudio</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mastered by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon @WhiteLightSound</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            4. 달아
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">양민서, 김형래, Scon, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Guitar by</span>
                                <span className="text-neutral-800 break-keep">김재욱</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recorded & Vocal Direct by</span>
                                <span className="text-neutral-800 break-keep">백광흠 @WhiteLightStudio</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mastered by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon @WhiteLightSound</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            5. 반딧불이
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">양민서</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">양민서, 김형래, Scon, 백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Guitar by</span>
                                <span className="text-neutral-800 break-keep">김재욱</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recorded & Vocal Direct by</span>
                                <span className="text-neutral-800 break-keep">백광흠 @WhiteLightStudio</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed by</span>
                                <span className="text-neutral-800 break-keep">김형래</span>
                            </li>
                            <li className="flex">
                                <span className="w-32 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mastered by</span>
                                <span className="text-neutral-800 break-keep">김형래, Scon @WhiteLightSound</span>
                            </li>
                        </ul>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
