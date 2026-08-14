"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Instagram } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const emptySubscribe = () => () => {};

/** 헤더의 열기 버튼과 오버레이 내부 닫기 버튼이 같은 아이콘을 쓰도록 공유 */
function MenuIcon({ isOpen }: { isOpen: boolean }) {
    return (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                transition={{ duration: 0.3, ease: "easeInOut" }}
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
                transition={{ duration: 0.3, ease: "easeInOut" }}
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
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
        </svg>
    );
}

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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
        // passive: 스크롤 성능 저하 방지 (preventDefault를 쓰지 않으므로 안전)
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 메뉴가 열려 있는 동안: 배경 스크롤 잠금 + 페이지 본문을 inert 처리.
    // inert는 포커스·클릭·스크린리더 가상 커서 접근을 한 번에 막아준다 — 메뉴가
    // portal로 body에 별도로 그려지므로, 본문(<main id="main-content">)과
    // 본문 바로가기 링크만 꺼두면 메뉴 자체는 영향받지 않는다.
    // ⚠️ 순서 중요: 이 effect가 아래 keydown/포커스 effect보다 먼저 선언돼 있어야
    // 한다 — React는 여러 effect의 클린업을 선언 순서대로 실행하므로, 메뉴를 닫을 때
    // "inert 해제(이 effect)"가 "토글 버튼으로 포커스 복원(아래 effect)"보다 먼저
    // 실행되는 게 보장된다. 순서가 바뀌면 아직 inert 상태인 버튼에 포커스를 시도해
    // 복원이 실패할 수 있다.
    useEffect(() => {
        const mainEl = document.getElementById("main-content");
        const skipLink = document.getElementById("skip-link");
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
            mainEl?.setAttribute("inert", "");
            skipLink?.setAttribute("inert", "");
        } else {
            document.body.style.overflow = "unset";
            mainEl?.removeAttribute("inert");
            skipLink?.removeAttribute("inert");
        }
        return () => {
            document.body.style.overflow = "unset";
            mainEl?.removeAttribute("inert");
            skipLink?.removeAttribute("inert");
        };
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

        // 메뉴가 열리면 첫 링크로 포커스 이동 (오버레이 안의 닫기 버튼이 아니라
        // 실제 내비게이션 링크부터 — 기존 동작과 동일하게 유지)
        requestAnimationFrame(() => {
            const firstLink = menuRef.current?.querySelector<HTMLElement>('a[href]');
            firstLink?.focus();
        });

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
            // 메뉴를 닫으면 열었던 버튼으로 포커스 복원 (위 effect가 먼저 inert를
            // 해제해 두므로 이 시점엔 버튼이 다시 포커스 가능한 상태다)
            requestAnimationFrame(() => triggerButton?.focus());
        };
    }, [isMenuOpen]);

    const closeMenu = () => setIsMenuOpen(false);

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
                            className="fixed inset-0 z-[60] bg-black flex flex-col pb-32 px-6 lg:px-24 overflow-y-auto"
                        >
                            {/* 오버레이 내부에 재현한 헤더 바 — 스크롤해도 상단에 고정 */}
                            <div className="sticky top-0 z-20 -mx-6 lg:-mx-24 px-6 lg:px-24 py-6 bg-black flex justify-between items-center">
                                <Link href="/" onClick={closeMenu} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-sm">
                                    <span className="text-2xl font-black uppercase tracking-tighter whitespace-nowrap hover:opacity-80 transition-opacity block text-white">
                                        WHITE LIGHT STUDIO
                                    </span>
                                </Link>
                                <div className="flex items-center space-x-6 md:space-x-8">
                                    <a href="https://www.instagram.com/wl_musicstudio/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hidden md:block hover:opacity-60 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm text-white">
                                        <Instagram strokeWidth={1.5} size={24} />
                                    </a>
                                    <button
                                        ref={closeButtonRef}
                                        className="z-20 w-11 h-11 -mr-1 hover:opacity-60 transition-opacity flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm text-white"
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
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                    className="flex flex-col relative z-10 pr-4"
                                >
                                    <div className="mb-10 w-max pr-8 md:pr-10 lg:pr-14 bg-black">
                                        <Link href="/" onClick={closeMenu}>
                                            <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">WHITE LIGHT STUDIO</h3>
                                        </Link>
                                    </div>
                                    <div className="flex flex-col space-y-5">
                                        <Link href="/#about" onClick={closeMenu} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">ABOUT W.L STUDIO</Link>
                                        <Link href="/contact" onClick={closeMenu} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">CONTACT</Link>
                                    </div>
                                </motion.div>

                                {/* Category 2 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                    className="flex flex-col relative z-10 w-max"
                                >
                                    <div className="mb-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] pr-10 pl-6 md:pl-10 -ml-6 md:-ml-10 bg-black">
                                        <Link href="/studio" onClick={closeMenu}>
                                            <h3 className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors">STUDIO</h3>
                                        </Link>
                                    </div>
                                    <div className="flex flex-col space-y-5">
                                        <Link href="/studio#equipment" onClick={closeMenu} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">EQUIPMENT</Link>
                                        <Link href="/studio#membership" onClick={closeMenu} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">MEMBERSHIP</Link>
                                        <Link href="/studio#spaces" onClick={closeMenu} className="text-neutral-400 hover:text-white transition-colors text-[15px] font-medium tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm uppercase">SPACE</Link>
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
                                        <Link href="/works" onClick={closeMenu} className="flex items-center group cursor-pointer">
                                            <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">WORKS</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="relative z-10 w-max">
                                    <div className="bg-black pr-10 lg:pr-14 pl-6 md:pl-10 -ml-6 md:-ml-10 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)]">
                                        <Link href="/crew" onClick={closeMenu} className="flex items-center group cursor-pointer">
                                            <span className="text-xl md:text-2xl font-bold text-white group-hover:text-neutral-400 transition-colors uppercase tracking-widest whitespace-nowrap">CREW</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="relative z-10 md:text-right md:-mr-8">
                                    <div className="bg-black pr-10 md:pr-0 md:pl-10 lg:pl-14 w-max md:ml-auto md:text-right">
                                        <Link href="/class" onClick={closeMenu} className="flex items-center md:justify-end group cursor-pointer">
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
