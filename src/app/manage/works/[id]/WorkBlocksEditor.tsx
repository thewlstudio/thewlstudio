"use client";

import { useState } from "react";
import { prepareImageFile, replaceInputFile } from "../../_components/imageUpload";
import {
    BLOCK_META,
    ADDABLE_TYPES,
    PRESERVED_LABELS,
    emptyBlock,
    emptyCreditSection,
    emptyItem,
    emptyPara,
    emptyTrack,
    toPayload,
    type BlockState,
    type CreditSection,
    type EditableType,
    type Para,
} from "@/lib/work-blocks";

const input =
    "w-full h-11 px-3 rounded-lg border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black";
const area =
    "w-full px-3 py-2 rounded-lg border border-neutral-300 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-black";
const smallBtn =
    "w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
const dashedBtn =
    "h-10 px-4 rounded-lg border-2 border-dashed border-neutral-400 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
const dangerBtn =
    "h-9 px-2 shrink-0 text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-red-600 rounded-sm";

function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/** 행 하나의 ▲▼·지우기 버튼 묶음 */
function RowTools({ name, i, count, onMove, onRemove }: { name: string; i: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
    return (
        <div className="flex items-center">
            <button type="button" aria-label={`${name} ${i + 1} 위로`} disabled={i === 0} onClick={() => onMove(i - 1)} className={smallBtn}>▲</button>
            <button type="button" aria-label={`${name} ${i + 1} 아래로`} disabled={i === count - 1} onClick={() => onMove(i + 1)} className={smallBtn}>▼</button>
            <button type="button" aria-label={`${name} ${i + 1} 지우기`} onClick={onRemove} className={dangerBtn}>지우기</button>
        </div>
    );
}

/** 문단 목록 (설명·인사말) */
function ParagraphsEditor({ paras, onChange, label }: { paras: Para[]; onChange: (p: Para[]) => void; label: string }) {
    return (
        <div className="space-y-3">
            {paras.map((p, i) => (
                <div key={p.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-bold">{label} {i + 1}</p>
                        <RowTools name={label} i={i} count={paras.length} onMove={(to) => onChange(move(paras, i, to))} onRemove={() => onChange(paras.filter((_, idx) => idx !== i))} />
                    </div>
                    <textarea
                        aria-label={`${label} ${i + 1} 내용`}
                        rows={4}
                        value={p.text}
                        onChange={(e) => onChange(paras.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
                        className={area}
                    />
                </div>
            ))}
            <button type="button" onClick={() => onChange([...paras, emptyPara()])} className={dashedBtn}>+ {label} 추가</button>
            <p className="text-sm text-neutral-500 leading-relaxed">Enter로 줄을 바꾸면 홈페이지에서도 줄이 바뀝니다. 비워둔 {label}은 저장할 때 빠집니다.</p>
        </div>
    );
}

function CreditsEditor({ sections, onChange }: { sections: CreditSection[]; onChange: (s: CreditSection[]) => void }) {
    const upd = (si: number, patch: Partial<CreditSection>) => onChange(sections.map((s, i) => (i === si ? { ...s, ...patch } : s)));
    return (
        <div className="space-y-4">
            {sections.map((sec, si) => (
                <div key={sec.key} className="rounded-lg border border-neutral-300 p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <input aria-label={`크레딧 묶음 ${si + 1} 제목`} placeholder="묶음 제목 (예: Staff Credits)" value={sec.title} onChange={(e) => upd(si, { title: e.target.value })} className={`${input} basis-full sm:basis-0 sm:flex-1`} />
                        <button type="button" aria-label={`크레딧 묶음 ${si + 1} 위로`} disabled={si === 0} onClick={() => onChange(move(sections, si, si - 1))} className={smallBtn}>▲</button>
                        <button type="button" aria-label={`크레딧 묶음 ${si + 1} 아래로`} disabled={si === sections.length - 1} onClick={() => onChange(move(sections, si, si + 1))} className={smallBtn}>▼</button>
                        <button type="button" onClick={() => { if (window.confirm("이 묶음과 안의 크레딧을 모두 지울까요?")) onChange(sections.filter((_, i) => i !== si)); }} className={dangerBtn}>묶음 지우기</button>
                    </div>
                    {sec.items.map((it, ii) => {
                        const updItem = (patch: Partial<typeof it>) => upd(si, { items: sec.items.map((x, i) => (i === ii ? { ...x, ...patch } : x)) });
                        const n = `묶음 ${si + 1} 크레딧 ${ii + 1}`;
                        return (
                            <div key={it.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold">크레딧 {ii + 1}</p>
                                    <RowTools name={`묶음 ${si + 1} 크레딧`} i={ii} count={sec.items.length} onMove={(to) => upd(si, { items: move(sec.items, ii, to) })} onRemove={() => upd(si, { items: sec.items.filter((_, i) => i !== ii) })} />
                                </div>
                                <input aria-label={`${n} 역할`} placeholder="역할 (예: Composed by) — 비우면 한 줄 전체 글이 됩니다" value={it.role} onChange={(e) => updItem({ role: e.target.value })} className={input} />
                                <textarea aria-label={`${n} 이름·내용`} rows={2} placeholder="이름·내용 (예: 백광흠)" value={it.value} onChange={(e) => updItem({ value: e.target.value })} className={area} />
                                <input aria-label={`${n} 링크 글자`} placeholder="링크 글자 (선택, 예: @shcord_re)" value={it.linkText} onChange={(e) => updItem({ linkText: e.target.value })} className={input} />
                                <input aria-label={`${n} 링크 주소`} type="url" inputMode="url" placeholder="링크 주소 (선택, https://...)" value={it.linkUrl} onChange={(e) => updItem({ linkUrl: e.target.value })} className={input} />
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => upd(si, { items: [...sec.items, emptyItem()] })} className={dashedBtn}>+ 크레딧 추가</button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...sections, emptyCreditSection()])} className={dashedBtn}>+ 크레딧 묶음 추가</button>
        </div>
    );
}

/** 이미지 블록: 사진은 파일 입력(blockImage_<key>)으로 폼에 실려 서버가 올린다 */
function ImageBlockEditor({ b, onChange }: { b: Extract<BlockState, { type: "imageBlock" }>; onChange: (b: BlockState) => void }) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const shown = preview ?? b.imageUrl;
    const id = `img-${b.key}`;
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-4">
                <div className="relative w-32 aspect-[4/3] shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                    {shown ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shown} alt="이미지 미리보기" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">이미지 없음</div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <label htmlFor={id} className="inline-flex items-center justify-center h-10 px-4 rounded-lg border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors focus-within:outline-2 focus-within:outline-offset-2">
                        이미지 고르기
                    </label>
                    <input
                        id={id}
                        name={`blockImage_${b.key}`}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                            const input = e.target;
                            const picked = input.files?.[0];
                            if (!picked) {
                                setPreview(null);
                                setError(null);
                                return;
                            }
                            const prepared = await prepareImageFile(picked);
                            if ("error" in prepared) {
                                setError(prepared.error);
                                input.value = "";
                                setPreview(null);
                                return;
                            }
                            replaceInputFile(input, prepared.file);
                            setError(null);
                            setPreview(URL.createObjectURL(prepared.file));
                            onChange({ ...b }); // 변경됨 표시
                        }}
                    />
                    {error ? (
                        <p role="alert" className="text-sm font-semibold text-red-600 mt-2">{error}</p>
                    ) : (
                        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                            {preview ? "새 이미지가 선택되었어요. 저장하면 바뀝니다." : b.imageUrl ? "고르지 않으면 지금 이미지가 유지됩니다." : "이미지를 선택해 주세요. 없으면 저장할 때 이 블록은 빠집니다."}
                        </p>
                    )}
                </div>
            </div>
            <input aria-label="이미지 설명(캡션)" placeholder="이미지 설명 (선택)" value={b.caption} onChange={(e) => onChange({ ...b, caption: e.target.value })} className={input} />
        </div>
    );
}

function BlockBody({ b, onChange }: { b: BlockState; onChange: (b: BlockState) => void }) {
    switch (b.type) {
        case "descriptionBlock":
            return <ParagraphsEditor paras={b.paragraphs} onChange={(paragraphs) => onChange({ ...b, paragraphs })} label="문단" />;
        case "signatureMessageBlock":
            return (
                <div className="space-y-4">
                    <ParagraphsEditor paras={b.paragraphs} onChange={(paragraphs) => onChange({ ...b, paragraphs })} label="문단" />
                    <div>
                        <label htmlFor={`sig-${b.key}`} className="block text-sm font-bold mb-1.5">서명 (선택)</label>
                        <input id={`sig-${b.key}`} placeholder="예: - White Light Studio" value={b.signature} onChange={(e) => onChange({ ...b, signature: e.target.value })} className={input} />
                    </div>
                </div>
            );
        case "creditGridBlock":
            return <CreditsEditor sections={b.sections} onChange={(sections) => onChange({ ...b, sections })} />;
        case "tracklistBlock":
            return (
                <div className="space-y-3">
                    {b.tracks.map((t, i) => (
                        <div key={t.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold">트랙 {i + 1}</p>
                                <RowTools name="트랙" i={i} count={b.tracks.length} onMove={(to) => onChange({ ...b, tracks: move(b.tracks, i, to) })} onRemove={() => onChange({ ...b, tracks: b.tracks.filter((_, idx) => idx !== i) })} />
                            </div>
                            <input aria-label={`트랙 ${i + 1} 제목`} placeholder="곡 제목 (예: 1. 너와)" value={t.title} onChange={(e) => onChange({ ...b, tracks: b.tracks.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)) })} className={input} />
                            <textarea aria-label={`트랙 ${i + 1} 설명·가사`} rows={3} placeholder="설명·가사 (선택)" value={t.description} onChange={(e) => onChange({ ...b, tracks: b.tracks.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)) })} className={area} />
                        </div>
                    ))}
                    <button type="button" onClick={() => onChange({ ...b, tracks: [...b.tracks, emptyTrack()] })} className={dashedBtn}>+ 트랙 추가</button>
                </div>
            );
        case "imageBlock":
            return <ImageBlockEditor b={b} onChange={onChange} />;
        case "videoEmbedBlock":
            return (
                <div className="space-y-2">
                    <input aria-label="유튜브 주소" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=..." value={b.url} onChange={(e) => onChange({ ...b, url: e.target.value })} className={input} />
                    <p className="text-sm text-neutral-500 leading-relaxed">유튜브 영상 주소를 붙여넣으세요. 주소가 올바르지 않으면 저장되지 않습니다.</p>
                </div>
            );
        case "audioBlock":
            return (
                <div className="space-y-2">
                    {b.audioUrl ? (
                        <audio controls preload="none" src={b.audioUrl} className="w-full" aria-label="오디오 미리 듣기" />
                    ) : (
                        <p className="text-sm text-red-600">오디오 파일을 찾을 수 없어요.</p>
                    )}
                    <input aria-label="오디오 제목" placeholder="곡 제목" value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} className={input} />
                    <input aria-label="오디오 아티스트" placeholder="아티스트" value={b.artist} onChange={(e) => onChange({ ...b, artist: e.target.value })} className={input} />
                    <p className="text-sm text-neutral-500 leading-relaxed">제목·아티스트만 고칠 수 있어요. 오디오 파일을 새로 올리거나 바꾸려면 /admin에서 해 주세요.</p>
                </div>
            );
        case "preserved":
            return (
                <p className="text-sm text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-lg p-3 leading-relaxed">
                    이 블록은 아직 이 화면에서 고칠 수 없어요. 내용은 그대로 유지되고, 순서만 바꿀 수 있습니다. (수정은 /admin에서)
                </p>
            );
    }
}

