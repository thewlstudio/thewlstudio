"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Preloader() {
    const [step, setStep] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const hasSeenPreloader = sessionStorage.getItem("wls_preloader_seen");

        if (hasSeenPreloader) {
            setStep(2); // Skip preloader completely
            return;
        }

        sessionStorage.setItem("wls_preloader_seen", "true");

        // Lock scroll while preloading
        document.body.style.overflow = 'hidden';

        // Step 0: PNG transparent logo fades in gracefully
        const timer1 = setTimeout(() => {
            setStep(1); // Hard cut to JPG version for a dramatic brief flash
        }, 1600);

        const timer2 = setTimeout(() => {
            setStep(2); // Hide preloader and reveal the site
            document.body.style.overflow = 'unset';
            window.scrollTo(0, 0);
        }, 2000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Prevent hydration mismatch
    if (!isMounted) return null;

    return (
        <AnimatePresence>
            {step < 2 && (
                <motion.div
                    key="preloader"
                    exit={{ opacity: 0, y: "-100%" }}
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                    className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center overflow-hidden pointer-events-none"
                >
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="png-logo"
                                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(5px)' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="relative w-64 h-64 sm:w-96 sm:h-96 md:w-[36rem] md:h-[36rem] lg:w-[48rem] lg:h-[48rem] mix-blend-screen"
                            >
                                <Image
                                    src="/images/studio_logo_2.png"
                                    alt="White Light Studio Logo PNG"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>
                        )}
                        {step === 1 && (
                            <motion.div
                                key="jpg-logo"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="relative w-64 h-64 sm:w-96 sm:h-96 md:w-[80vw] md:h-[80vh] flex items-center justify-center mix-blend-difference"
                            >
                                <Image
                                    src="/images/studio_logo.jpg"
                                    alt="White Light Studio Logo JPG"
                                    fill
                                    className="object-cover md:object-contain grayscale contrast-150 rounded"
                                    priority
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
