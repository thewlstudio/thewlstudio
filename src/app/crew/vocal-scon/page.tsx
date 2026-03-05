"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SCON_DISCOGRAPHY = [
    {
        year: "2026",
        items: [
            { date: "02.02", title: "‘기도문’", artist: "승훈", role: "Mixed, Mastered, Recorded" },
            { date: "01.21", title: "싱글몰트하우스", artist: "Coae", role: "편곡, 피아노, AG, 베이스, 레코딩, 믹스, 마스터" },
            { date: "01.04", title: "두해살이풀", artist: "요일반도", role: "작곡, 편곡, 피아노, 드럼, 레코딩" },
        ]
    },
    {
        year: "2025",
        items: [
            { date: "11.03", title: "’색약‘", artist: "길치들", role: "편곡, 레코딩, 믹스, 마스터" },
            { date: "10.27", title: "너의 낭만", artist: "Scon", role: "작사, 작곡, 편곡, 보컬, 피아노, 드럼, 베이스, 믹스, 마스터" },
            { date: "10.17", title: "EP ’새벽의 틈’", artist: "슬", role: "전곡 녹음, 튠, 믹스, 마스터 및 악기 세션" },
            { date: "09.27", title: "나선", artist: "사기소멀", role: "프로듀싱, 편곡, 녹음, 건반, 신스, 드럼 프로그래밍, 믹스, 마스터" },
            { date: "09.25", title: "네모와 동그라미", artist: "오다흘", role: "믹스" },
            { date: "09.23", title: "불행복", artist: "coae", role: "편곡, AG, 미디, 베이스, 녹음, 믹스, 마스터" },
            { date: "09.02", title: "EP ‘영원과 염원’", artist: "상진", role: "전곡 녹음, 튠, 편곡, 백보컬, 악기 세션, 믹스, 마스터" },
            { date: "09.02", title: "하얀달", artist: "슬", role: "보컬레코딩/튠, 믹싱" },
            { date: "09.02", title: "우리만치 솔직하게 사랑하긴 어려울 걸", artist: "삼월생", role: "편곡, 레코딩, 튠, 악기 세션, 믹싱" },
            { date: "09.01", title: "정규 ‘Players Under Bottom’", artist: "PLUB", role: "전곡 믹스, 마스터, 편곡 및 다수 곡 작사/작곡" },
            { date: "08.30", title: "EP 'Confess at the park, dear my love'", artist: "삼월생", role: "전곡 레코딩, 튠, 믹스, 마스터, 피아노" },
            { date: "08.01", title: "Pioneer", artist: "길치들", role: "레코딩, 믹스, 마스터" },
            { date: "07.31", title: "Summer42 (feat.IINA)", artist: "Scon", role: "작곡, 편곡, 작사, 악기 세션, 레코딩, 보컬, 믹스, 마스터" },
            { date: "07.30", title: "움", artist: "사기소멀", role: "레코딩, 믹스, 마스터" },
            { date: "07.02", title: "언제인지도 모르게", artist: "홍태연", role: "편곡, 레코딩, 피아노, EG, 베이스, 믹스, 마스터" },
            { date: "05.30", title: "쌍무지개", artist: "길치들", role: "편곡, 레코딩, 믹스, 마스터" },
            { date: "05.24", title: "Send me a letter", artist: "지영씨, 사해", role: "피아노" },
            { date: "05.02", title: "‘Shimmering Youth’", artist: "삼월생", role: "편곡, 녹음, 믹스" },
            { date: "04.30", title: "간질간질", artist: "SEONO(서노)", role: "믹스" },
            { date: "04.23", title: "기다림", artist: "Scon", role: "작사, 작곡, 편곡, 보컬, 건반, 기타, 베이스, 믹스, 마스터" },
            { date: "04.04", title: "길을 밝혀줘", artist: "신도로", role: "보컬레코딩/보컬튠" },
            { date: "03.18", title: "밤하늘", artist: "김말", role: "작사/작곡/편곡" },
            { date: "03.12", title: "같은 꿈", artist: "Scon", role: "작사, 작곡, 편곡, 보컬, 악기, 믹스, 마스터" },
            { date: "03.04", title: "한참을 커버린", artist: "윤진", role: "편곡/건반" },
            { date: "01.24", title: "It's cold outside", artist: "사해", role: "작곡" },
            { date: "01.02", title: "새겨져있어", artist: "윤형준", role: "편곡, 녹음, 건반, 믹스, 마스터" },
        ]
    },
    {
        year: "2024",
        items: [
            { date: "12.02", title: "뭍", artist: "n@di, 장재성", role: "녹음, 믹스, 마스터" },
            { date: "11.28", title: "좋아지려나(demo)", artist: "삼월생", role: "녹음, 편곡, 믹스, 마스터" },
            { date: "11.20", title: "밤", artist: "윤형준", role: "보컬녹음, 편곡, 피아노, 프로그래밍, 믹스, 마스터" },
            { date: "10.29", title: "어린 아이", artist: "경이", role: "보컬녹음, 편곡, 피아노, 믹스, 마스터" },
            { date: "10.29", title: "모난 마음", artist: "경이", role: "보컬녹음, 편곡, 피아노, 믹스, 마스터" },
            { date: "10.21", title: "어설픈 애", artist: "삼월생", role: "보컬녹음, 믹스, 마스터" },
            { date: "10.15", title: "사랑, 그대는 나와 같나요", artist: "유필", role: "보컬녹음, 믹스, 마스터" },
            { date: "10.11", title: "트리플싱글 ‘Utopia’ 전곡", artist: "Scon", role: "작사, 작곡, 편곡, 보컬, AG, 믹스, 마스터" },
            { date: "10.11", title: "다시 눈을 감자, 잊혀지도록", artist: "유필", role: "보컬녹음, EG, 믹스, 마스터" },
            { date: "10.10", title: "Daylight", artist: "Feel Lee", role: "작곡/작사/편곡" },
            { date: "10.02", title: "그대로만", artist: "이일구", role: "믹스/마스터" },
            { date: "09.30", title: "‘사진첩’ 전곡", artist: "SEONO(서노)", role: "믹스" },
            { date: "09.28", title: "지평선", artist: "Scon", role: "작곡, 작사, 편곡, 보컬, AG, 믹스" },
            { date: "09.26", title: "내게 인사를 하지", artist: "삼월생", role: "편곡, 보컬녹음, 믹스, 마스터, 트랙메이킹" },
            { date: "08.25", title: "정규 ‘IDEA ROCKERBOY’", artist: "요일반도", role: "보컬녹음, 작곡, 편곡" },
            { date: "07.31", title: "한 조각의 푸른 마음", artist: "슬", role: "CG, 피아노, 보컬녹음, 믹스, 마스터" },
            { date: "07.30", title: "Where am i right now!", artist: "삼월생", role: "편곡, 미디, 코러스, 보컬녹음, 믹스, 마스터" },
            { date: "07.15", title: "두부", artist: "경이", role: "믹스/마스터" },
            { date: "06.24", title: "Montauk", artist: "사해", role: "편곡, 피아노, 보컬녹음, 믹스, 마스터" },
            { date: "05.28", title: "밤", artist: "삼월생", role: "편곡, 피아노, 프로듀싱, 보컬녹음, 믹스, 마스터" },
            { date: "05.28", title: "해진 내 이불", artist: "삼월생", role: "편곡, EG, 프로듀싱, 보컬녹음, 믹스, 마스터" },
            { date: "05.28", title: "Brûlée", artist: "PLUB", role: "프로듀싱, 보컬녹음, 작곡, 작사, 편곡" },
            { date: "05.21", title: "EP ‘사랑의 형태’", artist: "n@di", role: "보컬녹음, 믹스, 마스터" },
            { date: "04.15", title: "EP ‘Love Circle’", artist: "Scon", role: "보컬, 작사, 작곡, 편곡, 세션 등" },
            { date: "03.06", title: "皮(피부)", artist: "Scon", role: "보컬/작사/작곡/편곡" },
        ]
    },
    {
        year: "2023",
        items: [
            { date: "10.16", title: "제아", artist: "n@di", role: "보컬튠/믹스/마스터" },
            { date: "10.01", title: "월종", artist: "요일반도", role: "작곡/편곡" },
            { date: "09.08", title: "별 떨어진다(I do)", artist: "디오(D.O.) of EXO", role: "작곡" },
            { date: "08.30", title: "사화", artist: "요일반도", role: "작곡/편곡" },
            { date: "07.31", title: "혼몽", artist: "요일반도", role: "작곡/편곡" },
            { date: "07.19", title: "짝사랑", artist: "Scon", role: "작사/작곡/편곡/보컬" },
            { date: "05.17", title: "너를 떠올린 봄", artist: "Scon", role: "작사/작곡/보컬" },
            { date: "05.17", title: "Spring Time", artist: "Scon", role: "작사/작곡/보컬/어쿠스틱기타" },
            { date: "05.13", title: "이런 내가 널 어떻게 만나", artist: "김 봄", role: "베이스, 드럼 프로그래밍" },
            { date: "04.06", title: "익선동", artist: "김 봄", role: "어쿠스틱기타" },
            { date: "01.18", title: "난 네게 6줄의 붉은 줄 뿐인데", artist: "김 봄", role: "보컬레코딩/믹스" },
            { date: "01.14", title: "Earl Grey", artist: "Scon", role: "보컬/작사/작곡/어쿠스틱기타" },
        ]
    },
    {
        year: "2022",
        items: [
            { date: "12.08", title: "J", artist: "n@di", role: "보컬레코딩" },
            { date: "09.07", title: "Eyes On You(야경)", artist: "강타", role: "작사/작곡" },
            { date: "08.25", title: "여름의 거짓말", artist: "n@di", role: "보컬레코딩" },
            { date: "08.24", title: "Focus", artist: "하성운", role: "작곡" },
            { date: "05.11", title: "On a Highway", artist: "Ciipher", role: "작사/작곡/백보컬" },
            { date: "05.03", title: "파랑새", artist: "려욱 of 슈퍼주니어", role: "작사/작곡" },
            { date: "01.23", title: "편지", artist: "n@di", role: "편곡/어쿠스틱기타/믹스" },
        ]
    },
    {
        year: "2021",
        items: [
            { date: "08.20", title: "정리장", artist: "Collective Arts, 김 봄", role: "어쿠스틱기타" },
            { date: "06.21", title: "Ticket", artist: "Collective Arts, Scon", role: "보컬/작사/작곡/어쿠스틱기타/일렉트릭기타" },
            { date: "05.04", title: "남겨진 날", artist: "김요일밴드", role: "어쿠스틱기타/일렉트릭기타" },
            { date: "05.03", title: "Phantom Pain", artist: "예성 of 슈퍼주니어", role: "작사/작곡" },
        ]
    }
];

