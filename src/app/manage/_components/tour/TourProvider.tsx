"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Rich from "../Rich";
import { tourForPath, type TourDef, type TourStep } from "./tours";
import { tourStorage } from "./storage";

/**
 * 화면 안내(투어) 엔진. 설계: docs/ONBOARDING_DESIGN.md
 * - 화면에 처음 들어오면(자동 안내를 끄지 않았다면) 잠시 뒤 시작하고, 상단 "이 화면 안내" 버튼으로 언제든 다시 본다.
 * - 대상 요소를 밝게 남기고 나머지는 어둡게 하되, 클릭은 막지 않는다. Esc·건너뛰기로 언제든 닫는다.
 * - 키보드: → 다음, ← 이전, Esc 닫기. 말풍선은 대화상자로 읽히고 단계 위치를 스크린 리더에 알린다.
 */

type Resolved = { step: TourStep; el: HTMLElement };

type Ctx = { available: boolean; start: () => void };
const TourCtx = createContext<Ctx>({ available: false, start: () => {} });
export const useTour = () => useContext(TourCtx);

const isVisible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
};

/** 화면에 실제로 있는 대상만 모아 단계 목록을 만든다 */
function resolveSteps(tour: TourDef): Resolved[] {
    const out: Resolved[] = [];
    for (const step of tour.steps) {
        const el = document.querySelector<HTMLElement>(step.target);
        if (el && isVisible(el)) out.push({ step, el });
    }
    return out;
}

const subscribeReduced = (cb: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
};

export function TourProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const tour = useMemo(() => tourForPath(pathname), [pathname]);
    const [run, setRun] = useState<{ tourId: string; steps: Resolved[] } | null>(null);
    const lastFocus = useRef<HTMLElement | null>(null);

    const begin = useCallback(
        (auto: boolean) => {
            if (!tour) return false;
            const steps = resolveSteps(tour);
            if (steps.length === 0) return false;
            if (!auto) lastFocus.current = document.activeElement as HTMLElement | null;
            tourStorage.markSeen(tour.id);
            setRun({ tourId: tour.id, steps });
            return true;
        },
        [tour],
    );

    // 화면이 바뀌면 진행 중이던 안내는 닫고, 처음 보는 화면이면 잠시 뒤 자동으로 시작한다
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setRun(null);
    }
    useEffect(() => {
        if (!tour || tourStorage.hasSeen(tour.id) || tourStorage.isAutoOff()) return;
        let tries = 0;
        let timer: ReturnType<typeof setTimeout>;
        const attempt = () => {
            // 대상이 아직 그려지지 않았으면 한 번 더 기다린다
            if (!begin(true) && tries++ < 2) timer = setTimeout(attempt, 900);
        };
        timer = setTimeout(attempt, 700);
        return () => clearTimeout(timer);
    }, [tour, begin]);

    const start = useCallback(() => {
        if (!begin(false)) window.alert("이 화면에는 지금 안내할 항목이 없어요.");
    }, [begin]);

    const close = useCallback(() => {
        setRun(null);
        lastFocus.current?.focus?.();
    }, []);

    return (
        <TourCtx.Provider value={{ available: !!tour, start }}>
            {children}
            {run && <Overlay key={run.tourId} steps={run.steps} onClose={close} />}
        </TourCtx.Provider>
    );
}

