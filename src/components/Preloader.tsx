"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { usePrefersReducedMotion } from "./SmoothScroll";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const emptySubscribe = () => () => {};

export default function Preloader() {
    const pathname = usePathname();
    const isAdminScreen = pathname.startsWith("/manage") || pathname.startsWith("/admin");
    // 훅은 조건 없이 항상 호출하고, 건너뛸지 여부는 이 값을 조합해 아래에서 판단한다
    const prefersReducedMotion = usePrefersReducedMotion();
    const skip = isAdminScreen || prefersReducedMotion;

    const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const alreadySeen = useSyncExternalStore(
        emptySubscribe,
        () => sessionStorage.getItem("wls_preloader_seen") === "true",
        () => false,
    );
    const [step, setStep] = useState(0);

    // 배경 스크롤 잠금은 메뉴·클래스 모달과 공유하는 useBodyScrollLock이 담당한다
    // (각자 body.style.overflow를 직접 건드리면, Preloader가 실행되는 2초 사이
    // 메뉴를 열었을 때처럼 한쪽이 끝나면서 다른 쪽의 잠금까지 풀어버릴 수 있다 —
    // Preloader는 pointer-events-none이라 실제로 뒤 배경 클릭이 통과된다).
    // Preloader가 화면에 실제로 떠 있는 동안(step 0~1)에만 잠근다.
    const isPreloaderVisible = !skip && isClient && !alreadySeen && step < 2;
    useBodyScrollLock(isPreloaderVisible);

    useEffect(() => {
        // 관리 화면이거나 동작 줄이기 설정이면 안정성·접근성이 우선이라
        // 타이머 등 어떤 부수효과도 실행하지 않고 완전히 건너뛴다
        if (skip) return;
        if (!isClient || alreadySeen) return;

        sessionStorage.setItem("wls_preloader_seen", "true");

        // Step 0: PNG transparent logo fades in gracefully
        const timer1 = setTimeout(() => {
            setStep(1); // Hard cut to JPG version for a dramatic brief flash
        }, 1600);

        const timer2 = setTimeout(() => {
            setStep(2); // Hide preloader and reveal the site
            window.scrollTo(0, 0);
        }, 2000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [skip, isClient, alreadySeen]);

    // 관리 화면/동작 줄이기 제외 + 하이드레이션 불일치 방지 / 이미 봤으면 스킵
    if (skip || !isClient || alreadySeen) return null;

    return (
        <AnimatePresence>
            {step < 2 && (
                <motion.div
                    key="preloader"
                    aria-hidden="true"
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
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 256px, (max-width: 1024px) 384px, 768px"
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
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 256px, 80vw"
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
