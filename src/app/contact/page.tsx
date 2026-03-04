import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NAVER_MAP_PLACE_URL } from "@/lib/constants";

export const metadata: Metadata = {
    title: "CONTACT",
    description: "화이트라이트 스튜디오 위치 안내 - 서울특별시 광진구 능동로 413-1 지하1층, 7호선 중곡역 3번 출구",
};

export default function ContactPage() {
    return (
        <main className="bg-white min-h-screen text-black font-sans">
            <Header />

            <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-40 pb-24 md:pt-48 md:pb-32">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 md:mb-24 text-center">CONTACT</h1>

                {/* Contact Info List */}
                <div className="flex flex-col space-y-16 md:space-y-0 md:flex-row md:justify-between border-b border-black/10 pb-16 md:pb-24">

                    {/* Location Info */}
                    <div className="flex flex-col md:flex-row md:gap-16 w-full">
                        <div className="md:w-1/3 mb-6 md:mb-0">
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">WHITE LIGHT<br />STUDIO</h2>
                        </div>

                        <div className="md:w-1/3 flex flex-col gap-2 mb-8 md:mb-0">
                            <div className="flex items-start gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 text-black/40">
                                    <path d="M12 21C16 16.8 19 12.8467 19 9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9C5 12.8467 8 16.8 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 11C13.1046 11 14 10.1046 14 9C14 7.89543 13.1046 7 12 7C10.8954 7 10 7.89543 10 9C10 10.1046 10.8954 11 12 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div>
                                    <p className="text-sm md:text-base font-medium text-[#111] break-keep leading-relaxed tracking-tight">
                                        서울특별시 광진구 능동로 413-1 지하1층
                                    </p>
                                    <p className="text-sm font-normal text-[#666] mt-2 tracking-wide">
                                        B1, 413-1, Neungdong-ro, Gwangjin-gu, Seoul, Republic of Korea
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="md:w-1/3 flex items-start gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 text-black/40">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <a href="tel:0507-1331-7285" className="text-sm md:text-base font-medium text-[#111] hover:underline">
                                0507-1331-7285
                            </a>
                        </div>
                    </div>
                </div>

                {/* Map Area */}
                <div className="mt-16 w-full aspect-square md:aspect-[21/9] bg-neutral-100 rounded-lg overflow-hidden relative border border-black/5 group">
                    <iframe
                        src="https://maps.google.com/maps?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EA%B4%91%EC%A7%84%EA%B5%AC%20%EB%8A%A5%EB%8F%99%EB%A1%9C%20413-1&t=&z=16&ie=UTF8&iwloc=&output=embed"
                        className="w-full h-full border-0 absolute top-0 left-0 grayscale opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                        title="White Light Studio Location Map"
                        allowFullScreen
                        loading="lazy"
                    ></iframe>

                    {/* External Link Buttons */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
                        <a
                            href={NAVER_MAP_PLACE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-black px-5 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black hover:text-white transition-colors border border-black/10 flex items-center gap-2"
                        >
                            Open in Naver Map ↗
                        </a>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
