"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const ALBUMS = [
    {
        id: "letter",
        title: "글(Letter)",
        artist: "한동규",
        date: "2026. 02. 25.",
        image: "/images/letter_warobaru.jpg",
        link: "/works/letter"
    },
    {
        id: "firstletter",
        title: "First Letter",
        artist: "양민서",
        date: "2026. 02. 24.",
        image: "/images/firstlove_yangminseo03.jpg",
        link: "/works/firstletter"
    },
    {
        id: "folkfolio",
        title: "오빠야 강변살자",
        artist: "포크폴리오(Folk-Folio)",
        date: "2025. 09. 19.",
        image: "/images/folkfolio_1.png",
        link: "/works/folkfolio"
    },
    {
        id: "dawn",
        title: "새벽의 틈",
        artist: "슬",
        date: "2025. 11. 20.",
        image: "/images/dawn_seul.png",
        link: "/works/dawn"
    },
    {
        id: "mask",
        title: "가면",
        artist: "김희준",
        date: "2025. 11. 14.",
        image: "/images/Mask_HeeJun.jpg",
        link: "/works/mask"
    },
    {
        id: "never-forgot-you",
        title: "계절이 물든다 해서 그대를 잊은 적 없다",
        artist: "백광흠",
        date: "2025. 08. 08.",
        image: "/images/I Never Forgot You, Even as the Seasons Changed_bkh.jpg",
        link: "/works/never-forgot-you"
    },
    {
        id: "with-you",
        title: "사랑의 형태",
        artist: "n@di",
        date: "2024. 05. 21.",
        image: "/images/With you_n@di.jpg",
        link: "/works/with-you"
    },
    {
        id: "haze",
        title: "아지랑이",
        artist: "백광흠",
        date: "2023. 10. 06.",
        image: "/images/haze_bkh.jpg",
        link: "/works/haze"
    }
];

// Parse "YYYY. MM. DD." format into a Date for reliable sorting
const parseAlbumDate = (dateStr: string): Date => {
    const parts = dateStr.replace(/\./g, "").trim().split(/\s+/);
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

// Sort ALBUMS by date descending (latest first)
const SORTED_ALBUMS = [...ALBUMS].sort(
    (a, b) => parseAlbumDate(b.date).getTime() - parseAlbumDate(a.date).getTime()
);

const ITEMS_PER_PAGE = 12;

export default function WorksIndexPage() {
    const [currentPage, setCurrentPage] = useState(1);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalPages = Math.ceil(SORTED_ALBUMS.length / ITEMS_PER_PAGE);

    // Get current items
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = SORTED_ALBUMS.slice(indexOfFirstItem, indexOfLastItem);

    // Pagination logic (max 5 pages shown)
    const renderPagination = () => {
        if (totalPages <= 1) return null; // Hide pagination if 1 page or less

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
                    className={`w-8 h-8 flex items-center justify-center transition-colors rounded-full ${currentPage === i
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
                    className="hover:text-black transition-colors p-1 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronsLeft size={18} strokeWidth={1.5} />
                </button>
                <button
                    onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="hover:text-black transition-colors p-1 md:mr-4 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronLeft size={18} strokeWidth={1.5} />
                </button>

                {pages}

                <button
                    onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="hover:text-black transition-colors p-1 md:ml-4 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronRight size={18} strokeWidth={1.5} />
                </button>
                <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hover:text-black transition-colors p-1 disabled:opacity-30 disabled:hover:text-neutral-400"
                >
                    <ChevronsRight size={18} strokeWidth={1.5} />
                </button>
            </div>
        );
    };

    return (
        <main className="relative bg-[#fafafa] min-h-screen w-full text-black font-sans">
            <Header />

            {/* Top Section */}
            <section className="pt-40 pb-32 px-6 flex flex-col items-center justify-center">
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl md:text-5xl font-black uppercase tracking-widest text-[#111]"
                >
                    WORKS
                </motion.h1>
            </section>

            {/* Grid Album List */}
            <section className="max-w-7xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16 lg:gap-x-10 lg:gap-y-20">
                    {currentItems.map((album, index) => (
                        <motion.div
                            key={album.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="flex flex-col items-center text-center group"
                        >
                            {/* Album Cover Link */}
                            <Link href={album.link} className="relative block w-full aspect-square overflow-hidden mb-5 bg-white border border-neutral-200/60">
                                <Image
                                    src={album.image}
                                    alt={album.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                                {/* Hover Overlay with + */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-white -translate-x-1/2"></div>
                                        <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-white -translate-y-1/2"></div>
                                    </div>
                                </div>
                            </Link>

                            {/* Info */}
                            <div className="text-[12px] text-neutral-500 uppercase tracking-wide mb-1.5 font-semibold">
                                {album.artist} | {album.date}
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-[#111] group-hover:text-neutral-600 transition-colors">
                                {album.title}
                            </h3>
                        </motion.div>
                    ))}
                </div>

                {/* Pagination */}
                {renderPagination()}
            </section>

            {/* Scroll To Top Fixed Button */}
            <button
                onClick={scrollToTop}
                className="fixed bottom-10 right-10 hidden md:flex flex-col items-center justify-center text-neutral-400 hover:text-black transition-colors z-50 text-[11px] font-bold tracking-widest"
            >
                <ChevronUp size={24} strokeWidth={1.5} className="mb-1" />
                TOP
            </button>

            <Footer />
        </main>
    );
}
