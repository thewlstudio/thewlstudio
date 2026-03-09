"use client";

import { motion } from "motion/react";
import Image from "next/image";
import type { CrewMemberDetail } from "@/types/sanity";

export default function CrewDetailClient({ member }: { member: CrewMemberDetail }) {
    return (
        <div className="relative">
            {/* Hero Profile Section */}
            <section className="pt-40 lg:pt-48 pb-20 px-4 md:px-12 flex flex-col items-center justify-center bg-black text-white relative">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center max-w-4xl text-center relative z-10 w-full"
                >
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden shadow-2xl mb-8 border border-neutral-800 relative group">
                        <Image
                            src={member.imageUrl ?? '/images/placeholder.jpg'}
                            alt={`${member.name} Profile`}
                            fill
                            sizes="(max-width: 768px) 128px, 192px"
                            className="object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
                        />
                    </div>

                    <h2 className="text-xs md:text-sm font-bold tracking-[0.4em] text-neutral-400 uppercase mb-4">{member.role}</h2>
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 flex flex-col items-center">
                        {member.name}
                        <span className="text-base md:text-2xl font-semibold text-neutral-300 mt-3 tracking-widest">{member.koName}</span>
                    </h1>
                </motion.div>
            </section>

            {/* Resume / Profile Content Section */}
            <section className="py-24 px-4 md:px-12 lg:px-24 max-w-[90rem] mx-auto space-y-24">
                {member.sections?.map((section, index) => {
                    const isFirst = index === 0;

                    if (section._type === 'aboutSection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-8 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-center">
                                        <span className="w-[3px] h-6 bg-black mr-4"></span>
                                        ABOUT
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3">
                                    <p className="text-sm md:text-xl text-neutral-600 font-medium leading-relaxed break-keep whitespace-pre-wrap">
                                        {section.text}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    }

                    if (section._type === 'discographySection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-10 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-center">
                                        <span className="w-[3px] h-6 bg-neutral-300 group-hover:bg-black transition-colors mr-4"></span>
                                        DISCOGRAPHY
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3">
                                    <div className="flex flex-col space-y-20">
                                        {section.years?.map((group, idx) => (
                                            <div key={group._key ?? idx} className="flex flex-col md:flex-row gap-4 md:gap-8 group/yearblock items-start">
                                                <div className="w-full md:w-28 shrink-0">
                                                    <h4 className="text-2xl md:text-4xl font-extrabold italic tracking-tight text-neutral-200 group-hover/yearblock:text-black transition-colors duration-500 leading-none -mt-1 md:-mt-1.5">
                                                        {group.year}
                                                    </h4>
                                                </div>
                                                <div className="w-full flex-grow space-y-2">
                                                    {group.tracks?.map((track, i) => (
                                                        <div key={track._key ?? i} className="flex flex-col md:flex-row md:items-end justify-between border-b border-neutral-200/60 pb-4 group/track cursor-default overflow-hidden transition-colors duration-300 hover:border-black">
                                                            <h4 className="text-sm md:text-xl font-bold text-neutral-500 tracking-tight group-hover/track:text-black group-hover/track:translate-x-3 transition-all duration-300 ease-out">{track.title}</h4>
                                                            {track.desc && <span className="text-[10px] md:text-xs font-bold text-neutral-300 uppercase tracking-widest mt-1 md:mt-0 font-mono group-hover/track:text-black transition-colors duration-300 shrink-0">{track.desc}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    }

                    if (section._type === 'careerSection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-10 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-center">
                                        <span className="w-[3px] h-6 bg-neutral-300 group-hover:bg-black transition-colors mr-4"></span>
                                        CAREER
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3 space-y-12">
                                    {section.items?.map((item, idx) => (
                                        <div key={item._key ?? idx} className="relative pl-6 md:pl-8 border-l-[1.5px] border-neutral-200 group/career">
                                            <span className="absolute -left-[3.5px] top-1.5 w-[5px] h-[5px] bg-neutral-300 group-hover/career:bg-black transition-colors"></span>
                                            <h4 className="text-[10px] md:text-sm font-bold text-neutral-400 tracking-widest mb-2 font-mono group-hover/career:text-black transition-colors duration-300">{item.date}</h4>
                                            <h5 className="text-base md:text-xl font-bold text-neutral-600 tracking-tight mb-2 group-hover/career:text-black group-hover/career:translate-x-1.5 transition-all duration-300 ease-out">{item.title}</h5>
                                            {item.desc && <p className="text-neutral-400 font-medium text-xs md:text-base break-keep group-hover/career:text-neutral-500 transition-colors duration-300">{item.desc}</p>}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    }

                    if (section._type === 'awardsAndActivitiesSection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-10 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-stretch">
                                        <span className="w-[3px] self-stretch bg-neutral-300 group-hover:bg-black transition-colors mr-4 py-1"></span>
                                        <span>AWARDS & ACTIVITIES</span>
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                                    {/* Column 1: Awards */}
                                    {section.awards && section.awards.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold tracking-[0.2em] text-neutral-400 uppercase mb-6 pb-2 border-b border-neutral-200">
                                                Awards
                                            </h4>
                                            <ul className="space-y-5 pt-1">
                                                {section.awards.map((item, idx) => (
                                                    <li key={item._key ?? `award-${idx}`} className="flex gap-4 group/list">
                                                        <span className="text-xs font-bold text-neutral-300 font-mono mt-0.5 shrink-0 group-hover/list:text-black transition-colors duration-300">{item.date}</span>
                                                        <span className="text-xs md:text-base font-semibold text-neutral-400 break-words group-hover/list:text-black group-hover/list:translate-x-1 transition-all duration-300 ease-out">{item.title}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Column 2: Activities */}
                                    {section.activities && section.activities.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold tracking-[0.2em] text-neutral-400 uppercase mb-6 pb-2 border-b border-neutral-200">
                                                Activities
                                            </h4>
                                            <ul className="space-y-5 pt-1">
                                                {section.activities.map((item, idx) => (
                                                    <li key={item._key ?? `activity-${idx}`} className="flex gap-4 group/list">
                                                        <span className="text-xs font-bold text-neutral-300 font-mono mt-0.5 shrink-0 group-hover/list:text-black transition-colors duration-300">{item.date}</span>
                                                        <span className="text-xs md:text-base font-semibold text-neutral-400 break-words group-hover/list:text-black group-hover/list:translate-x-1 transition-all duration-300 ease-out">{item.title}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    }

                    if (section._type === 'educationSection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-10 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-center">
                                        <span className="w-[3px] h-6 bg-neutral-300 group-hover:bg-black transition-colors mr-4"></span>
                                        EDUCATION
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3">
                                    <ul className="space-y-6 text-sm md:text-lg text-neutral-400 font-bold tracking-tight">
                                        {section.items?.map((item: string, idx: number) => (
                                            <li key={idx} className="flex items-start group/edu transition-colors duration-300 hover:text-black">
                                                <span className="mt-[0.4rem] mr-5 flex-shrink-0 w-[1.5px] h-4 bg-neutral-300 group-hover/edu:bg-black transition-colors duration-300"></span>
                                                <span className="group-hover/edu:translate-x-1.5 transition-transform duration-300 ease-out">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        );
                    }

                    if (section._type === 'certificationsSection') {
                        return (
                            <motion.div key={section._key || index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`flex flex-col lg:flex-row pb-16 lg:pb-24 group ${!isFirst && 'border-t border-neutral-300 pt-16 lg:pt-24'}`}>
                                <div className="w-full lg:w-1/3 mb-10 lg:mb-0">
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neutral-800 flex items-center">
                                        <span className="w-[3px] h-6 bg-neutral-300 group-hover:bg-black transition-colors mr-4"></span>
                                        CERTIFICATIONS
                                    </h3>
                                </div>
                                <div className="w-full lg:w-2/3 space-y-4">
                                    {section.items?.map((item: string, idx: number) => (
                                        <h4 key={idx} className="flex items-start text-sm md:text-lg font-bold text-neutral-400 hover:text-black transition-colors duration-300 tracking-tight group/cert cursor-default">
                                            <span className="mt-[0.4rem] mr-5 flex-shrink-0 w-[1.5px] h-4 bg-neutral-300 group-hover/cert:bg-black transition-colors duration-300"></span>
                                            <span className="group-hover/cert:translate-x-1.5 transition-transform duration-300 ease-out">{item}</span>
                                        </h4>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    }

                    return null;
                })}
            </section>
        </div>
    );
}
