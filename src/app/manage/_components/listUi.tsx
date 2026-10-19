"use client";

import { textareaClass } from "./FormParts";

/** 목록 편집 UI 공통 조각 (스튜디오 공간·스튜디오 안내 폼) */
export const MAX_LINES = 50;

export const smallBtn =
    "w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
export const dangerBtn =
    "h-9 px-2 shrink-0 text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-red-600 rounded-sm";
export const dashedBtn =
    "h-11 px-5 rounded-xl border-2 border-dashed border-neutral-400 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/** 한 줄 문구 목록 (특징·안내 문구) */
export function LinesEditor({ lines, onChange, label, placeholder }: { lines: string[]; onChange: (l: string[]) => void; label: string; placeholder: string }) {
    return (
        <div className="space-y-3">
            {lines.map((text, i) => (
                <div key={i} className="flex items-start gap-1">
                    <textarea
                        aria-label={`${label} ${i + 1}`}
                        rows={2}
                        value={text}
                        placeholder={placeholder}
                        onChange={(e) => onChange(lines.map((l, idx) => (idx === i ? e.target.value : l)))}
                        className={`${textareaClass} !py-2 flex-1`}
                    />
                    <div className="flex flex-col items-center shrink-0">
                        <button type="button" aria-label={`${label} ${i + 1} 위로`} disabled={i === 0} onClick={() => onChange(move(lines, i, i - 1))} className={smallBtn}>▲</button>
                        <button type="button" aria-label={`${label} ${i + 1} 아래로`} disabled={i === lines.length - 1} onClick={() => onChange(move(lines, i, i + 1))} className={smallBtn}>▼</button>
                    </div>
                    <button type="button" aria-label={`${label} ${i + 1} 지우기`} onClick={() => onChange(lines.filter((_, idx) => idx !== i))} className={`${dangerBtn} mt-1.5`}>지우기</button>
                </div>
            ))}
            {lines.length < MAX_LINES && (
                <button type="button" onClick={() => onChange([...lines, ""])} className={dashedBtn}>+ {label} 추가</button>
            )}
        </div>
    );
}

