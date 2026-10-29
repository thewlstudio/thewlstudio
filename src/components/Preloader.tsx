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
    if (skip || !isClient) return null;
    return <PreloaderRun />;
}

/** 실행 중에는 저장소를 다시 읽지 않아 seen 기록 때문에 자기 타이머가 취소되지 않는다. */
function PreloaderRun() {
    const [alreadySeen] = useState(() => {
        try { return sessionStorage.getItem("wls_preloader_seen") === "true"; }
        catch { return false; }
    });
    const [step, setStep] = useState(0);
    const [active, setActive] = useState(!alreadySeen);

    // 배경 스크롤 잠금은 메뉴·클래스 모달과 공유하는 useBodyScrollLock이 담당한다
    // (각자 body.style.overflow를 직접 건드리면, Preloader가 실행되는 2초 사이
    // 메뉴를 열었을 때처럼 한쪽이 끝나면서 다른 쪽의 잠금까지 풀어버릴 수 있다 —
    // Preloader는 pointer-events-none이라 실제로 뒤 배경 클릭이 통과된다).
    // 퇴장 애니메이션이 끝날 때까지 잠금을 유지한다.
    useBodyScrollLock(active);

    useEffect(() => {
        // 관리 화면이거나 동작 줄이기 설정이면 안정성·접근성이 우선이라
        // 타이머 등 어떤 부수효과도 실행하지 않고 완전히 건너뛴다
        if (alreadySeen) return;
        try { sessionStorage.setItem("wls_preloader_seen", "true"); }
        catch { /* 저장소 차단은 브랜드 연출이나 페이지를 중단시키지 않는다. */ }

        // Step 0: PNG transparent logo fades in gracefully
        const timer1 = setTimeout(() => {
            setStep(1); // Hard cut to JPG version for a dramatic brief flash
        }, 1600);

        const timer2 = setTimeout(() => {
            setStep(2); // Hide preloader and reveal the site
        }, 2000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [alreadySeen]);

    // 관리 화면/동작 줄이기 제외 + 하이드레이션 불일치 방지 / 이미 봤으면 스킵
    if (alreadySeen) return null;

    return (
        <AnimatePresence onExitComplete={() => setActive(false)}>
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
                                    sizes="(min-width: 1024px) 768px, (min-width: 768px) 576px, (min-width: 640px) 384px, 256px"
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
                                    sizes="(min-width: 768px) 80vw, (min-width: 640px) 384px, 256px"
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
