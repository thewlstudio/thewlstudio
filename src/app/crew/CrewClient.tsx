"use client";

import { usePublicMotion } from "@/hooks/usePublicMotion";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "@/components/CmsImage";
import type { CrewMemberSummary } from "@/types/sanity";
import { externalHttpUrl } from "@/lib/content-urls";
import { publicDetailPath } from "@/lib/public-routes";

export default function CrewClient({ members }: { members: CrewMemberSummary[] }) {
    const { transitionFor } = usePublicMotion();
    const publicMembers = members.filter((member) => publicDetailPath("crew", member.slug) !== null);
    return (
        <section className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-[90rem]">
            {/* Section Header */}
            <motion.div data-public-motion
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transitionFor({ duration: 0.8 })}
                className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-black"
            >
                <h1 id="page-title" tabIndex={-1} data-page-path="/crew" className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-black ml-4">
                    OUR CREW
                </h1>
            </motion.div>

            {/* Grid Layout for Crew */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-4 lg:gap-y-16 lg:gap-x-6 mt-8 px-2 md:px-0">
                {publicMembers.length === 0 && (
                    <p className="col-span-full py-20 text-center text-neutral-500">등록된 크루가 없습니다.</p>
                )}
                {publicMembers.map((member, index) => (
                    <motion.div data-public-motion
                        key={member.slug}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={transitionFor({ duration: 0.8, delay: Math.min(index * 0.1, 0.5) })}
                        className="group flex flex-col cursor-pointer"
                    >
                        {/* Default State Name (Above) */}
                        <Link href={publicDetailPath("crew", member.slug)!} className="mb-2 md:mb-3 font-black text-lg md:text-2xl tracking-tighter transition-colors duration-300 group-hover:text-black w-full truncate text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            <h2 className="truncate">{member.name}</h2>
                        </Link>

                        {/* Image Container */}
                        <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden shadow-lg">
                            <Link href={publicDetailPath("crew", member.slug)!} aria-label={`${member.name} 프로필 보기`} className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white" />

                            {member.imageUrl && (
                                <Image
                                    src={member.imageUrl}
                                    alt={member.name}
                                    fill
                                    sizes="(min-width: 1440px) 318px, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
                                    className="object-cover transition-transform duration-700"
                                />
                            )}

                            {/* JYP Style Hover Overlay */}
                            <div aria-hidden="true" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-between p-4 md:p-6 pointer-events-none text-center">
                                <div className="w-full text-right h-6 md:h-8 flex items-start justify-end">
                                    <span className="text-[8px] md:text-[10px] text-white/80 tracking-widest font-bold uppercase w-full truncate text-right">{member.role}</span>
                                </div>

                                <div className="w-full flex flex-col items-center justify-center px-1 md:px-2">
                                    <p className="text-white text-xs md:text-lg lg:text-2xl font-black tracking-tighter uppercase whitespace-nowrap drop-shadow-lg italic text-center w-full">
                                        <u className="underline-offset-[4px] md:underline-offset-[6px] decoration-[1.5px] md:decoration-2">{member.name}</u>
                                    </p>
                                </div>
                                <div aria-hidden="true" className="w-full h-6 md:h-8" />
                            </div>

                            {/* hover가 없는 기기에서도 SNS를 발견할 수 있게 별도 표시한다. */}
                            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 z-20 flex flex-wrap items-center gap-2 md:gap-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    {member.links && member.links.map((link, i) => {
                                        const href = externalHttpUrl(link.url);
                                        if (!href) return null;
                                        const hostname = new URL(href).hostname;
                                        const matches = (domain: string) => hostname === domain || hostname.endsWith(`.${domain}`);
                                        const platform = matches('instagram.com') ? 'Instagram' : matches('youtube.com') || matches('youtu.be') ? 'YouTube' : matches('soundcloud.com') ? 'SoundCloud' : matches('spotify.com') ? 'Spotify' : 'SNS';
                                        return (
                                            <a
                                                key={i}
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${member.name} ${platform}`}
                                                className="relative text-white motion-safe:hover:scale-110 transition-transform flex shrink-0 items-center justify-center w-8 h-8 rounded-sm bg-black/60 pointer-events-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                            >
                                                {/* 아이콘 미등록 시 이미지 대신 플랫폼명 축약 표시 (렌더 크래시 방지) */}
                                                {link.iconUrl ? (
                                                    <span className="relative w-5 h-5 md:w-8 md:h-8"><Image src={link.iconUrl} alt="" fill sizes="32px" className="object-contain" /></span>
                                                ) : (
                                                    <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-tight">
                                                        {platform.slice(0, 2)}
                                                    </span>
                                                )}
                                            </a>
                                        );
                                    })}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
