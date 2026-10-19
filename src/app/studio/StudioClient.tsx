"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import Lines from "@/components/Lines";
import type { StudioSpaceData } from "@/lib/studio-spaces";
import type { StudioInfo } from "@/lib/studio-info";

// ─────────────────────────────────────────────────────────────────────────────
// RoomCarousel — single-image carousel with ‹ › navigation
// ─────────────────────────────────────────────────────────────────────────────

function RoomCarousel({
    images,
    roomName,
}: {
    images: string[];
    roomName: string;
}) {
    const [current, setCurrent] = useState(0);
    if (images.length === 0) return null;
    const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
    const next = () => setCurrent((c) => (c + 1) % images.length);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
    };

    return (
        <div className="space-y-3" onKeyDown={handleKeyDown} tabIndex={0} role="region" aria-label={`${roomName} 사진 캐러셀`}>
            {/* Photo frame — aspect ratio container */}
            <div className="relative aspect-[4/3]">
                <div className="relative h-full overflow-hidden shadow-xl">
                    <Image
                        src={images[current]}
                        alt={`${roomName} ${current + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                </div>

                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            aria-label="이전 사진"
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center shadow transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={next}
                            aria-label="다음 사진"
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center shadow transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Photo counter */}
                        <div className="absolute bottom-2 right-3 z-20 text-[10px] font-bold text-white/70 tracking-widest tabular-nums select-none">
                            {current + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>

            {/* Dot indicators */}
            {images.length > 1 && (
                <div className="flex justify-center gap-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`rounded-full transition-all duration-300 ${i === current
                                ? "w-4 h-1.5 bg-black"
                                : "w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-400"
                                }`}
                            aria-label={`사진 ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RoomBlock — full room card: gallery left | info right
// Height is determined by the info column — the gallery stretches to match.
// ─────────────────────────────────────────────────────────────────────────────

function RoomBlock({ room }: { room: StudioSpaceData }) {
    // Parse "W.L Studio [B Room]" → brand: "W.L STUDIO", title: "B ROOM"
    const match = room.name.match(/^(.*?)\s*\[(.+)\]$/);
    const brand = (match ? match[1] : "").toUpperCase();
    const title = (match ? match[2] : room.name).toUpperCase();

    return (
        <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
            className="flex flex-col border-l-2 border-black pl-6 lg:pl-12"
        >
            {/* Top Section: Title */}
            <div className="border-b-2 border-black/10 pb-5 mb-8">
                <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                    {brand}
                </p>
                <h3 className="text-4xl md:text-5xl font-black tracking-tighter">{title}</h3>
            </div>

            {/* Bottom Section: Gallery & Pricing left | Info right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
                {/* Left Column: Photo carousel */}
                <RoomCarousel images={room.images} roomName={room.name} />

                {/* Right: Info (Pricing + Features) */}
                <div className="flex flex-col h-full">
                    {/* Pricing */}
                    <div className="flex flex-col gap-3 mb-8">
                        {room.prices.map((p, i) => (
                            <div key={i} className="flex items-baseline justify-between border-b border-black/[0.06] pb-3">
                                <span className="text-neutral-500 font-bold tracking-widest uppercase text-xs">
                                    {p.label}
                                </span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl md:text-3xl font-black tracking-tight text-black">
                                        {p.value}
                                    </span>
                                    <span className="text-xs font-semibold text-neutral-500">{p.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="flex-1">
                        <h4 className="text-[10px] font-bold tracking-[0.25em] text-neutral-500 uppercase mb-4 mt-2 lg:mt-0">
                            Equipment &amp; Features
                        </h4>
                        <ul className="space-y-2.5">
                            {room.features.map((feature, i) => (
                                <li
                                    key={i}
                                    className="text-neutral-700 font-medium flex items-start text-sm leading-relaxed break-keep"
                                >
                                    <span className="mr-3 text-neutral-500 mt-0.5 shrink-0 select-none">—</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Notes */}
                    {room.notes && room.notes.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-neutral-200">
                            {room.notes.map((note, i) => (
                                <p
                                    key={i}
                                    className="text-xs font-semibold text-[#b86060] leading-relaxed break-keep"
                                >
                                    {note}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StudioClient({ rooms, lobby, info }: { rooms: StudioSpaceData[]; lobby: StudioSpaceData | null; info: StudioInfo }) {
    const { naverReservationUrl, blogUrl } = useSiteSettings();
    return (
        <main id="main-content" className="relative bg-black min-h-screen w-full overflow-hidden text-white font-sans">
            <Header />

            {/* ── Hero ── */}
            <section className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    <Image
                        src="/images/lobby_1.jpg"
                        alt="Studio Space"
                        fill
                        className="object-cover grayscale"
                        sizes="100vw"
                        priority
                    />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="relative z-10 text-center"
                >
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                        STUDIO
                    </h1>
                    <p className="text-sm md:text-base text-neutral-400 tracking-widest uppercase">
                        Recording • Mixing • Mastering • Outsourcing
                    </p>
                </motion.div>
            </section>

            {/* ── Services ── */}
            <section className="py-32 bg-black border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8">
                    {info.services.map((svc, i) => (
                        <motion.div
                            key={`${svc.title}-${i}`}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.2 }}
                            className="flex flex-col border-l border-white/20 pl-8"
                        >
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">{svc.title}</h2>
                            <h3 className={`text-2xl font-light text-neutral-400 mb-8 font-mono`}>
                                {svc.price}
                                {svc.priceUnit && (
                                    <>
                                        {" "}
                                        <span className="text-sm">{svc.priceUnit}</span>
                                    </>
                                )}
                            </h3>
                            <ul className="text-neutral-400 space-y-4 text-sm md:text-base font-light leading-relaxed">
                                {svc.points.map((pt, j) => (
                                    <li key={j}>{`• ${pt}`}</li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── Equipment ── */}
            <section id="equipment" className="py-32 bg-white text-black border-b border-black/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16 md:mb-24"
                    >
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">EQUIPMENT</h2>
                    </motion.div>

                    <div className="space-y-12 md:space-y-16 text-sm md:text-base">
                        {info.equipment.map((group, i) => (
                            <div
                                key={`${group.title}-${i}`}
                                className={`grid grid-cols-1 md:grid-cols-4 pb-8 md:pb-12 items-start ${i < info.equipment.length - 1 ? "border-b border-black/10" : ""}`}
                            >
                                <h3 className="font-bold uppercase tracking-widest text-neutral-500 mb-4 md:mb-0">
                                    <Lines text={group.title} />
                                </h3>
                                <div className="col-span-1 md:col-span-3 space-y-3 font-medium text-base md:text-lg">
                                    {group.items.map((item, j) => (
                                        <p key={j}>{item}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Membership ── */}
            <section id="membership" className="py-32 bg-black text-white relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-neutral-900/50 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-sm font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4">
                            Exclusive Benefits
                        </h2>
                        <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">MEMBERSHIP</h3>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                        {info.memberships.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center hover:border-white/30 transition-colors h-full"
                            >
                                <span className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center font-black text-xl mb-6">
                                    {item.num}
                                </span>
                                <h4 className="text-2xl font-bold tracking-tight mb-2">{item.label}</h4>
                                <p className="text-neutral-500 font-medium mb-12 uppercase tracking-widest text-xs">
                                    {item.sub}
                                </p>
                                <div className="mt-auto">
                                    <p className="text-3xl font-black tracking-tighter">
                                        {item.price}
                                        <span className="text-base font-semibold text-neutral-500 ml-1.5 font-sans">원</span>
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mt-20 text-center"
                    >
                        <p className="text-neutral-400 font-medium text-sm md:text-base leading-relaxed mb-8 max-w-xl mx-auto break-keep">
                            <Lines text={info.membershipNote} />
                        </p>
                        <a
                            href={naverReservationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-10 py-4 bg-white text-black font-bold tracking-[0.2em] uppercase text-xs md:text-sm rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            멤버십 가입하기
                        </a>
                    </motion.div>
                </div>
            </section>
            {/* ── Spaces ── */}
            <section id="spaces" className="py-32 bg-neutral-50 text-black border-t border-black/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:gap-8"
                    >
                        <div>
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-center md:text-left">
                                SPACES
                            </h2>
                            <p className="mt-3 text-xs text-neutral-400 tracking-widest uppercase hidden md:block">
                                Hover over any photo to explore in detail
                            </p>
                        </div>
                        <a
                            href={naverReservationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 md:px-8 py-3 md:py-4 bg-black text-white font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs rounded-full border border-black hover:bg-transparent hover:text-black transition-colors shrink-0"
                        >
                            SPACE 공간 예약
                        </a>
                    </motion.div>

                    {/* Room cards — separated by space; each has a left vertical accent */}
                    <div className="flex flex-col space-y-16 md:space-y-20">
                        {rooms.map((room, i) => (
                            <RoomBlock key={`${room.name}-${i}`} room={room} />
                        ))}

                        {/* ── Lobby Block ── */}
                        {lobby && (
                        <motion.div
                            initial={{ opacity: 0, y: 32 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                            className="flex flex-col border-l-2 border-black pl-6 lg:pl-12"
                        >
                            {/* Top Section: Title */}
                            <div className="border-b-2 border-black/10 pb-5 mb-8">
                                {lobby.subtitle && (
                                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-400 uppercase mb-1.5">
                                        {lobby.subtitle}
                                    </p>
                                )}
                                <h3 className="text-4xl md:text-5xl font-black tracking-tighter leading-snug">
                                    {lobby.name}
                                </h3>
                            </div>

                            {/* Bottom Section: Carousel & Pricing | Info */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
                                {/* Left Column: Carousel */}
                                <div className="flex flex-col gap-6">
                                    <RoomCarousel images={lobby.images} roomName="Lobby" />
                                </div>

                                {/* Right: Info (Pricing + Features) */}
                                <div className="flex flex-col h-full">
                                    {/* Pricing */}
                                    <div className="flex flex-col gap-3 mb-6">
                                        {lobby.prices.map((p, i) => (
                                            <div key={i} className="flex items-baseline justify-between border-b border-black/[0.06] pb-3">
                                                <span className="font-bold tracking-widest uppercase text-xs text-neutral-400">
                                                    {p.label}
                                                </span>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl md:text-3xl font-black tracking-tight text-black">
                                                        {p.value}
                                                    </span>
                                                    <span className="text-xs font-semibold text-neutral-400">{p.unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {lobby.description && (
                                    <p className="text-sm leading-relaxed text-neutral-500 mb-8 font-light italic border-l-2 border-black/20 pl-4 mt-2 lg:mt-0">
                                            &quot;{lobby.description}&quot;
                                        </p>
                                    )}

                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-bold tracking-[0.25em] text-neutral-400 uppercase mb-4">
                                            Space Rules &amp; Features
                                        </h4>
                                        <ul className="space-y-2.5">
                                            {lobby.features.map((feature, i) => (
                                                <li
                                                    key={i}
                                                    className="text-neutral-700 font-medium flex items-start text-sm leading-relaxed break-keep"
                                                >
                                                    <span className="mr-3 text-neutral-300 mt-0.5 shrink-0 select-none">
                                                        —
                                                    </span>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {lobby.notes && lobby.notes.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-neutral-200">
                                            {lobby.notes.map((note, i) => (
                                                <p
                                                    key={i}
                                                    className="text-xs font-semibold text-[#b86060] leading-relaxed break-keep"
                                                >
                                                    {note}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Guidelines ── */}
            <section className="py-32 bg-white text-black border-t border-black/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12 space-y-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center md:text-left border-b-2 border-black pb-12"
                    >
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                            GUIDELINES & AMENITIES
                        </h2>
                        <p className="mt-8 text-neutral-600 md:text-lg font-medium leading-relaxed break-keep max-w-4xl">
                            <Lines text={info.guidelinesIntro} />
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm md:text-base pt-6"
                    >
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-500 border-b border-black/10 pb-2">
                                Parking
                            </h3>
                            <div className="font-medium space-y-2">
                                <p className="text-[#b86060] font-bold">{info.parkingWarning}</p>
                                <p className="text-sm text-neutral-600">
                                    <Lines text={info.parkingDetail} always />
                                </p>
                                <p className="text-neutral-500 font-mono text-xs pt-1 flex items-center gap-2">
                                    <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-500 font-sans tracking-widest leading-none">
                                        {info.parkingFeeLabel}
                                    </span>
                                    <span>{info.parkingFee}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-500 border-b border-black/10 pb-2">
                                Amenities
                            </h3>
                            <div className="font-medium space-y-2 text-neutral-600">
                                {info.amenities.map((a, i) => (
                                    <p key={i}>{a}</p>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-500 border-b border-black/10 pb-2">
                                Security & Duty
                            </h3>
                            <div className="font-medium space-y-4">
                                <div>
                                    <p className="text-[#b86060] text-xs font-bold mb-1 flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#b86060] mr-1.5 animate-pulse" />
                                        {info.cctvTitle}
                                    </p>
                                    <p className="text-neutral-500 text-[11px] md:text-xs break-keep leading-relaxed">
                                        {info.cctvDetail}
                                    </p>
                                </div>
                                <div className="border-t border-dashed border-black/10 pt-4">
                                    <p className="text-xs break-keep text-neutral-600">
                                        {info.dutyText}
                                    </p>
                                    <p className="text-xs text-[#b86060] mt-1.5 font-bold">{info.dutyWarning}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-32 bg-black text-center px-4">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tighter">READY TO RECORD?</h2>
                <a
                    href="/contact"
                    className="inline-block px-12 py-4 border border-white text-white font-bold tracking-widest hover:bg-white hover:text-black transition-colors uppercase text-sm mb-16"
                >
                    Contact Us
                </a>

                <div className="pt-16 border-t border-white/10 max-w-4xl mx-auto flex flex-col items-center">
                    <p className="text-neutral-500 text-sm md:text-base mb-6 font-medium break-keep">
                        음악 제작 팁부터 스튜디오 비하인드까지, 화이트 라이트 스튜디오의 이야기를 만나보세요.
                    </p>
                    <a
                        href={blogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-neutral-400 font-bold uppercase tracking-widest text-sm inline-flex items-center gap-2 transition-colors border-b border-transparent hover:border-neutral-400 pb-1"
                    >
                        Read Our Educational Blog
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                        </svg>
                    </a>
                </div>
            </section>

            <Footer />
        </main>
    );
}
