"use client";

import { useTour } from "./TourProvider";

/** 상단의 "이 화면 안내" — 지금 화면에 안내가 있을 때만 보인다 */
export default function TourButton() {
    const { available, start } = useTour();
    if (!available) return null;
    return (
        <button
            type="button"
            onClick={start}
            className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors underline underline-offset-4 min-h-11 px-1 flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
        >
            이 화면 안내
        </button>
    );
}
