"use client";

import { motion } from "motion/react";
import Image from "next/image";

export default function Hero() {
    return (
        <div className="w-full">
            {/* Section 1: Logo only */}
            <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-black">
                {/* Background Image / Logo */}
                <div className="absolute inset-0 z-0 scale-150 md:scale-125">
                    <Image
                        src="/images/studio_logo_2.png"
                        alt="White Light Studio Logo"
                        fill
                        className="object-contain"
                        sizes="100vw"
                        priority
                    />
                </div>

                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center opacity-70"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                >
                    <span className="text-[10px] tracking-widest text-white uppercase mb-2">Scroll</span>
                    <motion.div
                        className="w-[1px] h-16 bg-white"
                        animate={{ scaleY: [0, 1, 0], transformOrigin: ["top", "top", "bottom"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            </section>

            {/* Section 2: Catchphrase only */}
            <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-black text-center px-4 border-t border-white/5">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase mb-6">
                        Record Your Sound
                    </h1>
                    <p className="text-sm md:text-xl text-neutral-400 font-light tracking-widest uppercase">
                        Recording Music Studio • KOREA
                    </p>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center opacity-70"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1, duration: 1 }}
                >
                    <span className="text-[10px] tracking-widest text-white uppercase mb-2">Scroll</span>
                    <motion.div
                        className="w-[1px] h-16 bg-white"
                        animate={{ scaleY: [0, 1, 0], transformOrigin: ["top", "top", "bottom"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            </section>
        </div>
    );
}
