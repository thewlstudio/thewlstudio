"use client";

import { motion } from "motion/react";
import Image from "next/image";

export default function Portfolio() {
    return (
        <section id="works" className="relative w-full py-32 bg-[#0a0a0a] text-white">
            <div className="container mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-24"
                >
                    <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">Works</h2>
                    <div className="w-24 h-1 bg-white mx-auto mt-8" />
                </motion.div>

                {/* Portfolio Item 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* The image of the work, we don't have the exact file, so we use a placeholder or style it heavily */}
                        <div className="aspect-video bg-neutral-900 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 to-transparent z-10" />
                            <Image
                                src="/images/artist.jpg"
                                alt="오빠야 강변살자"
                                fill
                                sizes="(max-width: 1024px) 100vw, 58vw"
                                className="object-cover blur-sm opacity-50 group-hover:scale-105 group-hover:blur-none group-hover:opacity-100 transition-all duration-1000 grayscale group-hover:grayscale-0"
                            />
                            <div className="absolute bottom-10 left-10 z-20">
                                <p className="text-neutral-400 font-bold uppercase tracking-widest text-sm mb-2">포크폴리오</p>
                                <h3 className="text-5xl font-black text-white">오빠야 강변살자</h3>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="lg:col-span-5 space-y-8"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="text-neutral-300 font-light text-sm leading-relaxed space-y-4">
                            <p>‘Folk’ 음악의 따뜻한 감성과 ‘Portfolio’의 집약된 기록을 담은 이 이름은, 함께 노래하고 오래 기억될 수 있는 음악을 지향하며, 잊혀졌던 포크음악의 놀이문화를 복원하고자 하는 목적과 정체성이 담겨있습니다.</p>
                            <p>데뷔곡 〈오빠야 강변 살자〉는 지역과 언어, 세대를 뛰어넘는 사랑의 이야기를 노래합니다. 정겨운 경상도 사투리의 매력을 소재로 한 가사와 강변의 목가적 풍경을 배경으로, 통기타와 화음, 멜로디카 연주 등으로 어우러지는 포크 사운드가 청바지와 통기타 세대의 감성을 오늘의 멜로디로 다시금 되살려냅니다.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 text-xs font-mono tracking-tight text-neutral-400 border-t border-neutral-800 pt-6">
                            <div>
                                <span className="text-white block mb-1">Project</span>
                                포크폴리오(Folk-Folio)
                            </div>
                            <div>
                                <span className="text-white block mb-1">Lyrics & Composed by</span>
                                김은총
                            </div>
                            <div>
                                <span className="text-white block mb-1">Arranged by</span>
                                포크폴리오
                            </div>
                            <div>
                                <span className="text-white block mb-1">Vocal</span>
                                김은총, 백광흠
                            </div>
                            <div>
                                <span className="text-white block mb-1">Mixing & Mastering</span>
                                White Light Studio (오승환)
                            </div>
                            <div>
                                <span className="text-white block mb-1">Production</span>
                                @이상컴퍼니
                            </div>
                        </div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}
