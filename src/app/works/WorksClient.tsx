"use client";

import { usePublicMotion } from "@/hooks/usePublicMotion";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "@/components/CmsImage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { WorkSummary } from "@/types/sanity";
import { WORKS_PER_PAGE, worksPage, worksPageHref } from "@/lib/works-pagination";
import { publicDetailPath } from "@/lib/public-routes";

export default function WorksClient({ initialWorks, currentPage = 1, query = "" }: { initialWorks: WorkSummary[]; currentPage?: number; query?: string }) {
    const { transitionFor } = usePublicMotion();
    const works = initialWorks.filter((work) => publicDetailPath("works", work.slug) !== null);
    const { page: safePage, totalPages } = worksPage(String(currentPage), works.length);
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    const indexOfFirstItem = (safePage - 1) * WORKS_PER_PAGE;
    const currentItems = works.slice(indexOfFirstItem, indexOfFirstItem + WORKS_PER_PAGE);
    const edgeLink = (page: number, disabled: boolean, label: string, className: string, icon: React.ReactNode) => disabled
        ? <button type="button" disabled aria-label={label} className={className}>{icon}</button>
        : <Link href={worksPageHref(query, page)} scroll={false} onNavigate={scrollToTop} aria-label={label} className={className}>{icon}</Link>;

    // Pagination logic (max 5 pages shown)
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        let startPage = Math.max(1, safePage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <Link
                    key={i}
                    href={worksPageHref(query, i)}
                    scroll={false}
                    onNavigate={(event) => {
                        if (i === safePage) event.preventDefault();
                        scrollToTop();
                    }}
                    aria-label={`${i}페이지`}
                    aria-current={safePage === i ? "page" : undefined}
                    className={`w-11 h-11 shrink-0 flex items-center justify-center transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${safePage === i
                        ? "bg-[#444] text-white"
                        : "hover:text-black text-neutral-500"
                        }`}
                >
                    {i}
                </Link>
            );
        }

        return (
            <nav aria-label="페이지 탐색" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:gap-x-4 mt-32 text-neutral-500 text-sm font-medium">
                <div className="flex items-center gap-1 sm:gap-3">
                    {edgeLink(1, safePage === 1, "첫 페이지", "w-11 h-11 shrink-0 flex items-center justify-center hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black", <ChevronsLeft size={18} strokeWidth={1.5} />)}
                    {edgeLink(Math.max(1, safePage - 1), safePage === 1, "이전 페이지", "w-11 h-11 shrink-0 flex items-center justify-center hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black", <ChevronLeft size={18} strokeWidth={1.5} />)}
                </div>

                {/* DOM·키보드 순서는 이전 → 번호 → 다음으로 유지하고 좁은 화면에서는 줄만 나눈다. */}
                <div className="flex w-full sm:w-auto items-center justify-center gap-1 sm:gap-3">
                    {pages}
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                    {edgeLink(Math.min(totalPages, safePage + 1), safePage === totalPages, "다음 페이지", "w-11 h-11 shrink-0 flex items-center justify-center hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black", <ChevronRight size={18} strokeWidth={1.5} />)}
                    {edgeLink(totalPages, safePage === totalPages, "마지막 페이지", "w-11 h-11 shrink-0 flex items-center justify-center hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black", <ChevronsRight size={18} strokeWidth={1.5} />)}
                </div>
            </nav>
        );
    };

    return (
        <main id="main-content" className="relative bg-[#fafafa] min-h-screen w-full text-black font-sans">
            <Header />

            {/* Top Section */}
            <section className="pt-24 pb-16 md:pt-40 md:pb-32 px-6 flex flex-col items-center justify-center">
                <motion.h1 data-public-motion
                    id="page-title" tabIndex={-1} data-page-path="/works"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transitionFor({ duration: 0.6 })}
                    className="text-2xl md:text-5xl font-black uppercase tracking-widest text-[#111]"
                >
                    WORKS
                </motion.h1>
            </section>

            {/* Grid Album List */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 pb-24">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-16 lg:gap-x-10 lg:gap-y-20">
                    {currentItems.length > 0 ? (
                        currentItems.map((album, index) => (
                            <motion.div data-public-motion
                                key={album.slug}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={transitionFor({ duration: 0.6, delay: Math.min(index * 0.1, 0.5) })}
                                className="flex flex-col items-center text-center group"
                            >
                                {/* Album Cover Link */}
                                <Link href={publicDetailPath("works", album.slug)!} aria-label={`${album.title} - ${album.artist} 작품 보기`} className="relative block w-full aspect-square overflow-hidden mb-5 bg-white border border-neutral-200/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                                    {album.imageUrl ? (
                                        <Image
                                            src={album.imageUrl}
                                            alt={album.title}
                                            fill
                                            placeholder={album.lqip ? "blur" : "empty"}
                                            blurDataURL={album.lqip || undefined}
                                            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-100 transition-transform duration-500 motion-safe:group-hover:scale-105" />
                                    )}
                                    {/* Hover Overlay with + */}
                                    <div aria-hidden="true" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="relative w-10 h-10">
                                            <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-white -translate-x-1/2"></div>
                                            <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-white -translate-y-1/2"></div>
                                        </div>
                                    </div>
                                </Link>

                                {/* Info */}
                                <div className="w-full text-center text-[9px] md:text-[12px] text-neutral-500 uppercase tracking-widest mb-1 md:mb-1.5 font-bold md:font-semibold truncate">
                                    {album.artist} | {album.releaseDate}
                                </div>
                                <h2 className="w-full text-center text-xs md:text-lg lg:text-xl font-bold text-[#111] group-hover:text-neutral-600 transition-colors truncate break-keep">
                                    {album.title}
                                </h2>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-neutral-500">
                            등록된 작업물이 없습니다.
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {renderPagination()}
            </section>

            {/* Scroll To Top Fixed Button */}
            <button
                onClick={scrollToTop}
                aria-label="맨 위로 이동"
                className="fixed bottom-10 right-10 hidden md:flex flex-col items-center justify-center text-neutral-500 hover:text-black transition-colors z-50 text-[11px] font-bold tracking-widest"
            >
                <ChevronUp size={24} strokeWidth={1.5} className="mb-1" />
                TOP
            </button>

            <Footer />
        </main>
    );
}