export default function VocalSconPage() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <Header />

            {/* Hero Profile Section */}
            <section className="pt-40 lg:pt-48 pb-16 px-4 flex flex-col items-center justify-center bg-black text-white">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center max-w-4xl text-center"
                >
                    <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shadow-2xl mb-8 border-4 border-neutral-800 relative group">
                        <Image
                            src="/images/crew_scon.png"
                            alt="Scon Profile"
                            fill
                            className="object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
                            sizes="224px"
                        />
                    </div>

                    <h2 className="text-sm font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4 text-center">Producer / Singer-songwriter / Engineer</h2>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 flex flex-col items-center">
                        Scon
                        <span className="text-xl md:text-2xl font-medium text-neutral-400 mt-2">민수</span>
                    </h1>

                    <div className="flex items-center space-x-6 mt-4">
                        <a href="https://instagram.com/boxscon" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" aria-label="Instagram">
                            <Image src="/images/insta_favi_dark.png" alt="Instagram" width={32} height={32} className="object-contain" />
                        </a>
                        <a href="https://www.youtube.com/@boxscon" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" aria-label="YouTube">
                            <Image src="/images/youtube_favi_light.png" alt="YouTube" width={32} height={32} className="object-contain invert" />
                        </a>
                    </div>
                </motion.div>
            </section>

            {/* Discography History Timeline */}
            <section className="py-32 px-4 md:px-12 max-w-5xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-20 border-l-4 border-black pl-4"
                >
                    Discography
                </motion.h2>

                <div className="relative border-l border-neutral-300 ml-4 md:ml-8 pl-8 md:pl-16 space-y-24">
                    {SCON_DISCOGRAPHY.map((yearGroup, index) => (
                        <motion.div
                            key={yearGroup.year}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="relative"
                        >
                            {/* Year Marker */}
                            <div className="absolute -left-[3.15rem] md:-left-[5.15rem] top-0 w-24 flex items-center justify-center">
                                <div className="bg-white border-2 border-black font-black text-xl py-2 px-4 rounded-full shadow-md z-10">
                                    {yearGroup.year}
                                </div>
                            </div>

                            {/* Track List */}
                            <div className="pt-16 md:pt-4 space-y-8">
                                {yearGroup.items.map((item, i) => (
                                    <div key={i} className="group relative bg-neutral-50 px-6 py-5 rounded-xl hover:shadow-xl transition-shadow border border-neutral-100 hover:border-neutral-300 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 break-keep">
                                        <div className="text-sm font-bold text-neutral-400 tabular-nums whitespace-nowrap">
                                            {item.date}
                                        </div>
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 overflow-hidden">
                                            <h4 className="text-lg font-black tracking-tight text-black flex-1 leading-tight group-hover:text-neutral-500 transition-colors truncate">
                                                {item.title}
                                            </h4>
                                            <div className="text-sm font-medium text-neutral-500 max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis shrink-0">
                                                {item.artist}
                                            </div>
                                        </div>
                                        <div className="mt-3 md:mt-0 text-[10px] sm:text-xs font-bold bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded uppercase tracking-widest text-center md:text-right shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {item.role}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <Footer />
        </main>
    );
}
