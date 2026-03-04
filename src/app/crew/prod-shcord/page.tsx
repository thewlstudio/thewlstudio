"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OhSeungHwanDetailPage() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            {/* Hero Profile Section */}
            <section className="pt-40 lg:pt-48 pb-16 px-4 flex flex-col items-center justify-center bg-black text-white">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center max-w-4xl text-center"
                >
                    <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shadow-2xl mb-8 border-4 border-neutral-800 relative group">
                        <Image
                            src="/images/crew_shcord.jpg"
                            alt="Oh Seung-hwan Profile"
                            fill
                            className="object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
                            sizes="224px"
                        />
                    </div>

                    <h2 className="text-sm font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4">Production / PA / Video Filming</h2>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 flex flex-col items-center">
                        Oh Seung-hwan
                        <span className="text-xl md:text-2xl font-medium text-neutral-400 mt-2">오승환</span>
                    </h1>

                    <div className="flex items-center space-x-6 mt-4">
                        <a href="https://www.instagram.com/shcord_re/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                            <Image src="/images/insta_favi_dark.png" alt="Instagram" width={32} height={32} className="object-contain" />
                        </a>
                    </div>
                </motion.div>
            </section>

            {/* Preparation / Info Section */}
            <section className="py-32 px-4 md:px-12 max-w-5xl mx-auto text-center min-h-[30vh]">
                <h2 className="text-3xl font-black tracking-widest text-neutral-300 uppercase">
                    Discography Updating Soon
                </h2>
                <p className="mt-6 text-neutral-500 font-medium tracking-wide">
                    상세 이력 및 프로듀싱 내역이 곧 업데이트될 예정입니다.
                </p>
            </section>

            <Footer />
        </main>
    );
}
