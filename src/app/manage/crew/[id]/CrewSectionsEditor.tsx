"use client";

import { useEffect, useState } from "react";
import { ExpandControls, Summary, ToggleButton, snippet, useOpenKeys } from "../../_components/Collapse";
import {
    KNOWN_TYPES,
    SECTION_META,
    emptyRow,
    emptySection,
    migrateLegacy,
    newKey,
    toPayload,
    type KnownType,
    type Row,
    type SectionState,
} from "@/lib/crew-sections";

const input =
    "w-full h-11 px-3 rounded-lg border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black";
const smallBtn =
    "w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/** 한 줄 항목 목록 편집 (경력, 수상, 트랙, 학력…) */
function RowsEditor({
    rows,
    onChange,
    label,
    dateLabel,
    descLabel,
    titleLabel,
    addLabel,
}: {
    rows: Row[];
    onChange: (rows: Row[]) => void;
    label: string;
    titleLabel: string;
    dateLabel?: string;
    descLabel?: string;
    addLabel: string;
}) {
    const update = (i: number, patch: Partial<Row>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    return (
        <div className="space-y-3">
            {rows.map((r, i) => (
                <div key={r.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-bold">{label} {i + 1}</p>
                        <div className="flex items-center">
                            <button type="button" aria-label={`${label} ${i + 1} 위로`} disabled={i === 0} onClick={() => onChange(move(rows, i, i - 1))} className={smallBtn}>▲</button>
                            <button type="button" aria-label={`${label} ${i + 1} 아래로`} disabled={i === rows.length - 1} onClick={() => onChange(move(rows, i, i + 1))} className={smallBtn}>▼</button>
                            <button type="button" aria-label={`${label} ${i + 1} 지우기`} onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="h-9 px-2 text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-red-600 rounded-sm">지우기</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {dateLabel && (
                            <input aria-label={`${label} ${i + 1} ${dateLabel}`} placeholder={dateLabel} value={r.date} onChange={(e) => update(i, { date: e.target.value })} className={input} />
                        )}
                        <input aria-label={`${label} ${i + 1} ${titleLabel}`} placeholder={titleLabel} value={r.title} onChange={(e) => update(i, { title: e.target.value })} className={input} />
                        {descLabel && (
                            <input aria-label={`${label} ${i + 1} ${descLabel}`} placeholder={descLabel} value={r.desc} onChange={(e) => update(i, { desc: e.target.value })} className={input} />
                        )}
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...rows, emptyRow()])} className="h-10 px-4 rounded-lg border-2 border-dashed border-neutral-400 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                + {addLabel}
            </button>
        </div>
    );
}

function SectionBody({ st, onChange, onMigrate }: { st: SectionState; onChange: (s: SectionState) => void; onMigrate: () => void }) {
    switch (st.type) {
        case "aboutSection":
            return (
                <textarea
                    aria-label="소개 내용"
                    rows={6}
                    value={st.text}
                    onChange={(e) => onChange({ ...st, text: e.target.value })}
                    placeholder="소개 글을 적어 주세요. 줄을 바꾸면 문단이 나뉘어요."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
            );
        case "careerSection":
            return <RowsEditor rows={st.items} onChange={(items) => onChange({ ...st, items })} label="경력" dateLabel="기간 (예: 2023.09 ~)" titleLabel="내용" descLabel="상세 (선택)" addLabel="경력 추가" />;
        case "educationSection":
        case "certificationsSection": {
            const isEdu = st.type === "educationSection";
            return <RowsEditor rows={st.items} onChange={(items) => onChange({ ...st, items })} label={isEdu ? "학력" : "자격증"} titleLabel={isEdu ? "학교·전공 등" : "자격증 이름"} addLabel={isEdu ? "학력 추가" : "자격증 추가"} />;
        }
        case "awardsAndActivitiesSection":
            return (
                <div className="space-y-5">
                    <div>
                        <p className="text-sm font-black mb-2">수상 내역</p>
                        <RowsEditor rows={st.awards} onChange={(awards) => onChange({ ...st, awards })} label="수상" dateLabel="연도" titleLabel="수상명" addLabel="수상 추가" />
                    </div>
                    <div>
                        <p className="text-sm font-black mb-2">대외 활동</p>
                        <RowsEditor rows={st.activities} onChange={(activities) => onChange({ ...st, activities })} label="활동" dateLabel="연도" titleLabel="활동명" addLabel="활동 추가" />
                    </div>
                </div>
            );
        case "discographySection":
            return (
                <div className="space-y-4">
                    {st.years.map((y, yi) => (
                        <div key={y.key} className="rounded-lg border border-neutral-300 p-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <input aria-label={`연도 ${yi + 1}`} placeholder="연도 (예: 2025)" value={y.year} onChange={(e) => onChange({ ...st, years: st.years.map((g, i) => (i === yi ? { ...g, year: e.target.value } : g)) })} className={input} />
                                <button type="button" aria-label={`연도 ${yi + 1} 위로`} disabled={yi === 0} onClick={() => onChange({ ...st, years: move(st.years, yi, yi - 1) })} className={smallBtn}>▲</button>
                                <button type="button" aria-label={`연도 ${yi + 1} 아래로`} disabled={yi === st.years.length - 1} onClick={() => onChange({ ...st, years: move(st.years, yi, yi + 1) })} className={smallBtn}>▼</button>
                                <button type="button" onClick={() => { if (window.confirm("이 연도와 안의 트랙을 모두 지울까요?")) onChange({ ...st, years: st.years.filter((_, i) => i !== yi) }); }} className="h-9 px-2 shrink-0 text-sm font-semibold text-red-600 underline underline-offset-4 rounded-sm">연도 지우기</button>
                            </div>
                            <RowsEditor rows={y.tracks} onChange={(tracks) => onChange({ ...st, years: st.years.map((g, i) => (i === yi ? { ...g, tracks } : g)) })} label="트랙" titleLabel="곡 제목" descLabel="종류·역할 (예: 싱글 앨범)" addLabel="트랙 추가" />
                        </div>
                    ))}
                    <button type="button" onClick={() => onChange({ ...st, years: [...st.years, { key: newKey(), year: "", tracks: [] }] })} className="h-10 px-4 rounded-lg border-2 border-dashed border-neutral-400 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        + 연도 추가
                    </button>
                </div>
            );
        case "legacy": {
            const raw = st.raw as { items?: Array<{ date?: string; title?: string }> };
            const items = Array.isArray(raw.items) ? raw.items : [];
            const canMigrate = st.legacyType === "awardsSection" || st.legacyType === "activitiesSection";
            const name = st.legacyType === "awardsSection" ? "수상 내역" : st.legacyType === "activitiesSection" ? "대외활동" : st.legacyType;
            return (
                <div className="space-y-3">
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3 leading-relaxed">
                        예전 형식의 &quot;{name}&quot; 섹션이에요. 내용은 그대로 보존되지만 <b>지금은 홈페이지에 나오지 않아요.</b>
                        {canMigrate && " 아래 버튼으로 새 형식(수상·대외활동)으로 옮기면 홈페이지에 나타나요."}
                    </p>
                    <ul className="text-sm text-neutral-600 space-y-1 max-h-40 overflow-y-auto">
                        {items.map((it, i) => (
                            <li key={i}>{it.date ? `${it.date} · ` : ""}{it.title}</li>
                        ))}
                    </ul>
                    {canMigrate && (
                        <button type="button" onClick={() => { if (window.confirm("새 형식으로 옮길까요? 저장하면 홈페이지에 수상·활동이 나타나요. (저장 전에는 '변경 버리기'로 되돌릴 수 있어요)")) onMigrate(); }} className="h-10 px-4 rounded-lg border-2 border-black text-sm font-bold hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            새 형식으로 옮기기
                        </button>
                    )}
                </div>
            );
        }
    }
}

/** 접힌 카드에 보이는 한 줄 요약 */
function summaryOf(st: SectionState): string {
    switch (st.type) {
        case "aboutSection":
            return st.text.trim() ? snippet(st.text, 44) : "비어 있음";
        case "careerSection":
            return `경력 ${st.items.length}건${st.items[0]?.title ? ` (${snippet(st.items[0].title, 24)} …)` : ""}`;
        case "educationSection":
            return `학력 ${st.items.length}건${st.items[0]?.title ? ` (${snippet(st.items[0].title, 24)} …)` : ""}`;
        case "certificationsSection":
            return `자격증 ${st.items.length}건${st.items[0]?.title ? ` (${snippet(st.items[0].title, 24)} …)` : ""}`;
        case "awardsAndActivitiesSection":
            return `수상 ${st.awards.length}건 · 대외활동 ${st.activities.length}건`;
        case "discographySection":
            return `연도 ${st.years.length}개 · 트랙 ${st.years.reduce((n, y) => n + y.tracks.length, 0)}곡`;
        case "legacy":
            return "예전 형식 (홈페이지에 나오지 않음)";
    }
}

export default function CrewSectionsEditor({ initial, onDirty, failedState }: { initial: SectionState[]; onDirty: () => void; failedState?: unknown }) {
    const [sections, setSections] = useState<SectionState[]>(initial);
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    // 예전 형식 섹션에는 "홈페이지에 나오지 않음" 안내와 옮기기 버튼이 있어 처음부터 펼쳐 둔다
    const col = useOpenKeys(initial.filter((x) => x.type === "legacy").map((x) => x.key));

    // 저장 실패 시 어느 카드에 문제가 있는지 보이도록 모두 펼친다
    useEffect(() => {
        if (failedState) col.openAll(sections.map((x) => x.key));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [failedState]);

    const apply = (next: SectionState[]) => {
        setSections(next);
        onDirty();
    };
    const present = new Set(sections.map((s) => s.type));
    const addable = KNOWN_TYPES.filter((t) => !present.has(t));
    const titleOf = (st: SectionState) =>
        st.type === "legacy" ? `예전 형식: ${st.legacyType}` : `${SECTION_META[st.type as KnownType].label} (${SECTION_META[st.type as KnownType].en})`;

    return (
        <div id="sections" tabIndex={-1} className="space-y-3 focus:outline-none">
            <input type="hidden" name="sectionsJson" value={JSON.stringify(toPayload(sections))} />

            {sections.length === 0 && <p className="text-sm text-neutral-500">아직 섹션이 없어요. 아래에서 추가해 주세요.</p>}
            {sections.length > 1 && <ExpandControls onOpenAll={() => col.openAll(sections.map((x) => x.key))} onCloseAll={col.closeAll} />}

            {sections.map((st, i) => (
                <div
                    key={st.key}
                    onDragOver={(e) => dragFrom !== null && e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom !== null) apply(move(sections, dragFrom, i));
                        setDragFrom(null);
                    }}
                    className={`rounded-xl border bg-white p-4 ${dragFrom === i ? "opacity-40 border-black" : "border-neutral-300"}`}
                >
                    <div className={`flex flex-wrap items-center justify-between gap-2 ${col.isOpen(st.key) ? "mb-3" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1 basis-48">
                            <span
                                draggable
                                aria-hidden="true"
                                title="끌어서 순서 바꾸기"
                                onDragStart={(e) => {
                                    const card = (e.currentTarget as HTMLElement).closest("div[class*='rounded-xl']");
                                    if (card) e.dataTransfer.setDragImage(card, 20, 20);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(i));
                                    setDragFrom(i);
                                }}
                                onDragEnd={() => setDragFrom(null)}
                                className="cursor-grab active:cursor-grabbing select-none text-neutral-400 text-xl px-1"
                            >
                                ⠿
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-black text-base truncate">{titleOf(st)}</h3>
                                {!col.isOpen(st.key) && <Summary>{summaryOf(st)}</Summary>}
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            <ToggleButton open={col.isOpen(st.key)} onClick={() => col.toggle(st.key)} name={titleOf(st)} />
                            <button type="button" aria-label={`${titleOf(st)} 위로 이동`} disabled={i === 0} onClick={() => apply(move(sections, i, i - 1))} className={smallBtn}>▲</button>
                            <button type="button" aria-label={`${titleOf(st)} 아래로 이동`} disabled={i === sections.length - 1} onClick={() => apply(move(sections, i, i + 1))} className={smallBtn}>▼</button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm("이 섹션을 지울까요? 저장하기 전에는 홈페이지에 반영되지 않고, '변경 버리기'로 되돌릴 수 있어요.")) apply(sections.filter((_, idx) => idx !== i));
                                }}
                                className="h-9 px-2 text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-red-600 rounded-sm"
                            >
                                섹션 지우기
                            </button>
                        </div>
                    </div>
                    <div className={col.isOpen(st.key) ? "" : "hidden"}>
                        <SectionBody
                            st={st}
                            onChange={(next) => apply(sections.map((s, idx) => (idx === i ? next : s)))}
                            onMigrate={() => apply(migrateLegacy(sections, st.key))}
                        />
                    </div>
                </div>
            ))}

            {addable.length > 0 && (
                <div>
                    <p className="text-sm font-bold mb-2">섹션 추가</p>
                    <div className="flex flex-wrap gap-2">
                        {addable.map((t) => (
                            <button key={t} type="button" onClick={() => {
                                const created = emptySection(t);
                                apply([...sections, created]);
                                col.open(created.key);
                            }} className="h-10 px-4 rounded-lg border-2 border-black text-sm font-bold hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                                + {SECTION_META[t].label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-sm text-neutral-500 leading-relaxed">
                내용이 비어 있는 섹션·항목은 저장할 때 자동으로 빠져요. 같은 크루를 /admin에서 동시에 고치고 있으면 저장 시 섹션이 덮어써질 수 있으니 한 곳에서만 편집해 주세요.
            </p>
        </div>
    );
}
