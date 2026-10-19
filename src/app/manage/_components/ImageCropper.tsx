"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { replaceInputFile } from "./imageUpload";

/**
 * 사진 자르기. 새로 고른 사진이나 이미 올라간 사진을 원하는 비율·영역으로 잘라서 파일 입력에 다시 넣는다.
 * 자른 결과는 입력칸의 change 이벤트로 알려서, 기존 흐름(크기 줄이기·미리보기·변경 표시)을 그대로 탄다.
 * 마우스·터치로 끌어서 옮기거나 모서리를 끌어 크기를 바꾸고, 키보드는 화살표(이동)와 +/-(크기)를 쓴다.
 */

type Aspect = { label: string; ratio: number | null };
const ASPECTS: Aspect[] = [
    { label: "자유", ratio: null },
    { label: "1:1", ratio: 1 },
    { label: "3:4", ratio: 3 / 4 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "16:9", ratio: 16 / 9 },
];
const MIN = 24;
const MAX_OUT = 2400;

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

function fit(dw: number, dh: number, ratio: number | null, scale = 0.9): Rect {
    if (!ratio) return { x: dw * 0.05, y: dh * 0.05, w: dw * 0.9, h: dh * 0.9 };
    let w = Math.min(dw, dh * ratio) * scale;
    let h = w / ratio;
    if (h > dh) {
        h = dh * scale;
        w = h * ratio;
    }
    return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function Dialog({ source, defaultRatio, onCancel, onDone }: { source: File | string; defaultRatio: number | null; onCancel: () => void; onDone: (file: File) => void }) {
    const [objUrl, setObjUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    const [ratio, setRatio] = useState<number | null>(defaultRatio);
    const [rect, setRect] = useState<Rect | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ mode: "move" | Corner; sx: number; sy: number; r0: Rect } | null>(null);

    // 사진 불러오기: 파일이면 바로, 주소면 받아서 (캔버스가 막히지 않도록 blob으로)
    useEffect(() => {
        let url: string | null = null;
        let cancelled = false;
        (async () => {
            try {
                if (typeof source === "string") {
                    const res = await fetch(source);
                    if (!res.ok) throw new Error();
                    url = URL.createObjectURL(await res.blob());
                } else {
                    url = URL.createObjectURL(source);
                }
                if (!cancelled) setObjUrl(url);
            } catch {
                if (!cancelled) setError("이 사진을 불러오지 못했어요. 새 사진을 먼저 고른 뒤 잘라 보세요.");
            }
        })();
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [source]);

    // 표시 크기: 화면에 맞춰 줄인다
    const display = (() => {
        if (!natural) return null;
        const maxW = Math.min(640, (typeof window !== "undefined" ? window.innerWidth : 640) - 64);
        const maxH = (typeof window !== "undefined" ? window.innerHeight : 800) * 0.5;
        const s = Math.min(maxW / natural.w, maxH / natural.h, 1);
        return { w: Math.round(natural.w * s), h: Math.round(natural.h * s), s };
    })();

    // 처음 열 때 기본 영역
    const [inited, setInited] = useState(false);
    if (display && !inited) {
        setInited(true);
        setRect(fit(display.w, display.h, ratio));
    }

    // Esc로 닫기, 열릴 때 포커스
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", onKey);
        dialogRef.current?.focus();
        return () => document.removeEventListener("keydown", onKey);
    }, [onCancel]);

    const pos = (e: React.PointerEvent) => {
        const b = stageRef.current!.getBoundingClientRect();
        return { x: e.clientX - b.left, y: e.clientY - b.top };
    };

    const startDrag = (mode: "move" | Corner) => (e: React.PointerEvent) => {
        if (!rect) return;
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const p = pos(e);
        drag.current = { mode, sx: p.x, sy: p.y, r0: rect };
    };

    const onMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || !display) return;
        const p = pos(e);
        if (d.mode === "move") {
            setRect({ ...d.r0, x: clamp(d.r0.x + p.x - d.sx, 0, display.w - d.r0.w), y: clamp(d.r0.y + p.y - d.sy, 0, display.h - d.r0.h) });
            return;
        }
        // 모서리: 반대쪽 모서리를 고정하고 끌린 모서리를 옮긴다
        const ax = d.mode.includes("w") ? d.r0.x + d.r0.w : d.r0.x;
        const ay = d.mode.includes("n") ? d.r0.y + d.r0.h : d.r0.y;
        const px = clamp(p.x, 0, display.w);
        const py = clamp(p.y, 0, display.h);
        let w = Math.max(MIN, Math.abs(px - ax));
        let h = Math.max(MIN, Math.abs(py - ay));
        const dirX = px >= ax ? 1 : -1;
        const dirY = py >= ay ? 1 : -1;
        if (ratio) {
            h = w / ratio;
            // 화면 밖으로 나가면 비율을 지키며 줄인다
            const maxW = dirX > 0 ? display.w - ax : ax;
            const maxH = dirY > 0 ? display.h - ay : ay;
            if (w > maxW) { w = maxW; h = w / ratio; }
            if (h > maxH) { h = maxH; w = h * ratio; }
        }
        setRect({ x: dirX > 0 ? ax : ax - w, y: dirY > 0 ? ay : ay - h, w, h });
    };

    const endDrag = () => {
        drag.current = null;
    };

    const resize = useCallback(
        (factor: number) => {
            if (!rect || !display) return;
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            let w = clamp(rect.w * factor, MIN, display.w);
            let h = ratio ? w / ratio : clamp(rect.h * factor, MIN, display.h);
            if (h > display.h) { h = display.h; if (ratio) w = h * ratio; }
            setRect({ x: clamp(cx - w / 2, 0, display.w - w), y: clamp(cy - h / 2, 0, display.h - h), w, h });
        },
        [rect, display, ratio],
    );

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!rect || !display) return;
        const step = e.shiftKey ? 20 : 8;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (moves[e.key]) {
            e.preventDefault();
            const [dx, dy] = moves[e.key];
            setRect({ ...rect, x: clamp(rect.x + dx, 0, display.w - rect.w), y: clamp(rect.y + dy, 0, display.h - rect.h) });
        } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            resize(1.1);
        } else if (e.key === "-") {
            e.preventDefault();
            resize(0.9);
        }
    };

    const chooseRatio = (r: number | null) => {
        setRatio(r);
        if (display) setRect(fit(display.w, display.h, r));
    };

    const apply = async () => {
        const img = imgRef.current;
        if (!img || !rect || !display || !natural) return;
        const sx = rect.x / display.s;
        const sy = rect.y / display.s;
        const sw = rect.w / display.s;
        const sh = rect.h / display.s;
        const k = Math.min(1, MAX_OUT / Math.max(sw, sh));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(sw * k));
        canvas.height = Math.max(1, Math.round(sh * k));
        const ctx = canvas.getContext("2d");
        if (!ctx) return setError("이 브라우저에서는 자를 수 없어요.");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
        if (!blob) return setError("자르지 못했어요. 다시 시도해 주세요.");
        const base = typeof source === "string" ? "photo" : source.name.replace(/\.[^.]+$/, "");
        onDone(new File([blob], `${base}-crop.jpg`, { type: "image/jpeg" }));
    };

    const handleCls = "absolute w-5 h-5 bg-white border-2 border-black rounded-full";

    return createPortal(
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="crop-title" className="bg-white text-black rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-auto p-4 md:p-5 focus:outline-none">
                <h2 id="crop-title" className="text-lg font-black mb-1">사진 자르기</h2>
                <p className="text-sm text-neutral-600 mb-3 leading-relaxed">
                    네모 칸을 끌어서 옮기고, 모서리를 끌어서 크기를 바꾸세요. 키보드는 화살표(이동), +/-(크기)를 쓸 수 있어요.
                </p>

                <div role="group" aria-label="자르는 비율" className="flex flex-wrap gap-2 mb-3">
                    {ASPECTS.map((a) => (
                        <button
                            key={a.label}
                            type="button"
                            aria-pressed={ratio === a.ratio}
                            onClick={() => chooseRatio(a.ratio)}
                            className={`h-9 px-3 rounded-lg border-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${ratio === a.ratio ? "bg-black text-white border-black" : "border-neutral-300 hover:border-neutral-500"}`}
                        >
                            {a.label}
                        </button>
                    ))}
                    <span className="flex gap-1 ml-auto">
                        <button type="button" onClick={() => resize(0.9)} className="h-9 px-3 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">작게</button>
                        <button type="button" onClick={() => resize(1.1)} className="h-9 px-3 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">크게</button>
                    </span>
                </div>

                {error && <p role="alert" className="text-sm font-semibold text-red-600 mb-3">{error}</p>}

                <div className="flex justify-center bg-neutral-100 rounded-xl p-3 mb-4 min-h-40">
                    {objUrl && (
                        <div
                            ref={stageRef}
                            tabIndex={0}
                            role="group"
                            aria-label="자를 영역 (화살표로 이동, 더하기·빼기로 크기 조절)"
                            onKeyDown={onKeyDown}
                            onPointerMove={onMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            className="relative select-none touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            style={display ? { width: display.w, height: display.h } : undefined}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={objUrl}
                                alt="자를 사진"
                                draggable={false}
                                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                                style={display ? { width: display.w, height: display.h } : { maxWidth: "100%" }}
                                className="block"
                            />
                            {rect && display && (
                                <>
                                    {/* 잘려 나갈 바깥 영역을 어둡게 */}
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: 0, top: 0, width: display.w, height: rect.y }} />
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: 0, top: rect.y + rect.h, width: display.w, height: display.h - rect.y - rect.h }} />
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: 0, top: rect.y, width: rect.x, height: rect.h }} />
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: rect.x + rect.w, top: rect.y, width: display.w - rect.x - rect.w, height: rect.h }} />
                                    <div
                                        onPointerDown={startDrag("move")}
                                        className="absolute border-2 border-white cursor-move"
                                        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 1px rgba(0,0,0,.5)" }}
                                    >
                                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, transparent 33%, rgba(255,255,255,.35) 33%, rgba(255,255,255,.35) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.35) 66%, rgba(255,255,255,.35) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,.35) 33%, rgba(255,255,255,.35) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.35) 66%, rgba(255,255,255,.35) calc(66% + 1px), transparent calc(66% + 1px))" }} />
                                        {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                                            <span
                                                key={c}
                                                onPointerDown={startDrag(c)}
                                                className={`${handleCls} ${c.includes("n") ? "-top-2.5" : "-bottom-2.5"} ${c.includes("w") ? "-left-2.5" : "-right-2.5"} ${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {!objUrl && !error && <p className="self-center text-sm text-neutral-500">사진을 불러오는 중…</p>}
                </div>

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="h-11 px-5 rounded-xl border border-neutral-300 font-bold text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        취소
                    </button>
                    <button type="button" disabled={!rect || !!error} onClick={apply} className="h-11 px-6 rounded-xl bg-black text-white font-bold text-sm hover:bg-neutral-800 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        이 영역으로 자르기
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * "자르기" 버튼. inputId의 파일 입력에 고른 사진이 있으면 그것을, 없으면 지금 저장된 사진(currentUrl)을 자른다.
 * 자른 사진은 입력칸에 다시 넣고 change를 알려서, 각 폼의 기존 처리(미리보기·변경 표시)가 이어진다.
 */
export default function CropButton({ inputId, currentUrl, defaultRatio = null }: { inputId: string; currentUrl?: string | null; defaultRatio?: number | null }) {
    const [source, setSource] = useState<File | string | null>(null);

    const open = () => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        const picked = input?.files?.[0];
        if (picked) setSource(picked);
        else if (currentUrl) setSource(currentUrl);
        else window.alert("먼저 사진을 골라 주세요.");
    };

    return (
        <>
            <button
                type="button"
                onClick={open}
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-neutral-300 bg-white text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                사진 자르기
            </button>
            {source && (
                <Dialog
                    source={source}
                    defaultRatio={defaultRatio}
                    onCancel={() => setSource(null)}
                    onDone={(file) => {
                        const input = document.getElementById(inputId) as HTMLInputElement | null;
                        if (input) {
                            replaceInputFile(input, file);
                            input.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                        setSource(null);
                    }}
                />
            )}
        </>
    );
}
