"use client";

import { useState, useRef, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PortableText } from "next-sanity";
import Image from "next/image";
import { Play, Pause } from "lucide-react";

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 }
    }
};

function AudioPlayerBlock({ block }: { block: any }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (!audio.duration) return;
            const currentProgress = (audio.currentTime / audio.duration) * 100;
            setProgress(currentProgress);

            const timeLeft = audio.duration - audio.currentTime;
            if (timeLeft <= 5 && timeLeft > 0) {
                audio.volume = Math.max(0, timeLeft / 5);
            } else if (timeLeft > 5) {
                audio.volume = 1;
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            if (audio) {
                audio.currentTime = 0;
                audio.volume = 1;
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const newTime = (Number(e.target.value) / 100) * (audioRef.current.duration || 0);
        audioRef.current.currentTime = newTime;
        setProgress(Number(e.target.value));
    };

    if (!block.audioUrl) return null;

    return (
        <div className="w-full max-w-sm mx-auto my-16 px-6 flex flex-col items-center justify-center space-y-4">
            <audio ref={audioRef} src={block.audioUrl} preload="metadata" />

            <div className="w-full flex items-center justify-between space-x-5">
                <button
                    onClick={togglePlay}
                    className="w-12 h-12 flex shrink-0 items-center justify-center bg-black text-white hover:bg-neutral-800 transition-colors"
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <div className="flex-grow flex flex-col overflow-hidden">
                    <span className="text-sm font-bold tracking-widest text-[#222] truncate uppercase">
                        {block.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1 truncate">
                        {block.artist}
                    </span>
                </div>
            </div>

            <div className="w-full relative h-[2px] bg-neutral-200 mt-2">
                <div
                    className="absolute top-0 left-0 h-full bg-black transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
        </div>
    );
}

export default function WorkDetailClient({ initialWork }: { initialWork: any }) {
    const { title, artist, releaseDate, imageUrl, youtubeUrl, instagramId, instagramUrl, contentBlocks } = initialWork;

    // Helper to get formatted video ID
    const getYouTubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            <section className="pt-40 pb-0 px-4 flex flex-col items-center justify-center">
                {/* Title Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-8 flex flex-col items-center"
                >
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest text-[#222]">
                        {artist}
                    </h2>
                    {instagramId && (
                        <a href={instagramUrl || `https://instagram.com/${instagramId.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs md:text-sm font-bold text-neutral-400 hover:text-neutral-800 transition-colors tracking-widest">
                            {instagramId}
                        </a>
                    )}
                    <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tighter text-black break-keep">
                        {title}
                    </h1>
                </motion.div>

                {/* Album Artwork */}
                <motion.a
                    href={youtubeUrl || "#"}
                    target={youtubeUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`group relative block w-full max-w-sm aspect-square shadow-2xl overflow-hidden mb-6 ${!youtubeUrl ? 'cursor-default' : ''}`}
                >
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {youtubeUrl && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white -translate-x-1/2"></div>
                                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white -translate-y-1/2"></div>
                            </div>
                        </div>
                    )}
                </motion.a>

                {/* Release Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-center text-xs md:text-sm text-neutral-500 mb-12"
                >
                    <p>Release Date</p>
                    <p>{releaseDate}</p>
                </motion.div>
            </section>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="flex flex-col items-center w-full"
            >
                {/* Dynamic Block Builder */}
                {contentBlocks?.map((block: any, idx: number) => {
                    switch (block._type) {

                        case 'descriptionBlock':
                            return (
                                <div key={block._key} className="flex flex-col items-center w-full max-w-3xl mb-12">
                                    <div className="w-[1px] h-12 bg-neutral-300 mb-12"></div>
                                    <div className="text-center font-medium leading-relaxed md:leading-loose text-sm md:text-base text-neutral-600 space-y-6 px-4 break-keep w-full">
                                        {block.paragraphs?.map((p: string, i: number) => (
                                            <p key={i}>{p.split('\\n').map((line, j) => <span key={j}>{line}<br /></span>)}</p>
                                        ))}
                                    </div>
                                    <div className="w-[1px] h-12 md:h-16 bg-neutral-300 mt-12"></div>
                                </div>
                            );

                        case 'tracklistBlock':
                            return (
                                <div key={block._key} className="flex flex-col items-center justify-center space-y-12 text-sm md:text-base w-full max-w-3xl mb-12 px-4 mt-8">
                                    {block.tracks?.map((track: any, i: number) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <span className="block font-bold text-neutral-900 mb-2 border-b border-neutral-200 pb-2 px-4 tracking-widest text-center">{track.title}</span>
                                            {track.description && (
                                                <p className="text-neutral-500 mt-3 tracking-wide text-center leading-relaxed">
                                                    {track.description.split('\\n').map((line: string, j: number) => <span key={j}>{line}<br /></span>)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );

                        case 'signatureMessageBlock':
                            return (
                                <div key={block._key} className="text-center text-xs md:text-sm text-neutral-500 space-y-8 px-4 break-keep mt-24 pt-16 border-t border-neutral-200 w-full max-w-2xl mb-12">
                                    {block.paragraphs?.map((p: string, i: number) => (
                                        <p key={i} className="leading-relaxed md:leading-loose">
                                            {p.split('\\n').map((line: string, j: number) => <span key={j}>{line}<br /></span>)}
                                        </p>
                                    ))}
                                    {block.signature && (
                                        <p className="text-neutral-400 text-[10px] md:text-sm tracking-widest mt-12 mb-4 font-bold">
                                            {block.signature}
                                        </p>
                                    )}
                                </div>
                            );

                        case 'creditGridBlock':
                            return (
                                <section key={block._key} className="bg-white pb-24 pt-8 md:pt-16 w-full mt-8">
                                    <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                                        {block.sections?.map((section: any, i: number) => (
                                            <motion.div key={i} variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
                                                {section.title && (
                                                    <h4 className="text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider">
                                                        {section.title}
                                                    </h4>
                                                )}
                                                <ul className="space-y-2 text-xs md:text-[13px] leading-relaxed">
                                                    {section.items?.map((item: any, j: number) => (
                                                        <li key={j} className={`flex ${!item.role ? 'flex-col' : ''}`}>
                                                            {item.role && (
                                                                <span className="w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5 shrink-0">
                                                                    {item.role}
                                                                </span>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-neutral-800 break-keep">{item.value}</span>
                                                                {item.linkText && item.linkUrl && (
                                                                    <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className={`hover:text-neutral-800 transition-colors ${!item.role ? 'mt-1 text-neutral-400' : 'text-neutral-400 ml-1'}`}>
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
                                        <Image src={block.imageUrl} alt={block.caption || "Works Image"} width={1200} height={800} style={{ width: '100%', height: 'auto' }} className="rounded-sm shadow-sm" />
                                    )}
                                    {block.caption && (
                                        <p className="mt-4 text-xs tracking-widest text-neutral-400 text-center">{block.caption}</p>
                                    )}
                                </div>
                            );

                        case 'videoEmbedBlock':
                            const videoId = getYouTubeId(block.url);
                            if (!videoId) return null;
                            return (
                                <div key={block._key} className="w-full max-w-4xl mx-auto px-6 mb-16 mt-8">
                                    <div className="relative w-full aspect-video shadow-xl">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute top-0 left-0 w-full h-full"
                                        ></iframe>
                                    </div>
                                </div>
                            );

                        case 'freeformTextBlock':
                            return (
                                <div key={block._key} className="w-full max-w-3xl mx-auto px-6 mb-16 mt-8 text-sm md:text-base text-neutral-700 leading-loose">
                                    <PortableText value={block.content} />
                                </div>
                            );

                        case 'audioBlock':
                            return <AudioPlayerBlock key={block._key} block={block} />;

                        default:
                            return null;
                    }
                })}

                <div className="w-[1px] h-20 md:h-28 bg-neutral-300 mt-12 mb-12"></div>
            </motion.div>

            <Footer />
        </main>
    );
}
