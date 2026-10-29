"use client";

import { usePublicMotion } from "@/hooks/usePublicMotion";

import { motion, Variants } from "motion/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkRichText from "@/components/WorkRichText";
import Image from "@/components/CmsImage";
import { Play, Pause } from "lucide-react";
import type { AudioBlock, WorkDetail } from "@/types/sanity";
import { externalHttpUrl, instagramProfileUrl, youTubeVideoId } from "@/lib/content-urls";
import { useWorkAudio } from "@/hooks/useWorkAudio";
import { publicDetailPath } from "@/lib/public-routes";

export function AudioPlayerBlock({ block }: { block: AudioBlock }) {
    const source = externalHttpUrl(block.audioUrl) ?? "";
    const { audioRef, isPlaying, isLoading, progress, canSeek, error, togglePlay, handleSeek } = useWorkAudio(source, block.title);
    if (!source) return null;

    return (
        <div role="group" aria-label={`${block.title || '오디오'} 재생기`} className="w-full max-w-sm mx-auto my-16 px-6 flex flex-col items-center justify-center space-y-4">
            <audio ref={audioRef} src={source} preload="metadata" />

            <div className="w-full flex items-center justify-between space-x-5">
                <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "일시정지" : isLoading ? "재생 취소" : "재생"}
                    className="w-12 h-12 flex shrink-0 items-center justify-center bg-black text-white hover:bg-neutral-800 transition-colors"
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <div className="flex-grow flex flex-col overflow-hidden">
                    <span className="text-sm font-bold tracking-widest text-[#222] truncate uppercase">
                        {block.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1 truncate">
                        {block.artist}
                    </span>
                </div>
            </div>

            <div className="w-full relative h-6 mt-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-black">
                <div aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[2px] bg-neutral-200">
                    <div
                        className="absolute top-0 left-0 h-full bg-black transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    disabled={!canSeek}
                    onChange={handleSeek}
                    aria-label="재생 위치"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
            </div>
            {isLoading && <p role="status" className="text-xs text-neutral-500">재생을 준비하고 있어요.</p>}
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>
    );
}

