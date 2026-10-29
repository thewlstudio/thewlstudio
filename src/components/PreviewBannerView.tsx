"use client";

import { usePathname } from "next/navigation";
import { PREVIEW_EXIT_HREF } from "@/lib/preview-path";

export default function PreviewBannerView() {
    const pathname = usePathname();
    if (pathname.startsWith("/manage")) return null;
    return (
        <div role="region" aria-label="미리보기" className="fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-amber-300 text-black shadow-xl px-4 py-3 flex items-center gap-3 font-sans">
            <p className="text-sm font-bold leading-snug flex-1">미리보기 중이에요. 비공개 항목도 보여요.</p>
            {/* 일반 링크(<a>): 미리보기를 끄는 주소라 Next 프리페치가 닿으면 안 된다 */}
            <a href={PREVIEW_EXIT_HREF} className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                미리보기 끝내기
            </a>
        </div>
    );
}
