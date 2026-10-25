"use client";

import { useEffect, useId, useRef, useState } from "react";
import Rich from "./Rich";

/**
 * 제목 옆의 작은 "?" 버튼. 누르면 짧은 설명이 펼쳐진다.
 * 키보드: Enter/Space로 열고 Esc로 닫으면 버튼으로 포커스가 돌아온다. 바깥을 눌러도 닫힌다.
 */
export default function HelpTip({ title, body }: { title: string; body: string }) {
    const [open, setOpen] = useState(false);
    const id = useId();
    const wrap = useRef<HTMLSpanElement>(null);
    const btn = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                btn.current?.focus();
            }
        };
        const onDown = (e: MouseEvent) => {
            if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onDown);
        };
    }, [open]);

    return (
        <span ref={wrap} className="relative inline-block align-middle">
            <button
                ref={btn}
                type="button"
                aria-expanded={open}
                aria-controls={id}
                aria-label={`${title} 도움말`}
                onClick={() => setOpen((v) => !v)}
                className="w-6 h-6 rounded-full border border-neutral-400 text-xs font-black text-neutral-600 hover:border-black hover:text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                ?
            </button>
            {open && (
                <span
                    id={id}
                    role="note"
                    className="absolute left-0 top-8 z-30 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-neutral-300 bg-white p-4 shadow-lg text-sm leading-relaxed text-neutral-700 font-normal normal-case tracking-normal"
                >
                    <span className="block font-bold text-neutral-900 mb-1">{title}</span>
                    <Rich text={body} />
                </span>
            )}
        </span>
    );
}
