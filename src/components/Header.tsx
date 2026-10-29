"use client";

import { usePublicMotion } from "@/hooks/usePublicMotion";

import { useState, useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Instagram } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicDialog } from "@/hooks/usePublicDialog";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { focusPageElement, pageFocusTarget } from "@/lib/page-focus";

const emptySubscribe = () => () => {};

/** 헤더의 열기 버튼과 오버레이 내부 닫기 버튼이 같은 아이콘을 쓰도록 공유 */
function MenuIcon({ isOpen }: { isOpen: boolean }) {
    const { reduced, transitionFor } = usePublicMotion();
    if (reduced) {
        return (
            <svg aria-hidden="true" focusable="false" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d={isOpen ? "M 6 18 L 18 6" : "M 4 6 L 20 6"} />
                {!isOpen && <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M 4 12 L 20 12" />}
                <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d={isOpen ? "M 6 6 L 18 18" : "M 4 18 L 20 18"} />
            </svg>
        );
    }
    return (
        <svg aria-hidden="true" focusable="false" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={isOpen ? "open" : "closed"}
                initial={false}
                variants={{
                    closed: { d: "M 4 6 L 20 6" },
                    open: { d: "M 6 18 L 18 6" }
                }}
                transition={transitionFor({ duration: 0.3, ease: "easeInOut" })}
            />
            <motion.path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                d="M 4 12 L 20 12"
                animate={isOpen ? "open" : "closed"}
                initial={false}
                variants={{
                    closed: { opacity: 1 },
                    open: { opacity: 0 }
                }}
                transition={transitionFor({ duration: 0.3, ease: "easeInOut" })}
            />
            <motion.path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={isOpen ? "open" : "closed"}
                initial={false}
                variants={{
                    closed: { d: "M 4 18 L 20 18" },
                    open: { d: "M 6 6 L 18 18" }
                }}
                transition={transitionFor({ duration: 0.3, ease: "easeInOut" })}
            />
        </svg>
    );
}

export default function Header() {
    const { transitionFor } = usePublicMotion();
    const { instagramUrl } = useSiteSettings();
    const [isScrolled, setIsScrolled] = useState(false);
    // isMenuOpen: 오버레이의 열림/닫힘 "목표 상태" — AnimatePresence가 이 값을 보고
    // 진입/퇴장 애니메이션을 재생한다. 닫을 때는 즉시 false가 된다(0.6초 퇴장
    // 애니메이션이 끝나는 걸 기다리지 않음).
    // isMenuActive: 오버레이가 화면에 "실제로 남아있는 동안"(열려있는 상태 + 퇴장
    // 애니메이션 재생 중) 전부 true — inert·스크롤 잠금·포커스 트랩은 반드시 이
    // 값을 기준으로 유지/해제해야, 퇴장 애니메이션이 재생되는 0.6초 동안 배경이
    // 스크린리더에 노출되거나 포커스가 화면에 안 보이는 곳으로 튀는 걸 막을 수 있다.
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuActive, setIsMenuActive] = useState(false);
    const pathname = usePathname();
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const openTarget = useRef(false);
    const returnToTrigger = useRef(true);
    const pendingNavigation = useRef<{ source: string; destination: URL } | null>(null);
    const closeMenu = useCallback(() => { openTarget.current = false; setIsMenuOpen(false); }, []);
    const restoreMenuFocus = useCallback(() => {
        if (returnToTrigger.current) return true;
        const pending = pendingNavigation.current;
        pendingNavigation.current = null;
        // 같은 페이지의 이동만 여기서 완료한다. 다른 페이지는 새 본문이 준비된 뒤 처리한다.
        if (pending && pending.source === pending.destination.pathname && pending.destination.origin === location.origin && pending.destination.pathname === location.pathname && pending.destination.search === location.search && pending.destination.hash === location.hash) {
            focusPageElement(pageFocusTarget(pending.destination.hash), { reveal: true });
        }
        return false;
    }, []);
    const navigateFromMenu = useCallback((href: string) => {
        pendingNavigation.current = { source: location.pathname, destination: new URL(href, location.href) };
        returnToTrigger.current = false;
        closeMenu();
    }, [closeMenu]);

    // 메뉴 오버레이를 body에 portal로 그리려면 클라이언트 마운트 이후여야 한다
    // (서버 렌더링 중에는 document가 없다) — setState-in-effect 없이 안전하게
    // 판단하기 위해 useSyncExternalStore로 클라이언트 여부를 읽는다
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

    // Determine if the current page should have a dark header text (light background pages)
    const isLightThemePage = pathname.startsWith("/class") || pathname.startsWith("/works") || pathname === "/contact" || pathname.startsWith("/crew");
    const headerTextColor = isLightThemePage ? "text-black" : "text-white mix-blend-difference";

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        const cancelPendingNavigation = () => { pendingNavigation.current = null; };
        // passive: 스크롤 성능 저하 방지 (preventDefault를 쓰지 않으므로 안전)
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("popstate", cancelPendingNavigation);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("popstate", cancelPendingNavigation);
        };
    }, []);

    // 배경 스크롤 잠금은 Preloader·클래스 모달과 공유하는 useBodyScrollLock이
    // 담당한다 (여러 UI가 각자 body.style.overflow를 직접 건드리면, 하나가
    // 끝나면서 다른 하나가 아직 열려 있는 잠금까지 풀어버리는 충돌이 생기기
    // 때문). 본문 inert와 포커스 관리는 클래스 모달과 usePublicDialog로 공유한다.
    // isMenuOpen이 아니라 isMenuActive 기준 — 그래야 퇴장 애니메이션이 재생되는
    // 0.6초 동안에도 배경이 계속 잠겨 있는다. isMenuActive는 onExitComplete가
    // 불릴 때만 false로 내려간다.
    usePublicDialog({ active: isMenuActive, dialogRef: menuRef, triggerRef: toggleButtonRef,
        initialFocus: "a[href]", onClose: closeMenu, restoreFocus: restoreMenuFocus });

    const openMenu = () => {
        openTarget.current = true;
        returnToTrigger.current = true;
        pendingNavigation.current = null;
        setIsMenuActive(true);
        setIsMenuOpen(true);
    };
    // 퇴장 애니메이션이 완전히 끝난 뒤에야 배경 잠금 해제 — isMenuActive를 false로
    // 내리면 위 effect들의 클린업이 실행돼 inert·스크롤 잠금·키다운 리스너가
    // 이 시점에 정리되고, 포커스 복원 effect도 뒤이어 실행된다.
    const handleMenuExitComplete = () => {
        if (openTarget.current) return;
        setIsMenuActive(false);
    };

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? (isLightThemePage ? "bg-white/90 shadow-sm" : "bg-black/90") + " backdrop-blur-md py-4" : "bg-transparent py-6"
                    }`}
            >
                <nav aria-label="메인 내비게이션" className="container mx-auto px-6 lg:px-12 flex justify-between items-center">
                    {/* Logo */}
                    <div className="z-50 relative">
                        <Link href="/" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-sm">
                            <span className={`text-xl min-[360px]:text-2xl font-black uppercase tracking-tighter whitespace-nowrap hover:opacity-80 transition-opacity block ${headerTextColor}`}>
                                WHITE LIGHT STUDIO
                            </span>
                        </Link>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-6 md:gap-8">
                        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={`hidden md:block hover:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm ${isMenuOpen ? "text-white" : headerTextColor}`}>
                            <Instagram strokeWidth={1.5} size={24} />
                        </a>
                        <button
                            type="button"
                            ref={toggleButtonRef}
                            /* w-11 h-11 = 44x44px — WCAG 2.5.8 최소 터치 타겟 충족 */
                            className={`z-50 shrink-0 w-11 h-11 -mr-1 hover:opacity-60 transition-opacity flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm ${isMenuOpen ? "text-white" : headerTextColor}`}
                            onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
                            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={isMenuOpen}
                            aria-controls="main-menu-overlay"
                        >
                            <MenuIcon isOpen={isMenuOpen} />
                        </button>
                    </div>
                </nav>
            </header>

            {/*
              전체화면 메뉴는 body에 직접 portal로 그린다 — <main>과 형제가 되므로,
              메뉴가 열렸을 때 <main>만 inert 처리해도 메뉴 자체는 영향받지 않는다.
              (이전엔 메뉴가 <main> 안에 같이 있어서 <main>에 inert를 걸면 메뉴까지
              막혀버리는 문제가 있었다.) z-[60]으로 기존 헤더(z-50)보다 위에 그려
              배경과 겹치지 않게 하고, 오버레이 안에 브랜드명·Instagram·닫기 버튼을
              그대로 재현해 기존 헤더가 가려져도 화면은 그대로 보이게 한다.
            */}
            {mounted && createPortal(
                <AnimatePresence onExitComplete={handleMenuExitComplete}>
                    {isMenuOpen && (
                        <motion.div data-public-motion
                            ref={menuRef}
                            id="main-menu-overlay"
                            role="dialog"
                            tabIndex={-1}
                            data-lenis-prevent
                            aria-modal="true"
                            aria-label="사이트 메뉴"
                            initial={{ opacity: 0, y: "-100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "-100%" }}
                            transition={transitionFor({ duration: 0.6, ease: [0.76, 0, 0.24, 1] })}
                            className="fixed inset-0 z-[60] bg-black flex flex-col pb-32 px-6 lg:px-24 overflow-y-auto overscroll-contain"
                        >
                            {/* 오버레이 내부에 재현한 헤더 바 — 스크롤해도 상단에 고정 */}
                            <div className="sticky top-0 z-20 -mx-6 lg:-mx-24 px-6 lg:px-24 py-6 bg-black flex justify-between items-center">
                                <Link href="/" onNavigate={() => navigateFromMenu("/")} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-sm">
                                    <span className="text-xl min-[360px]:text-2xl font-black uppercase tracking-tighter whitespace-nowrap hover:opacity-80 transition-opacity block text-white">
                                        WHITE LIGHT STUDIO
                                    </span>
                                </Link>
                                <div className="flex items-center gap-6 md:gap-8">
                                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hidden md:block hover:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm text-white">
                                        <Instagram strokeWidth={1.5} size={24} />
                                    </a>
                                    <button
                                        type="button"
                                        ref={closeButtonRef}
                                        className="z-20 shrink-0 w-11 h-11 -mr-1 hover:opacity-60 transition-opacity flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm text-white"
                                        onClick={closeMenu}
                                        aria-label="메뉴 닫기"
                                        aria-controls="main-menu-overlay"
                                    >
                                        <MenuIcon isOpen={true} />
                                    </button>
                                </div>
                            </div>

                            {/* Top Categories Grid */}
                            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[45%_25%_30%] items-start relative mt-12 md:mt-24 gap-y-12">
                                {/* Connective Line (Desktop Only) */}
                                <div className="hidden md:block absolute top-[16px] md:top-[18px] left-0 w-full border-t-[1px] border-white/40 z-0 pointer-events-none"></div>

                                {/* Category 1 */}
                                <motion.div data-public-motion
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={transitionFor({ delay: 0.3 })}
                                    className="flex flex-col relative z-10 pr-4"
                                >
                                    <div className="mb-10 w-max pr-8 md:pr-10 lg:pr-14 bg-black">
                                        <Link href="/" onNavigate={() => navigateFromMenu("/")}>
                                            <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">WHITE LIGHT STUDIO</h3>
                                        </Link>
                                    </div>
                                    <div className="flex flex-col space-y-5">
                                        <Link href="/#about" onNavigate={() => navigateFromMenu("/#about")} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">ABOUT W.L STUDIO</Link>
                                        <Link href="/contact" onNavigate={() => navigateFromMenu("/contact")} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">CONTACT</Link>
                                    </div>
                                </motion.div>

                                {/* Category 2 */}
                                <motion.div data-public-motion
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={transitionFor({ delay: 0.4 })}
                                    className="flex flex-col relative z-10 w-max"
                                >
                                    <div className="mb-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] pr-10 pl-6 md:pl-10 -ml-6 md:-ml-10 bg-black">
                                        <Link href="/studio" onNavigate={() => navigateFromMenu("/studio")}>
                                            <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">STUDIO</h3>
                                        </Link>
                                    </div>
                                    <div className="flex flex-col space-y-5">
                                        <Link href="/studio#equipment" onNavigate={() => navigateFromMenu("/studio#equipment")} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">EQUIPMENT</Link>
                                        <Link href="/studio#membership" onNavigate={() => navigateFromMenu("/studio#membership")} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">MEMBERSHIP</Link>
                                        <Link href="/studio#spaces" onNavigate={() => navigateFromMenu("/studio#spaces")} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">SPACE</Link>
                                    </div>
                                </motion.div>

                                {/* Right Empty Spacer */}
                                <div className="hidden md:block relative z-10"></div>
                            </div>

                            {/* Bottom Giant Links */}
                            <motion.div data-public-motion
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transitionFor({ delay: 0.6 })}
                                className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[45%_25%_30%] items-center mt-16 md:mt-24 mb-auto relative gap-y-12"
                            >
                                {/* Connective Line (Desktop Only) */}
                                <div className="hidden md:block absolute top-[16px] md:top-[18px] left-0 w-full border-t-[1px] border-white/40 z-0 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="bg-black pr-10 lg:pr-14 w-max">
                                        <Link href="/works" onNavigate={() => navigateFromMenu("/works")} className="flex items-center group cursor-pointer">
                                            <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">WORKS</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="relative z-10 w-max">
                                    <div className="bg-black pr-10 lg:pr-14 pl-6 md:pl-10 -ml-6 md:-ml-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)]">
                                        <Link href="/crew" onNavigate={() => navigateFromMenu("/crew")} className="flex items-center group cursor-pointer">
                                            <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">CREW</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="relative z-10 md:text-right md:-mr-8">
                                    <div className="bg-black pr-10 md:pr-0 md:pl-10 lg:pl-14 w-max md:ml-auto md:text-right">
                                        <Link href="/class" onNavigate={() => navigateFromMenu("/class")} className="flex items-center md:justify-end group cursor-pointer">
                                            <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">CLASS</span>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
