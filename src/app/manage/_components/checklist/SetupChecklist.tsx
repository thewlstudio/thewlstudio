"use client";

import Link from "../GuardedLink";
import { useState, useSyncExternalStore } from "react";
import { checklist, STEPS } from "./storage";

/** 허브의 "처음 설정" 체크리스트. 행동이 일어나면 자동으로 체크되고, 모두 마치면 숨길 수 있다. */
export default function SetupChecklist() {
    // 서버에서는 숨긴 상태로 그리고, 브라우저에서 기록을 읽어 보여준다
    const snap = useSyncExternalStore(checklist.subscribe, checklist.snapshot, () => "|h");
    const [open, setOpen] = useState(true);
    const [doneList, hiddenFlag] = snap.split("|");
    const done = new Set(doneList ? doneList.split(",") : []);
    const hidden = hiddenFlag === "h";
    if (hidden) return null;

    const count = STEPS.filter((s) => done.has(s.id)).length;
    const total = STEPS.length;
    const complete = count === total;

    return (
        <section data-tour="hub-checklist" aria-labelledby="checklist-title" className="mb-6 rounded-2xl border border-neutral-300 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 id="checklist-title" className="text-base font-black">
                    처음 설정 <span className="text-neutral-500 font-bold">{count}/{total}</span>
                </h2>
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="h-9 px-3 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    {open ? "접기" : "펼치기"}
                </button>
            </div>
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={count}
                aria-label="처음 설정 진행률"
                className="mt-3 h-2 rounded-full bg-neutral-200 overflow-hidden"
            >
                <div className="h-full bg-black transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(count / total) * 100}%` }} />
            </div>

            {open && (
                <>
                    {complete ? (
                        <p className="mt-4 text-sm font-bold text-green-700">모두 마쳤어요! 이제 마음껏 쓰셔도 돼요. 궁금한 건 언제든 사용 안내에서 찾아보세요.</p>
                    ) : (
                        <p className="mt-4 text-sm text-neutral-600">하나씩 해 보면 사용법을 금방 익혀요. 하면 자동으로 체크돼요.</p>
                    )}
                    <ol className="mt-3 space-y-2">
                        {STEPS.map((s) => {
                            const ok = done.has(s.id);
                            return (
                                <li key={s.id} className="flex items-start gap-3">
                                    <span
                                        aria-hidden="true"
                                        className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${ok ? "bg-green-600 text-white" : "border-2 border-neutral-300 text-transparent"}`}
                                    >
                                        ✓
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold ${ok ? "text-neutral-500 line-through" : ""}`}>
                                            {s.title}
                                            <span className="sr-only">{ok ? " (완료)" : " (아직 안 함)"}</span>
                                        </p>
                                        {!ok && <p className="text-sm text-neutral-600 leading-relaxed">{s.desc}</p>}
                                    </div>
                                    {!ok &&
                                        (s.href === "/" ? (
                                            <a
                                                href={s.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 h-9 px-3 rounded-lg border-2 border-black text-sm font-bold flex items-center hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                                onClick={() => checklist.mark("view-site")}
                                            >
                                                {s.cta}
                                            </a>
                                        ) : (
                                            <Link
                                                href={s.href}
                                                className="shrink-0 h-9 px-3 rounded-lg border-2 border-black text-sm font-bold flex items-center hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                            >
                                                {s.cta}
                                            </Link>
                                        ))}
                                </li>
                            );
                        })}
                    </ol>
                    {complete && (
                        <button
                            type="button"
                            onClick={() => checklist.setHidden(true)}
                            className="mt-4 h-10 px-4 rounded-lg bg-black text-white text-sm font-bold hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            이 목록 숨기기
                        </button>
                    )}
                </>
            )}
        </section>
    );
}
