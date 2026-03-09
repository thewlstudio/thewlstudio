"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { WorkSummary } from "@/types/sanity";

const ITEMS_PER_PAGE = 12;

export default function WorksClient({ initialWorks }: { initialWorks: WorkSummary[] }) {
    const [currentPage, setCurrentPage] = useState(1);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalPages = Math.max(1, Math.ceil(initialWorks.length / ITEMS_PER_PAGE));

    // Get current items
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = initialWorks.slice(indexOfFirstItem, indexOfLastItem);

    // Pagination logic (max 5 pages shown)
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        let startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => {
                        setCurrentPage(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-label={`${i}페이지`}
                    className={`w-8 h-8 flex items-center justify-center transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${currentPage === i
                        ? "bg-[#444] text-white"
                        : "hover:text-black text-neutral-400"
                        }`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex items-center justify-center gap-3 md:gap-4 mt-32 text-neutral-400 text-sm font-medium">
                <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="첫 페이지"
                    className="hover:text-black transition-colors p-1 disabled:opacity-30 disabled:hover:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    <ChevronsLeft size={18} strokeWidth={1.5} />
                </button>
                <button
                    onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    aria-label="이전 페이지"
                    className="hover:text-black transition-colors p-1 md:mr-4 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronLeft size={18} strokeWidth={1.5} />
                </button>

                {pages}

                <button
                    onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="다음 페이지"
                    className="hover:text-black transition-colors p-1 md:ml-4 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronRight size={18} strokeWidth={1.5} />
                </button>
                <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="마지막 페이지"
                    className="hover:text-black transition-colors p-1 disabled:opacity-30 disabled:hover:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    <ChevronsRight size={18} strokeWidth={1.5} />
                </button>
            </div>
        );
    };

    return (
        <main id="main-content" className="relative bg-[#fafafa] min-h-screen w-full text-black font-sans">
            <Header />

            {/* Top Section */}
            <section className="pt-24 pb-16 md:pt-40 md:pb-32 px-6 flex flex-col items-center justify-center">
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
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
                            <motion.div
                                key={album.slug}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="flex flex-col items-center text-center group"
                            >
                                {/* Album Cover Link */}
                                <Link href={`/works/${album.slug}`} className="relative block w-full aspect-square overflow-hidden mb-5 bg-white border border-neutral-200/60">
                                    {album.imageUrl ? (
                                        <Image
                                            src={album.imageUrl}
                                            alt={album.title}
                                            fill
                                            placeholder={album.lqip ? "blur" : "empty"}
                                            blurDataURL={album.lqip || undefined}
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-100 transition-transform duration-500 group-hover:scale-105" />
                                    )}
                                    {/* Hover Overlay with + */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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
                                <h3 className="w-full text-center text-xs md:text-lg lg:text-xl font-bold text-[#111] group-hover:text-neutral-600 transition-colors truncate break-keep">
                                    {album.title}
                                </h3>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-neutral-400">
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
                className="fixed bottom-10 right-10 hidden md:flex flex-col items-center justify-center text-neutral-400 hover:text-black transition-colors z-50 text-[11px] font-bold tracking-widest"
            >
                <ChevronUp size={24} strokeWidth={1.5} className="mb-1" />
                TOP
            </button>

            <Footer />
        </main>
    );
}
