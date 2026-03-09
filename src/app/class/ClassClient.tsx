"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { urlFor } from "@/sanity/lib/image";
import { NAVER_MAP_URL } from "@/lib/constants";

type SanityImage = {
    _type: "image";
    asset: { _type: "reference"; _ref: string };
    hotspot?: object;
    crop?: object;
};

export type Instructor = {
    _id: string;
    id: string;
    category: string;
    instructorName: string;
    image: SanityImage;
    imagePosition?: string;
    modalImage?: SanityImage;
    bgImage: SanityImage;
    bgScale?: string;
    bgPosition?: string;
    subtitle: string;
    lessonInfo: string;
    about: string[];
    process: string[];
    portfolioUrl?: string;
    portfolioText?: string;
    portfolioBtn?: string;
};

export default function ClassClient({ initialInstructors }: { initialInstructors: Instructor[] }) {
    const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const closeModal = useCallback(() => setSelectedInstructor(null), []);

    // Lock body scroll + ESC key to close
    useEffect(() => {
        if (selectedInstructor) {
            document.body.style.overflow = "hidden";
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") closeModal();
            };
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = "unset";
                document.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [selectedInstructor, closeModal]);

    return (
        <main id="main-content" className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            {/* Hero / Curriculum Section */}
            <section className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-black"
                >
                    <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter ml-4">
                        MUSIC CLASS
                    </h1>
                    <p className="text-neutral-500 font-medium tracking-widest mt-4 ml-4">배움을 넘어, 당신의 음악을 완성하는 과정</p>
                </motion.div>

                {/* Curriculum Details (Editorial / Brutalist Aesthetic) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mb-32 md:mb-48 relative text-black"
                >
                    <div className="mb-10 lg:mb-12 border-b border-black/10 pb-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end md:justify-between">
                        <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-black break-keep">CURRICULUM</h2>
                        <p className="mt-4 md:mt-0 text-neutral-600 font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase">Contact for Info</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0 px-4 md:px-8 mt-8 pb-4">
                        {/* 1:1 Classes */}
                        <div className="md:pr-12 md:border-r border-black/10">
                            <h4 className="flex items-center text-black font-bold mb-6 tracking-[0.2em] text-base uppercase">
                                1:1 Private Class
                            </h4>
                            <ul className="text-neutral-800 space-y-5 font-semibold text-sm md:text-base pl-5 border-l border-black/10">
                                <li>작사, 작곡, 편곡</li>
                                <li>통기타, 일렉기타</li>
                                <li>클래식 피아노 & 실용음악 피아노</li>
                                <li>플룻</li>
                                <li>로직 프로그램</li>
                            </ul>
                        </div>

                        {/* Group Classes */}
                        <div className="md:pl-16">
                            <h4 className="inline-flex items-center text-black font-bold mb-6 tracking-[0.2em] text-base uppercase">
                                Group Class
                                <span className="font-sans text-neutral-400 normal-case tracking-normal ml-3 font-medium text-xs">(2-5인)</span>
                            </h4>
                            <ul className="text-neutral-800 space-y-5 font-semibold text-sm md:text-base pl-5 border-l border-black/10">
                                <li>통기타 기초 단체수업</li>
                                <li>싱어송라이터 & 단체수업</li>
                                <li>보컬 수업 & 단체수업</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Instructors List Header */}
                <div className="mb-0 border-b border-black/10 pb-4 md:pb-6 px-4 md:px-8">
                    <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-black">Instructors</h2>
                </div>

                {/* Editorial List Layout for Classes */}
                <ul className="flex flex-col">
                    {initialInstructors.length === 0 ? (
                        <div className="py-20 text-center text-neutral-400">
                            등록된 클래스 강사가 없습니다. (Sanity 관리자 페이지에서 추가해주세요)
                        </div>
                    ) : (
                        initialInstructors.map((cls, index) => (
                            <motion.li
                                key={cls._id || index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group border-b border-black/10 cursor-pointer relative overflow-hidden bg-white hover:bg-neutral-50 transition-colors duration-700 list-none"
                                onClick={() => setSelectedInstructor(cls)}
                            >
                                {/* Atmospheric Background Image (Right side - Using Instructor's Photo) */}
                                <div
                                    className="absolute top-0 right-0 w-full md:w-2/3 h-full z-0 opacity-15 group-hover:opacity-30 transition-opacity duration-1000 pointer-events-none overflow-hidden"
                                    style={{ WebkitMaskImage: 'linear-gradient(to left, black 20%, transparent 80%)', maskImage: 'linear-gradient(to left, black 20%, transparent 80%)' }}
                                >
                                    {cls.bgImage && (
                                        <Image
                                            src={urlFor(cls.bgImage).url()}
                                            alt=""
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover object-right-bottom filter grayscale mix-blend-multiply"
                                        />
                                    )}
                                </div>

                                <div className="py-8 md:py-12 px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between relative z-10 w-full">

                                    {/* Left Content */}
                                    <div className="flex flex-col md:flex-row items-center md:items-center w-full relative text-center md:text-left">
                                        <div
                                            className="w-32 sm:w-40 md:w-28 aspect-[3/4] rounded-sm overflow-hidden bg-neutral-100 flex-shrink-0 relative group cursor-pointer border-[3px] border-white shadow-md z-20 mb-6 md:mb-0 md:mr-10"
                                        >
                                            {cls.image && (
                                                <Image
                                                    src={urlFor(cls.image).url()}
                                                    alt={cls.instructorName}
                                                    fill
                                                    className={`object-cover ${cls.imagePosition || 'object-center'} filter grayscale group-hover:grayscale-0 transition-all duration-700 mix-blend-multiply`}
                                                    sizes="160px"
                                                />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col flex-grow z-10 relative md:ml-0 md:items-start items-center">
                                            <div className="flex flex-col md:flex-row md:items-baseline mb-1 md:mb-2">
                                                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter md:mr-6 group-hover:text-black text-neutral-800 transition-colors uppercase">
                                                    {cls.category}
                                                </h3>
                                            </div>
                                            <p className="text-neutral-600 font-semibold text-sm md:text-lg tracking-wide">
                                                Inst. {cls.instructorName}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 md:translate-y-0 md:top-auto md:relative opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 hidden md:block text-neutral-400">
                                            <span className="text-4xl font-light">→</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.li>
                        ))
                    )}
                </ul>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="mt-32 text-center"
                >
                    <a href={NAVER_MAP_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-12 py-4 bg-black text-white font-bold tracking-widest text-sm hover:bg-neutral-800 transition-colors uppercase">
                        레슨 문의 ↗
                    </a>
                </motion.div>
            </section>

            <Footer />

            {/* Instructor Detail Modal (AnimatePresence) */}
            <AnimatePresence>
                {selectedInstructor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedInstructor(null)}
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label={selectedInstructor.instructorName}
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl shadow-2xl relative flex flex-col"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedInstructor(null)}
                                className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-20 w-10 h-10 bg-neutral-100 hover:bg-black text-neutral-500 hover:text-white rounded-full flex items-center justify-center transition-colors"
                                aria-label="Close modal"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Modal Layout - Split View */}
                            <div className="flex flex-col lg:flex-row w-full min-h-[60vh] lg:min-h-[70vh]">

                                {/* Left: Typography & Info (White Region) */}
                                <div className="w-full lg:w-3/5 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-between order-2 lg:order-1">
                                    <div>
                                        {/* Header */}
                                        <div className="mb-10 sm:mb-12">
                                            <h2 className="text-[10px] sm:text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4 sm:mb-6 flex items-center">
                                                <span className="w-6 sm:w-8 h-px bg-neutral-300 mr-3 sm:mr-4"></span>
                                                {selectedInstructor.category}
                                            </h2>
                                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-black mb-6 sm:mb-8 leading-[1.2] break-keep">
                                                {selectedInstructor.subtitle?.split(', ').map((line, i, arr) => (
                                                    <span key={i}>
                                                        {line}
                                                        {i < arr.length - 1 && <>,<br className="md:hidden lg:block lg:pb-1" /> </>}
                                                    </span>
                                                ))}
                                            </h1>
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                                                <p className="text-lg sm:text-xl md:text-2xl font-black tracking-widest text-neutral-800">
                                                    Inst. {selectedInstructor.instructorName?.split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>

                                        {/* About */}
                                        <div className="mb-10 sm:mb-12">
                                            <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-black mb-4 sm:mb-5 border-l-[3px] border-black pl-3 flex items-center h-4">
                                                ABOUT LESSON
                                            </h3>
                                            <div className="space-y-4">
                                                {selectedInstructor.about?.map((p, i) => (
                                                    <p key={i} className="text-sm sm:text-[15px] md:text-base text-neutral-700 font-light leading-relaxed break-keep font-pretendard">
                                                        {p}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Process */}
                                        <div className="mb-8 lg:mb-0">
                                            <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-black mb-4 sm:mb-5 border-l-[3px] border-black pl-3 flex items-center h-4">
                                                PROCESS
                                            </h3>
                                            <div className="space-y-5 sm:space-y-6">
                                                {selectedInstructor.process?.map((step, i) => (
                                                    <div key={i} className="flex gap-3 sm:gap-5">
                                                        <div className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</div>
                                                        <p className="text-sm sm:text-[15px] md:text-base text-neutral-700 font-light leading-relaxed font-pretendard break-keep">
                                                            {step}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Media & CTA (Gray Region) */}
                                <div className="w-full lg:w-2/5 bg-neutral-50 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col items-center border-b lg:border-b-0 lg:border-l border-black/5 order-1 lg:order-2">

                                    {/* Portrait */}
                                    <div className="w-40 h-56 sm:w-48 sm:h-64 md:w-56 md:h-72 bg-white rounded-sm overflow-hidden shadow-2xl border-[6px] border-white mb-8 sm:mb-10 shrink-0 relative mt-6 lg:mt-0">
                                        {(selectedInstructor.modalImage || selectedInstructor.image) && (
                                            <Image
                                                src={urlFor(selectedInstructor.modalImage || selectedInstructor.image).url()}
                                                alt={selectedInstructor.instructorName}
                                                fill
                                                className="object-cover object-top mix-blend-multiply"
                                                sizes="224px"
                                            />
                                        )}
                                    </div>

                                    {/* Portfolio */}
                                    <div className="text-center mb-8 sm:mb-12 w-full flex-grow flex flex-col items-center justify-center">
                                        <h4 className="text-sm sm:text-base font-black tracking-[0.2em] uppercase text-black mb-3">
                                            Instructor&apos;s Works
                                        </h4>
                                        <p className="whitespace-pre-line text-neutral-500 text-[11px] sm:text-xs mb-6 sm:mb-8 break-keep leading-relaxed max-w-xs">
                                            {selectedInstructor.portfolioText?.replace(/\\n/g, '\n')}
                                        </p>
                                        {selectedInstructor.portfolioUrl && (
                                            <a
                                                href={selectedInstructor.portfolioUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 text-[10px] sm:text-xs border border-black text-black font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors uppercase group"
                                            >
                                                {selectedInstructor.portfolioBtn || "작업물 보기"}
                                                <span className="ml-2 sm:ml-3 group-hover:translate-x-1 transition-transform">↗</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* CTA Bottom Button */}
                                    <div className="w-full pt-6 sm:pt-8 border-t border-black/10 mt-auto">
                                        <a
                                            href={NAVER_MAP_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full px-6 sm:px-8 py-4 sm:py-5 bg-black text-white font-bold tracking-[0.2em] text-[10px] sm:text-xs hover:bg-neutral-800 transition-colors uppercase text-center"
                                        >
                                            수강 안내 및 신청 ↗
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