const titleOf = (b: BlockState) => (b.type === "preserved" ? `${PRESERVED_LABELS[b.rawType] ?? b.rawType} (편집 불가)` : BLOCK_META[b.type].label);

export default function WorkBlocksEditor({ initial, onDirty }: { initial: BlockState[]; onDirty: () => void }) {
    const [blocks, setBlocks] = useState<BlockState[]>(initial);
    const [dragFrom, setDragFrom] = useState<number | null>(null);

    const apply = (next: BlockState[]) => {
        setBlocks(next);
        onDirty();
    };

    return (
        <div id="blocks" tabIndex={-1} className="space-y-3 focus:outline-none">
            <input type="hidden" name="blocksJson" value={JSON.stringify(toPayload(blocks))} />

            {blocks.length === 0 && <p className="text-sm text-neutral-500">아직 블록이 없어요. 아래에서 추가해 주세요.</p>}

            {blocks.map((b, i) => (
                <div
                    key={b.key}
                    onDragOver={(e) => dragFrom !== null && e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom !== null) apply(move(blocks, dragFrom, i));
                        setDragFrom(null);
                    }}
                    className={`rounded-xl border bg-white p-4 ${dragFrom === i ? "opacity-40 border-black" : "border-neutral-300"}`}
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
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
                            <h3 className="font-black text-base truncate">{titleOf(b)}</h3>
                        </div>
                        <div className="flex items-center shrink-0">
                            <button type="button" aria-label={`${titleOf(b)} 위로 이동`} disabled={i === 0} onClick={() => apply(move(blocks, i, i - 1))} className={smallBtn}>▲</button>
                            <button type="button" aria-label={`${titleOf(b)} 아래로 이동`} disabled={i === blocks.length - 1} onClick={() => apply(move(blocks, i, i + 1))} className={smallBtn}>▼</button>
                            {b.type !== "preserved" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm("이 블록을 지울까요? 저장하기 전에는 홈페이지에 반영되지 않고, '변경 버리기'로 되돌릴 수 있어요.")) apply(blocks.filter((_, idx) => idx !== i));
                                    }}
                                    className={dangerBtn}
                                >
                                    블록 지우기
                                </button>
                            )}
                        </div>
                    </div>
                    <BlockBody b={b} onChange={(next) => apply(blocks.map((x, idx) => (idx === i ? next : x)))} />
                </div>
            ))}

            <div>
                <p className="text-sm font-bold mb-2">블록 추가</p>
                <p className="text-sm text-neutral-500 mb-2">오디오 블록은 파일 업로드가 필요해서 /admin에서 추가해 주세요.</p>
                <div className="flex flex-wrap gap-2">
                    {ADDABLE_TYPES.map((t: EditableType) => (
                        <button key={t} type="button" onClick={() => apply([...blocks, emptyBlock(t)])} className="h-10 px-4 rounded-lg border-2 border-black text-sm font-bold hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            + {BLOCK_META[t].label}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-sm text-neutral-500 leading-relaxed">
                내용이 비어 있는 블록·항목은 저장할 때 자동으로 빠집니다. 같은 작업물을 /admin에서 동시에 고치고 있으면 저장 시 덮어써질 수 있으니 한 곳에서만 편집해 주세요.
            </p>
        </div>
    );
}
