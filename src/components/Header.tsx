"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Instagram } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);

    // Determine if the current page should have a dark header text (light background pages)
    const isLightThemePage = pathname.startsWith("/class") || pathname.startsWith("/works") || pathname === "/contact" || pathname.startsWith("/crew");
    const headerTextColor = isLightThemePage ? "text-black" : "text-white mix-blend-difference";

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        // passive: 스크롤 성능 저하 방지 (preventDefault를 쓰지 않으므로 안전)
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isMenuOpen]);

    // 접근성: 전체화면 메뉴에 Escape 닫기 + 포커스 트랩 + 포커스 복원
    useEffect(() => {
        if (!isMenuOpen) return;

        const focusables = () =>
            Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ) ?? []
            );

        // 메뉴가 열리면 첫 링크로 포커스 이동
        requestAnimationFrame(() => focusables()[0]?.focus());

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsMenuOpen(false);
                return;
            }
            if (e.key !== "Tab") return;

            const items = focusables();
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        // cleanup 시점에는 ref가 바뀔 수 있으므로 effect 내부에서 값을 캡처해 둔다
        const triggerButton = toggleButtonRef.current;

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            // 메뉴를 닫으면 열었던 버튼으로 포커스 복원
            requestAnimationFrame(() => triggerButton?.focus());
        };
    }, [isMenuOpen]);

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
                            <span className={`text-2xl font-black uppercase tracking-tighter whitespace-nowrap hover:opacity-80 transition-opacity block ${headerTextColor}`}>
                                WHITE LIGHT STUDIO
                            </span>
                        </Link>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center space-x-6 md:space-x-8">
                        <a href="https://www.instagram.com/wl_musicstudio/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={`hidden md:block hover:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm ${isMenuOpen ? "text-white" : headerTextColor}`}>
                            <Instagram strokeWidth={1.5} size={24} />
                        </a>
                        <button
                            ref={toggleButtonRef}
                            /* w-11 h-11 = 44x44px — WCAG 2.5.8 최소 터치 타겟 충족 */
                            className={`z-50 w-11 h-11 -mr-1 hover:opacity-60 transition-opacity flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm ${isMenuOpen ? "text-white" : headerTextColor}`}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={isMenuOpen}
                            aria-controls="main-menu-overlay"
                        >
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <motion.path
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    animate={isMenuOpen ? "open" : "closed"}
                                    initial={false}
                                    variants={{
                                        closed: { d: "M 4 6 L 20 6" },
                                        open: { d: "M 6 18 L 18 6" }
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                />
                                <motion.path
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    d="M 4 12 L 20 12"
                                    animate={isMenuOpen ? "open" : "closed"}
                                    initial={false}
                                    variants={{
                                        closed: { opacity: 1 },
                                        open: { opacity: 0 }
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                />
                                <motion.path
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    animate={isMenuOpen ? "open" : "closed"}
                                    initial={false}
                                    variants={{
                                        closed: { d: "M 4 18 L 20 18" },
                                        open: { d: "M 6 6 L 18 18" }
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                />
                            </svg>
                        </button>
                    </div>
                </nav>
            </header>

            {/* Full Screen Menu overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        id="main-menu-overlay"
                        role="dialog"
                        aria-modal="true"
                        aria-label="사이트 메뉴"
                        initial={{ opacity: 0, y: "-100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "-100%" }}
                        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                        className="fixed inset-0 z-40 bg-black flex flex-col pt-40 pb-32 px-6 lg:px-24 overflow-y-auto"
                    >
                        {/* Top Categories Grid */}
                        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[45%_25%_30%] items-start relative mt-12 md:mt-24 gap-y-12">
                            {/* Connective Line (Desktop Only) */}
                            <div className="hidden md:block absolute top-[16px] md:top-[18px] left-0 w-full border-t-[1px] border-white/40 z-0 pointer-events-none"></div>

                            {/* Category 1 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="flex flex-col relative z-10 pr-4"
                            >
                                <div className="mb-10 w-max pr-8 md:pr-10 lg:pr-14 bg-black">
                                    <Link href="/" onClick={() => setIsMenuOpen(false)}>
                                        <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">WHITE LIGHT STUDIO</h3>
                                    </Link>
                                </div>
                                <div className="flex flex-col space-y-5">
                                    <Link href="/#about" onClick={() => setIsMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">ABOUT W.L STUDIO</Link>
                                    <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">CONTACT</Link>
                                </div>
                            </motion.div>

                            {/* Category 2 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                className="flex flex-col relative z-10 w-max"
                            >
                                <div className="mb-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] pr-10 pl-6 md:pl-10 -ml-6 md:-ml-10 bg-black">
                                    <Link href="/studio" onClick={() => setIsMenuOpen(false)}>
                                        <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">STUDIO</h3>
                                    </Link>
                                </div>
                                <div className="flex flex-col space-y-5">
                                    <Link href="/studio#equipment" onClick={() => setIsMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">EQUIPMENT</Link>
                                    <Link href="/studio#membership" onClick={() => setIsMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">MEMBERSHIP</Link>
                                    <Link href="/studio#spaces" onClick={() => setIsMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">SPACE</Link>
                                </div>
                            </motion.div>

                            {/* Right Empty Spacer */}
                            <div className="hidden md:block relative z-10"></div>
                        </div>

                        {/* Bottom Giant Links */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                            className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[45%_25%_30%] items-center mt-16 md:mt-24 mb-auto relative gap-y-12"
                        >
                            {/* Connective Line (Desktop Only) */}
                            <div className="hidden md:block absolute top-[16px] md:top-[18px] left-0 w-full border-t-[1px] border-white/40 z-0 pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="bg-black pr-10 lg:pr-14 w-max">
                                    <Link href="/works" onClick={() => setIsMenuOpen(false)} className="flex items-center group cursor-pointer">
                                        <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">WORKS</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="relative z-10 w-max">
                                <div className="bg-black pr-10 lg:pr-14 pl-6 md:pl-10 -ml-6 md:-ml-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)]">
                                    <Link href="/crew" onClick={() => setIsMenuOpen(false)} className="flex items-center group cursor-pointer">
                                        <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">CREW</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="relative z-10 md:text-right md:-mr-8">
                                <div className="bg-black pr-10 md:pr-0 md:pl-10 lg:pl-14 w-max md:ml-auto md:text-right">
                                    <Link href="/class" onClick={() => setIsMenuOpen(false)} className="flex items-center md:justify-end group cursor-pointer">
                                        <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">CLASS</span>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
