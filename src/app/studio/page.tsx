"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NAVER_MAP_URL } from "@/lib/constants";

const ROOM_A = {
    name: "W.L Studio [A Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "삼익 업라이트 피아노 su-121",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커",
        "문 커튼"
    ],
    notes: [
        "* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다."
    ],
    images: [
        "/images/room_a_3.jpg",
        "/images/room_a_2.jpg",
        "/images/room_a_1.jpg"
    ]
};

const ROOM_B = {
    name: "W.L Studio [B Room]",
    prices: [
        { label: "기본", value: "5,000", unit: "원 / 1H" },
        { label: "회원", value: "2,000", unit: "원 / 1H" },
    ],
    features: [
        "야마하 P - 115",
        "공기청정기",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공",
        "유튜브 및 영상 작업에 용이한 조명 설치 완료",
        "블루투스 스피커",
        "문 커튼"
    ],
    notes: [
        "* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"
    ],
    images: [
        "/images/room_b_3.jpg",
        "/images/room_b_2.jpg",
        "/images/room_b_1.jpg"
    ]
};

const ROOM_C = {
    name: "W.L Studio [C Room]",
    prices: [
        { label: "기본", value: "7,000", unit: "원 / 1H" },
        { label: "회원", value: "4,000", unit: "원 / 1H" },
    ],
    features: [
        "SAMICK UPRIGHT PIANO (삼익 업라이트 피아노)",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "데스크 비치",
        "1~3명까지 수용 가능",
        "냉방과 온풍 가능한 방"
    ],
    notes: [
        "* 방음문 : C룸은 들어갈때 기준으로 비밀번호 입력 후 문을 아래로 내려주시고 두번째 문은 열때 올려주시면 됩니다. 닫을 때는 문을 꾹 밀어주시고 반대로 해주시면 됩니다."
    ],
    images: [
        "/images/room_c_2.jpg",
        "/images/room_c_3.jpg"
    ]
};

const ROOM_D = {
    name: "W.L Studio [D Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "업라이트피아노",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커"
    ],
    notes: [
        "* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"
    ],
    images: [
        "/images/room_d_1.jpg",
        "/images/room_d_2.jpg",
        "/images/room_d_3.jpg"
    ]
};

const LOBBY = {
    name: "Study Together, 함께 성장하는 공간",
    subtitle: "로비 & 1인 데스크",
    prices: [
        { label: "이용 금액", value: "1,000", unit: "원 / 1H" }
    ],
    description: "저는 사람이 같이 있을 때 시너지가 난다고 생각합니다. 혼자 공부하거나, 뭔가를 계획하려고 할 때, 집에서는 늘어지고 카페에서는 제한된 시간이 아쉽다고 생각한적이 많아서 준비하게 되었어요. 공부를 하시는 분들, 사업 계획서나 개인 업무를 준비하는 분들, 각자 자신만의 목표를 이루고 싶은 분들이 편하게 오셔서 몰입할 수 있는 공간을 만들고 싶었습니다. 시간에 얽매이지 않고, 원하는 때 집중할 수 있는 환경이 되길 바라며 이곳을 준비했습니다.",
    features: [
        "24시간 연중무휴 운영",
        "로비데스크 & 중앙 로비 1인 데스크 & 소파 이용 가능",
        "음식 주문 가능 (음식물 관련 규정은 추후 조정 예정)",
        "모든 이용객에게 커피 & 티 제공 (셀프 서비스)"
    ],
    notes: [
        "* 스터디 집중을 위해 서로 방해되지 않도록 조용한 분위기 유지",
        "* 개별 음악 연습방 이용 불가",
        "* 원활한 운영을 위해 예약 후 노쇼(No-Show) 금지"
    ],
    images: [
        "/images/lobby_1.jpg",
        "/images/lobby_2.jpg"
    ]
};

type RoomData = {
    name: string;
    prices: { label: string; value: string; unit: string }[];
    features: string[];
    notes?: string[];
    images: string[];
};

