import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "404 - Page Not Found",
};

export default function NotFound() {
    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 font-sans">
            <div className="text-center">
                <p className="text-xs font-bold tracking-[0.4em] text-neutral-500 uppercase mb-6">
                    WHITE LIGHT STUDIO
                </p>
                <h1 className="text-[120px] md:text-[200px] font-black leading-none tracking-tighter text-white/10 select-none">
                    404
                </h1>
                <p className="text-lg md:text-xl font-bold tracking-widest uppercase text-white mt-2 mb-4">
                    Page Not Found
                </p>
                <p className="text-sm text-neutral-500 mb-12 tracking-wide">
                    요청하신 페이지를 찾을 수 없습니다.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-3 border border-white/20 text-white text-xs font-bold tracking-[0.25em] uppercase px-8 py-4 hover:bg-white hover:text-black transition-colors duration-300"
                >
                    ← Back to Home
                </Link>
            </div>
        </main>
    );
}
