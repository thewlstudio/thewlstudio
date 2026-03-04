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

export default function HazePage() {
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
                    <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tighter text-black break-keep">아지랑이</h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href="https://www.youtube.com/watch?v=ynW6znU5Btg"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6"
                >
                    <Image
                        src="/images/haze_bkh.jpg"
                        alt="아지랑이"
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
                    <p>2023. 10. 06.</p>
                </motion.div>

                {/* Vertical Line & Description */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="flex flex-col items-center w-full max-w-3xl"
                >
                    <div className="w-[1px] h-12 md:h-16 bg-neutral-300 mt-8 mb-12"></div>

                    <div className="text-center font-medium leading-relaxed md:leading-loose text-[13px] md:text-[15px] text-neutral-600 space-y-10 px-4 break-keep w-full max-w-2xl mx-auto">
                        <p>
                            꿈을 좇아 갔으면 좋겠습니다.<br />
                            이 글을 적고 있는 곳은 갑작스러운 사고로 인해 709호 병실입니다.<br />
                            사고 당시 몇 초간의 의식을 잃은 경험을 하고 난 뒤 세상을 바라보는 제 마음은 달라진 것 같습니다.
                        </p>
                        <p>
                            우리가 살면서 꿈을 좇는 행위와 행동들은 분명 이 음악에서처럼 쉽지만은 않은 여정일 것입니다.<br />
                            하지만 죽음을 마주했을 때 우리가 하고 싶은 것을 하며 걸어온 시간은<br />
                            방긋 웃으며 우리에게 ‘그동안 수고했어’라고 인사를 하고 있을 것 같습니다.
                        </p>
                    </div>

                    <div className="w-[1px] h-20 md:h-28 bg-neutral-300 mt-12 mb-12"></div>
                </motion.div>

            </section>

            {/* Credits Section */}
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
                            Track Info
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Composed by</span>
                                <span className="text-neutral-800 break-keep">백광흠, 엄시현</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Lyrics by</span>
                                <span className="text-neutral-800 break-keep">백광흠, 승맨 (Seung Man)</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Arranged by</span>
                                <span className="text-neutral-800 break-keep">백광흠, Eugene (유진), OHYUN</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Performance & Art
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Vocal by</span>
                                <span className="text-neutral-800 break-keep">백광흠</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Piano by</span>
                                <span className="text-neutral-800 break-keep">Eugene (유진)</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Artworks by</span>
                                <span className="text-neutral-800 break-keep">전승빈</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                            Staff Credits
                        </h4>
                        <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Recording studio</span>
                                <span className="text-neutral-800 break-keep">White Light Studio (W.L Studio)</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mix & Mastering studio</span>
                                <span className="text-neutral-800 break-keep">Link Studio</span>
                            </li>
                            <li className="flex">
                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5">Mixed & Mastered by</span>
                                <span className="text-neutral-800 break-keep">LINK(링크)</span>
                            </li>
                        </ul>
                    </motion.div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