// "W.L Studio [A Room]" → { prefix: "W.L Studio", room: "A Room" }
function parseRoomName(name: string) {
    const match = name.match(/^(.+?)\s*\[(.+)\]$/);
    if (match) return { prefix: match[1].toUpperCase(), room: match[2].toUpperCase() };
    return { prefix: name.toUpperCase(), room: null };
}

const ROOMS: RoomData[] = [ROOM_A, ROOM_B, ROOM_C, ROOM_D];

function RoomBlock({ room }: { room: RoomData }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 border-b border-black/10 lg:items-start"
        >
            {/* Image — fixed height, lowered for editorial balance */}
            <div className="h-[56vw] md:h-[380px] lg:h-[480px] lg:pt-24 overflow-hidden">
                <ImageSlider images={room.images} roomName={room.name} />
            </div>

            {/* Info */}
            <div className="px-8 py-10 md:px-12 md:py-14 lg:px-16 lg:py-16 flex flex-col justify-center">
                {(() => {
                    const { prefix, room: roomLabel } = parseRoomName(room.name); return (
                        <div className="border-b border-black/10 pb-5 mb-7">
                            <p className="text-[10px] font-bold tracking-[0.3em] text-neutral-500 mb-1.5">{prefix}</p>
                            <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-black">{roomLabel ?? room.name}</h3>
                        </div>
                    );
                })()}

                <div className="mb-8 space-y-3">
                    {room.prices.map((p, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-black/10 pb-3">
                            <span className="text-neutral-500 font-bold tracking-widest uppercase text-sm">{p.label}</span>
                            <div className="flex items-baseline space-x-1.5">
                                <span className="text-xl md:text-2xl font-bold tracking-tight text-black">{p.value}</span>
                                <span className="text-sm font-semibold tracking-wide text-neutral-400">{p.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-1">
                    <h4 className="text-[10px] font-bold tracking-[0.3em] text-neutral-500 uppercase mb-4">Equipment & Features</h4>
                    <ul className="space-y-3">
                        {room.features.map((feature, i) => (
                            <li key={i} className="text-neutral-600 font-medium flex items-start gap-3 text-sm leading-relaxed break-keep">
                                <span className="mt-[0.55em] shrink-0 w-4 h-px bg-neutral-300 inline-block"></span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {room.notes && room.notes.length > 0 && (
                    <div className="mt-8 pt-5 border-t border-black/10">
                        {room.notes.map((note, i) => (
                            <p key={i} className="text-xs font-medium text-[#c96b6b] leading-relaxed break-keep">
                                {note}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ImageSlider({ images, roomName }: { images: string[]; roomName: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="relative h-full w-full overflow-hidden bg-black group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <Image
                        src={images[currentIndex]}
                        alt={`${roomName} - 사진 ${currentIndex + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                </motion.div>
            </AnimatePresence>
            {images.length > 1 && (
                <>
                    <button onClick={prev} aria-label="이전 사진" className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button onClick={next} aria-label="다음 사진" className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </>
            )}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-2.5 z-20">
                {images.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`h-px transition-all duration-300 ${i === currentIndex ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/70 w-4'}`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function StudioPage() {
    return (
        <main className="relative bg-black min-h-screen w-full overflow-hidden text-white font-sans">
            <Header />

            {/* Hero Image Section */}
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

            {/* Pricing split view (Spaces & Services) */}
            <section className="py-32 bg-black border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8">

                    {/* Recording Block */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col border-l border-white/20 pl-8"
                    >
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">VOCAL RECORDING</h2>
                        <h3 className="text-2xl font-light text-neutral-400 mb-8 font-mono">100,000 KRW <span className="text-sm">/ 2 Hours</span></h3>

                        <ul className="text-neutral-400 space-y-4 text-sm md:text-base font-light leading-relaxed">
                            <li>• 최상의 컨디션을 위한 쾌적한 레코딩 환경</li>
                            <li>• 최고급 컨덴서 마이크 및 아웃보드 사용</li>
                            <li>• 디렉팅 및 기초적인 튠 포함</li>
                        </ul>
                    </motion.div>

                    {/* Outsourcing Block */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex flex-col border-l border-white/20 pl-8"
                    >
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">AUDIO OUTSOURCING</h2>
                        <h3 className="text-2xl font-light text-neutral-400 mb-8 font-mono">Contact for Quote</h3>

                        <ul className="text-neutral-400 space-y-4 text-sm md:text-base font-light leading-relaxed">
                            <li>• 보컬 에디팅 (튠, 타이밍 박자 보정)</li>
                            <li>• 믹싱 (Mixing)</li>
                            <li>• 마스터링 (Mastering)</li>
                            <li>• 팟캐스트 및 유튜브 음향 보정</li>
                        </ul>
                    </motion.div>

                </div>
            </section>

            {/* Gear List */}
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
                        <div className="grid grid-cols-1 md:grid-cols-4 border-b border-black/10 pb-8 md:pb-12 items-start">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 mb-4 md:mb-0">Microphones</h3>
                            <div className="col-span-1 md:col-span-3 space-y-3 font-medium text-base md:text-lg">
                                <p>Neumann U87 Ai</p>
                                <p>AKG C414 XLII</p>
                                <p>Shure SM7B</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 border-b border-black/10 pb-8 md:pb-12 items-start">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 mb-4 md:mb-0">Outboard &<br className="hidden md:block" /> Interface</h3>
                            <div className="col-span-1 md:col-span-3 space-y-3 font-medium text-base md:text-lg">
                                <p>Universal Audio Apollo x8</p>
                                <p>Rupert Neve Designs Shelford Channel</p>
                                <p>Tube-Tech CL 1B</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 pb-8 md:pb-12 items-start">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 mb-4 md:mb-0">Monitoring</h3>
                            <div className="col-span-1 md:col-span-3 space-y-3 font-medium text-base md:text-lg">
                                <p>Focal Trio6 Be</p>
                                <p>Yamaha NS-10M Studio</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Membership Details */}
            <section id="membership" className="py-32 bg-black text-white relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-neutral-900/50 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-sm font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4">Exclusive Benefits</h2>
                        <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">MEMBERSHIP</h3>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                        {/* 1 Month */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center hover:border-white/30 transition-colors h-full"
                        >
                            <span className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center font-black text-xl mb-6">1</span>
                            <h4 className="text-2xl font-bold tracking-tight mb-2">1개월 회원권</h4>
                            <p className="text-neutral-500 font-medium mb-12 uppercase tracking-widest text-xs">1 Month Pass</p>
                            <div className="mt-auto">
                                <p className="text-3xl font-black tracking-tighter">40,000<span className="text-base font-semibold text-neutral-500 ml-1.5 font-sans">원</span></p>
                            </div>
                        </motion.div>

                        {/* 3 Months */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center hover:border-white/30 transition-colors h-full"
                        >
                            <span className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center font-black text-xl mb-6">3</span>
                            <h4 className="text-2xl font-bold tracking-tight mb-2">3개월 회원권</h4>
                            <p className="text-neutral-500 font-medium mb-12 uppercase tracking-widest text-xs">3 Months Pass</p>
                            <div className="mt-auto">
                                <p className="text-3xl font-black tracking-tighter">110,000<span className="text-base font-semibold text-neutral-500 ml-1.5 font-sans">원</span></p>
                            </div>
                        </motion.div>

                        {/* 5 Months */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center hover:border-white/30 transition-colors h-full"
                        >
                            <span className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center font-black text-xl mb-6">5</span>
                            <h4 className="text-2xl font-bold tracking-tight mb-2">5개월 회원권</h4>
                            <p className="text-neutral-500 font-medium mb-12 uppercase tracking-widest text-xs">5 Months Pass</p>
                            <div className="mt-auto">
                                <p className="text-3xl font-black tracking-tighter">160,000<span className="text-base font-semibold text-neutral-500 ml-1.5 font-sans">원</span></p>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mt-20 text-center"
                    >
                        <p className="text-neutral-400 font-medium text-sm md:text-base leading-relaxed mb-8 max-w-xl mx-auto break-keep">
                            쿠폰은 구입 후 한 달간 사용 가능하며,<br className="hidden md:block" />
                            네이버에서 구입 후 즉시 회원가로 예약(사용) 가능하십니다.
                        </p>
                        <a href={NAVER_MAP_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-10 py-4 bg-white text-black font-bold tracking-[0.2em] uppercase text-xs md:text-sm rounded-full hover:bg-neutral-200 transition-colors">
                            멤버십 가입하기
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* Spaces List - Interactive */}
            <section id="spaces" className="py-24 bg-neutral-50 text-black border-t border-black/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-0 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:gap-8 border-b border-black/10 pb-10"
                    >
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-center md:text-left">SPACES</h2>
                        <a href={NAVER_MAP_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-6 md:px-8 py-3 md:py-4 border border-black text-black font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs hover:bg-black hover:text-white transition-colors shrink-0">
                            SPACE 공간 예약
                        </a>
                    </motion.div>

                    <div className="flex flex-col space-y-24">

                        {ROOMS.map((room) => (
                            <RoomBlock key={room.name} room={room} />
                        ))}

                        {/* Lobby Block */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.6 }}
                            className="grid grid-cols-1 lg:grid-cols-2 border-b border-black/10 lg:items-start"
                        >
                            {/* Image — lowered for editorial balance */}
                            <div className="h-[56vw] md:h-[380px] lg:h-[480px] lg:pt-24 overflow-hidden">
                                <ImageSlider images={LOBBY.images} roomName="Lobby" />
                            </div>

                            {/* Info */}
                            <div className="px-8 py-10 md:px-12 md:py-14 lg:px-16 lg:py-16 flex flex-col justify-center">
                                <div className="border-b border-black/10 pb-5 mb-7">
                                    <p className="text-[10px] font-bold tracking-[0.3em] text-neutral-400 uppercase mb-1.5">{LOBBY.subtitle}</p>
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-black leading-snug">{LOBBY.name}</h2>
                                </div>

                                <div className="mb-7 space-y-3">
                                    {LOBBY.prices.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center border-b border-black/10 pb-3">
                                            <span className="text-neutral-500 font-bold tracking-widest uppercase text-sm">{p.label}</span>
                                            <div className="flex items-baseline space-x-1.5">
                                                <span className="text-xl md:text-2xl font-bold tracking-tight text-black">{p.value}</span>
                                                <span className="text-sm font-semibold tracking-wide text-neutral-400">{p.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="text-sm leading-relaxed text-neutral-500 mb-7 font-light italic border-l-2 border-black/10 pl-4">
                                    &quot;{LOBBY.description}&quot;
                                </p>

                                <div className="flex-1">
                                    <h4 className="text-[10px] font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4">Space Rules &amp; Features</h4>
                                    <ul className="space-y-3">
                                        {LOBBY.features.map((feature, i) => (
                                            <li key={i} className="text-neutral-600 font-medium flex items-start gap-3 text-sm leading-relaxed break-keep">
                                                <span className="mt-[0.55em] shrink-0 w-4 h-px bg-neutral-300 inline-block"></span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {LOBBY.notes && LOBBY.notes.length > 0 && (
                                    <div className="mt-8 pt-5 border-t border-black/10">
                                        {LOBBY.notes.map((note, i) => (
                                            <p key={i} className="text-xs font-medium text-[#b86060] leading-relaxed break-keep">
                                                {note}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* Studio Guidelines */}
            <section className="py-32 bg-white text-black border-t border-black/10">
                <div className="max-w-7xl mx-auto px-4 md:px-12 space-y-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center md:text-left border-b-2 border-black pb-12"
                    >
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">GUIDELINES & AMENITIES</h2>
                        <p className="mt-8 text-neutral-600 md:text-lg font-medium leading-relaxed break-keep max-w-4xl">
                            음악과 예술을 사랑하는 사람으로써 연습실을 사용하시면서 좋은 점과 부족한 점들을 말씀해주시면 보완을 해드릴 수 있는 선에서 최선을 다해 보완해드리겠습니다. <br className="hidden md:block" />이 공간에서 좋은 연습이 되시길 바랍니다.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm md:text-base pt-6"
                    >
                        {/* Parking */}
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 border-b border-black/10 pb-2">Parking</h3>
                            <div className="font-medium space-y-2">
                                <p className="text-[#b86060] font-bold">주차가 불가합니다.</p>
                                <p className="text-sm text-neutral-600">중곡역 4번출구 앞 <br />한전부지 임시 공영주차장 3분거리</p>
                                <p className="text-neutral-500 font-mono text-xs pt-1 flex items-center gap-2">
                                    <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-400 font-sans tracking-widest leading-none">요금</span>
                                    <span>10분 400원 / 1시간 2,400원</span>
                                </p>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 border-b border-black/10 pb-2">Amenities</h3>
                            <div className="font-medium space-y-2 text-neutral-600">
                                <p>냉·온·얼음 정수기</p>
                                <p>델리코 반자동 커피머신</p>
                            </div>
                        </div>

                        {/* Wi-Fi */}
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 border-b border-black/10 pb-2">Wi-Fi</h3>
                            <div className="font-mono text-sm space-y-4 text-neutral-600">
                                <p>
                                    <span className="text-neutral-400 font-sans text-[10px] uppercase tracking-widest block mb-1">ID</span>
                                    WLSTUDIO/2.4G <br /> WLSTUDIO/5G
                                </p>
                                <p>
                                    <span className="text-neutral-400 font-sans text-[10px] uppercase tracking-widest block mb-1">PASSWORD</span>
                                    wlstudio1209
                                </p>
                            </div>
                        </div>

                        {/* Security & Responsibility */}
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-neutral-400 border-b border-black/10 pb-2">Security & Duty</h3>
                            <div className="font-medium space-y-4">
                                <div>
                                    <p className="text-[#b86060] text-xs font-bold mb-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#b86060] mr-1.5 animate-pulse"></span>CCTV 24시간 촬영 중</p>
                                    <p className="text-neutral-500 text-[11px] md:text-xs break-keep leading-relaxed">고객님들의 안전과 보호를 위해 화장실 통로, 로비, 계단 촬영 중</p>
                                </div>
                                <div className="border-t border-dashed border-black/10 pt-4">
                                    <p className="text-xs break-keep text-neutral-600">연습실 기자재를 내 물건처럼 사용 부탁드립니다.</p>
                                    <p className="text-xs text-[#b86060] mt-1.5 font-bold">파손시 배상 요청드립니다.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Call to action */}
            <section className="py-32 bg-black text-center px-4">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tighter">READY TO RECORD?</h2>
                <a href="/contact" className="inline-block px-12 py-4 border border-white text-white font-bold tracking-widest hover:bg-white hover:text-black transition-colors uppercase text-sm mb-16">
                    Contact Us
                </a>

                {/* Blog Link */}
                <div className="pt-16 border-t border-white/10 max-w-4xl mx-auto flex flex-col items-center">
                    <p className="text-neutral-500 text-sm md:text-base mb-6 font-medium break-keep">
                        음악 제작 팁부터 스튜디오 비하인드까지, 화이트 라이트 스튜디오의 이야기를 만나보세요.
                    </p>
                    <a
                        href="https://blog.naver.com/bkh__official"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-neutral-400 font-bold uppercase tracking-widest text-sm inline-flex items-center gap-2 transition-colors border-b border-transparent hover:border-neutral-400 pb-1"
                    >
                        Read Our Educational Blog
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </a>
                </div>
            </section>

            <Footer />
        </main>
    );
}
