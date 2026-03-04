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

export default function INeverForgotYouPage() {
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
                        백광흠
                    </h2>
                    <a href="https://instagram.com/lifelikemovie.bkh" target="_blank" rel="noopener noreferrer" className="mt-2 text-xs md:text-sm font-bold text-neutral-400 hover:text-neutral-800 transition-colors tracking-widest">
                        @lifelikemovie.bkh
                    </a>
                    <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tighter text-black break-keep">계절이 물든다 해서 그대를 잊은 적 없다</h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href="https://www.youtube.com/watch?v=UMIPtYWEysE&list=OLAK5uy_kFjY0kNvlJU5IlqAl23k2JqiQhvu8VrHs"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6"
                >
                    <Image
                        src="/images/I Never Forgot You, Even as the Seasons Changed_bkh.jpg"
                        alt="계절이 물든다 해서 그대를 잊은 적 없다"
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
                    <p>2025. 08. 08.</p>
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
                        <p>잊지 못한 아픔, 지울 수 없던 시간.<br />그 모든 감정을 멜로디와 언어에 담아냈습니다.</p>
                        <p>「계절이 물든다 해서 그대를 잊은 적 없다」는<br />계절이 바뀌고 시간이 흘러도 지워지지 않는 그리움과 기억을<br />음악으로 고요히 그려낸 작품입니다.</p>
                        <p>작곡가 김광희와 함께 긴 시간 마음을 다해 완성한 이번 곡은<br />누군가에게 전하지 못했던 말, 끝내 지우지 못한 감정들이<br />하나의 노래가 되어 당신의 계절 위에 조용히 물들기를 바랍니다.</p>
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
                            Production & Composition
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">김광희</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">백광흠</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Staff Credits
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">All Instruments by</span>
                                <span className="text-neutral-800 break-keep">백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed & Mastered by</span>
                                <span className="text-neutral-800 break-keep">White Light Studio(오승환) <a href="https://instagram.com/shcord_re" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-800 transition-colors">@shcord_re</a></span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Special Thanks to</span>
                                <span className="text-neutral-800 break-keep">김범수</span>
                            </li>
                        </ul>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