export default function WorkDetailClient({ initialWork }: { initialWork: WorkDetail }) {
    const { reduced, transitionFor } = usePublicMotion();
    const itemVariants: Variants = {
        hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 30 },
        show: { opacity: 1, y: 0, transition: transitionFor({ duration: 0.8 }) },
    };
    const { title, artist, releaseDate, imageUrl, youtubeUrl, instagramId, instagramUrl, contentBlocks } = initialWork;
    const youtubeHref = externalHttpUrl(youtubeUrl);
    const instagramHref = externalHttpUrl(instagramUrl) ?? instagramProfileUrl(instagramId);

    return (
        <main id="main-content" className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans [overflow-wrap:anywhere]">
            <Header />

            <section className="pt-40 pb-0 px-4 flex flex-col items-center justify-center">
                {/* Title Area */}
                <motion.div data-public-motion
                    id="page-title" tabIndex={-1} data-page-path={publicDetailPath('works', initialWork.slug) ?? undefined}
                    role="group" aria-label={`${artist} - ${title}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transitionFor({ duration: 0.8 })}
                    className="text-center mb-8 flex flex-col items-center"
                >
                    <p className="text-sm md:text-3xl font-black uppercase tracking-widest text-[#222]">
                        {artist}
                    </p>
                    {instagramId && (
                        <a href={instagramHref ?? undefined} target={instagramHref ? "_blank" : undefined} rel="noopener noreferrer" className="mt-2 text-xs md:text-sm font-bold text-neutral-500 hover:text-neutral-800 transition-colors tracking-widest">
                            {instagramId}
                        </a>
                    )}
                    <h1 className="text-2xl md:text-5xl font-black mt-4 tracking-tighter text-black break-keep">
                        {title}
                    </h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a data-public-motion
                    href={youtubeHref ?? undefined}
                    aria-label={youtubeHref ? `${title} 영상 보기` : undefined}
                    target={youtubeHref ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={transitionFor({ duration: 1, delay: 0.2 })}
                    className={`group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${!youtubeHref ? 'cursor-default' : ''}`}
                >
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            placeholder={initialWork.lqip ? "blur" : "empty"}
                            blurDataURL={initialWork.lqip || undefined}
                            sizes="(max-width: 768px) 100vw, 400px"
                            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-100" />
                    )}
                    {youtubeHref && (
                        <div aria-hidden="true" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white -translate-x-1/2"></div>
                                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white -translate-y-1/2"></div>
                            </div>
                        </div>
                    )}
                </motion.a>

                {/* Release Info */}
                <motion.div data-public-motion
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={transitionFor({ duration: 1, delay: 0.4 })}
                    className="text-center text-[10px] md:text-sm text-neutral-500 mb-12 font-bold md:font-normal uppercase tracking-widest"
                >
                    <p>Release Date</p>
                    <p>{releaseDate}</p>
                </motion.div>
            </section>

            <motion.div data-public-motion
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={transitionFor({ duration: 1, delay: 0.6 })}
                className="flex flex-col items-center w-full"
            >
                {/* Dynamic Block Builder */}
                {contentBlocks?.map((block, idx) => {
                    switch (block._type) {

                        case 'descriptionBlock':
                            return (
                                <motion.div data-public-motion
                                    key={block._key}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={transitionFor({ duration: 0.8 })}
                                    className="flex flex-col items-center w-full max-w-3xl mb-12 mt-8"
                                >
                                    <div className="w-[1px] h-12 bg-neutral-300 mb-12"></div>
                                    <div className="text-center font-medium leading-relaxed md:leading-loose text-sm md:text-base text-neutral-600 space-y-6 px-4 break-keep w-full">
                                        {block.paragraphs?.map((p: string, i: number) => (
                                            <p key={i}>{p.split(/\n|\\n|\/n/).map((line: string, j: number) => <span key={j}>{line}<br /></span>)}</p>
                                        ))}
                                    </div>
                                    <div className="w-[1px] h-12 md:h-16 bg-neutral-300 mt-12"></div>
                                </motion.div>
                            );

                        case 'tracklistBlock':
                            return (
                                <motion.div data-public-motion
                                    key={block._key}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={transitionFor({ duration: 0.8 })}
                                    className="flex flex-col items-center justify-center space-y-12 text-sm md:text-base w-full max-w-3xl mb-12 px-4 mt-8"
                                >
                                    {block.tracks?.map((track, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <span className="block font-bold text-neutral-900 mb-2 border-b border-neutral-200 pb-2 px-4 tracking-widest text-center">{track.title}</span>
                                            {track.description && (
                                                <p className="text-neutral-500 mt-3 tracking-wide text-center leading-relaxed text-xs md:text-base">
                                                    {track.description.split(/\n|\\n|\/n/).map((line: string, j: number) => <span key={j}>{line}<br /></span>)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            );

                        case 'signatureMessageBlock':
                            return (
                                <motion.div data-public-motion
                                    key={block._key}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={transitionFor({ duration: 0.8, delay: 0.2 })}
                                    className="text-center text-xs md:text-sm text-neutral-500 space-y-8 px-4 break-keep mt-16 md:mt-24 pt-16 border-t border-neutral-200 w-full max-w-2xl mb-12"
                                >
                                    {block.paragraphs?.map((p: string, i: number) => (
                                        <p key={i} className="leading-relaxed md:leading-loose">
                                            {p.split(/\n|\\n|\/n/).map((line: string, j: number) => <span key={j}>{line}<br /></span>)}
                                        </p>
                                    ))}
                                    {block.signature && (
                                        <p className="text-neutral-500 text-[10px] md:text-sm tracking-widest mt-12 mb-4 font-bold">
                                            {block.signature}
                                        </p>
                                    )}
                                </motion.div>
                            );

                        case 'creditGridBlock':
                            return (
                                <section key={block._key} className="bg-white pb-24 pt-8 md:pt-16 w-full mt-8">
                                    <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                                        {block.sections?.map((section, i) => (
                                            <motion.div transition={transitionFor({})} data-public-motion key={i} variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
                                                {section.title && (
                                                    <h2 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                                                        {section.title}
                                                    </h2>
                                                )}
                                                <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                                                    {section.items?.map((item, j) => (
                                                        <li key={j} className={`flex ${!item.role ? 'flex-col' : ''}`}>
                                                            {item.role && (
                                                                <span className="w-40 text-neutral-500 font-bold uppercase tracking-wider text-[10px] pt-0.5 shrink-0">
                                                                    {item.role}
                                                                </span>
                                                            )}
                                                            <div className="flex min-w-0 flex-1 flex-col">
                                                                <span className="text-neutral-800 break-keep">{item.value}</span>
                                                                {item.linkText && item.linkUrl && (
                                                                    <a href={externalHttpUrl(item.linkUrl) ?? undefined} target="_blank" rel="noopener noreferrer" className={`hover:text-neutral-800 transition-colors ${!item.role ? 'mt-1 text-neutral-500' : 'text-neutral-500 ml-1'}`}>
                                                                        {item.linkText}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            );

                        case 'imageBlock':
                            return (
                                <div key={block._key} className="w-full max-w-4xl mx-auto px-6 mb-16 mt-8 flex flex-col items-center">
                                    {block.imageUrl && (
                                        <Image src={block.imageUrl} alt={block.caption || `${title} 관련 이미지 ${idx + 1}`} width={1200} height={800} sizes="(min-width: 896px) 848px, calc(100vw - 48px)" style={{ width: '100%', height: 'auto' }} className="rounded-sm shadow-sm" />
                                    )}
                                    {block.caption && (
                                        <p className="mt-4 text-xs tracking-widest text-neutral-500 text-center">{block.caption}</p>
                                    )}
                                </div>
                            );

                        case 'videoEmbedBlock':
                            const videoId = youTubeVideoId(block.url);
                            if (!videoId) return null;
                            return (
                                <div key={block._key} className="w-full max-w-4xl mx-auto px-6 mb-16 mt-8">
                                    <div className="relative w-full aspect-video shadow-xl">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            title={`${title} 관련 영상 ${idx + 1}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute top-0 left-0 w-full h-full border-0"
                                        ></iframe>
                                    </div>
                                </div>
                            );

                        case 'freeformTextBlock':
                            return block.content ? (
                                <div key={block._key} className="w-full max-w-3xl mx-auto px-6 mb-16 mt-8 text-sm md:text-base text-neutral-700 leading-loose">
                                    <WorkRichText value={block.content} />
                                </div>
                            ) : null;

                        case 'audioBlock':
                            return <AudioPlayerBlock key={block._key} block={block} />;

                        default:
                            return null;
                    }
                })}

                {/* Optional Bottom Spacer */}
                <div className="h-16 md:h-24 w-full"></div>
            </motion.div>

            <Footer />
        </main>
    );
}