function Overlay({ steps, onClose }: { steps: Resolved[]; onClose: () => void }) {
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [vp, setVp] = useState({ w: 1024, h: 768 });
    const cardRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const bodyId = useId();
    const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
    const [autoOff, setAutoOff] = useState(() => tourStorage.isAutoOff());

    const cur = steps[index];
    const last = index === steps.length - 1;

    const measure = useCallback(() => {
        const el = cur.el;
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setVp({ w: window.innerWidth, h: window.innerHeight });
    }, [cur]);

    // 단계가 바뀌면 대상을 화면 가운데로 가져오고 위치를 다시 잰다
    useEffect(() => {
        cur.el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        const t0 = setTimeout(measure, 0);
        const t1 = setTimeout(measure, 200);
        const t2 = setTimeout(measure, 600);
        return () => {
            clearTimeout(t0);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [cur, measure, reduced]);

    useEffect(() => {
        window.addEventListener("scroll", measure, true);
        window.addEventListener("resize", measure);
        return () => {
            window.removeEventListener("scroll", measure, true);
            window.removeEventListener("resize", measure);
        };
    }, [measure]);

    // 단계마다 말풍선 제목으로 포커스를 옮겨 스크린 리더가 읽게 한다
    useEffect(() => {
        cardRef.current?.focus({ preventScroll: true });
    }, [index]);

    const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
    const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                prev();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [next, prev, onClose]);

    const small = vp.w < 640;
    const CARD_W = Math.min(352, vp.w - 32);
    const PAD = 6;

    // 말풍선 위치: 작은 화면은 아래 시트, 그 밖에는 대상 아래 → 위 순서로 화면 안에 들어가는 곳
    let cardStyle: React.CSSProperties;
    if (small || !rect) {
        // 작은 화면: 대상이 화면 아래쪽에 있으면 시트를 위로 올려 대상을 가리지 않는다
        const targetLow = !!rect && rect.top + rect.height / 2 > vp.h / 2;
        cardStyle = targetLow ? { left: 16, right: 16, top: 16 } : { left: 16, right: 16, bottom: 16 };
    } else {
        const spaceBelow = vp.h - (rect.top + rect.height);
        const placeBelow = spaceBelow >= 220 || spaceBelow >= rect.top;
        const top = placeBelow ? Math.min(rect.top + rect.height + PAD + 10, vp.h - 200) : Math.max(16, rect.top - PAD - 10 - 190);
        const left = Math.min(Math.max(16, rect.left), vp.w - CARD_W - 16);
        cardStyle = { top, left, width: CARD_W };
    }

    return createPortal(
        <>
            {/* 대상 둘레만 밝게. 클릭은 그대로 통과한다 */}
            {rect && (
                <div
                    aria-hidden="true"
                    className="fixed z-[90] pointer-events-none rounded-xl"
                    style={{
                        top: rect.top - PAD,
                        left: rect.left - PAD,
                        width: rect.width + PAD * 2,
                        height: rect.height + PAD * 2,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,.55), 0 0 0 2px #fff",
                        transition: reduced ? "none" : "all .25s ease",
                    }}
                />
            )}
            <div
                ref={cardRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="false"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                className="fixed z-[91] rounded-2xl bg-white text-black shadow-2xl border border-neutral-200 p-4 focus:outline-none"
                style={cardStyle}
            >
                <p className="text-xs font-bold text-neutral-500 mb-1" aria-live="polite">
                    {index + 1} / {steps.length}단계
                </p>
                <h2 id={titleId} className="text-base font-black mb-1">
                    {cur.step.title}
                </h2>
                <p id={bodyId} className="text-sm text-neutral-700 leading-relaxed break-keep">
                    <Rich text={cur.step.body} />
                </p>

                {index === 0 && (
                    <label className="flex items-center gap-2 mt-3 text-xs text-neutral-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoOff}
                            onChange={(e) => {
                                setAutoOff(e.target.checked);
                                tourStorage.setAutoOff(e.target.checked);
                            }}
                            className="w-4 h-4 accent-black"
                        />
                        앞으로 안내를 자동으로 보지 않기
                    </label>
                )}

                <div className="flex items-center justify-between gap-2 mt-4">
                    <button type="button" onClick={onClose} className="h-10 px-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                        건너뛰기
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={prev} disabled={index === 0} className="h-10 px-4 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-100 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            이전
                        </button>
                        <button type="button" onClick={next} className="h-10 px-5 rounded-lg bg-black text-white text-sm font-bold hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            {last ? "완료" : "다음"}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}
