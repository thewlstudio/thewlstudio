"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveSpace, createSpace, type SaveResult } from "../actions";
import { Section, Field, ErrorSummary, inputClass, textareaClass } from "../../_components/FormParts";
import { useGuardedForm } from "../../_components/useGuardedForm";
import { prepareImageFile, replaceInputFile } from "../../_components/imageUpload";
import { LinesEditor, dangerBtn, dashedBtn, move, smallBtn } from "../../_components/listUi";

type PriceRow = { key: string; label: string; value: string; unit: string };
type ImageRow = { key: string; url: string | null };

export type SpaceFormData = {
    _id: string;
    kind: "room" | "lobby";
    isActive: boolean;
    name: string;
    subtitle: string;
    description: string;
    prices: PriceRow[];
    features: string[];
    notes: string[];
    /** 저장돼 있는 사진 (생성 화면에서는 빈 배열) */
    images: { key: string; url: string }[];
};

const MAX_PRICES = 10;
const MAX_IMAGES = 20;

let seq = 0;
const newKey = () => `new-${Date.now().toString(36)}-${++seq}`;

/** 사진 한 장 행: 새 사진이면 파일 입력(spaceImage_<key>)으로 폼에 실려 서버가 올린다 */
function ImageItem({ row, index, count, onMove, onRemove, onPicked }: { row: ImageRow; index: number; count: number; onMove: (to: number) => void; onRemove: () => void; onPicked: () => void }) {
    const isNew = row.key.startsWith("new-");
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const shown = preview ?? row.url;
    const id = `spaceImage-${row.key}`;
    return (
        <div className="rounded-xl border border-neutral-200 p-3 flex items-start gap-3">
            <div className="relative w-28 aspect-[4/3] shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                {shown ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shown} alt={`사진 ${index + 1} 미리보기`} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">사진 없음</div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                    <p className="text-sm font-bold">사진 {index + 1}</p>
                    <div className="flex items-center">
                        <button type="button" aria-label={`사진 ${index + 1} 앞으로`} disabled={index === 0} onClick={() => onMove(index - 1)} className={smallBtn}>▲</button>
                        <button type="button" aria-label={`사진 ${index + 1} 뒤로`} disabled={index === count - 1} onClick={() => onMove(index + 1)} className={smallBtn}>▼</button>
                        <button type="button" aria-label={`사진 ${index + 1} 지우기`} onClick={onRemove} className={dangerBtn}>지우기</button>
                    </div>
                </div>
                <label htmlFor={id} className="inline-flex items-center justify-center h-9 px-3 rounded-lg border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors focus-within:outline-2 focus-within:outline-offset-2">
                    {isNew || !row.url ? "사진 고르기" : "다른 사진으로 바꾸기"}
                </label>
                <input
                    id={id}
                    name={`spaceImage_${row.key}`}
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
                        onPicked();
                    }}
                />
                {error ? (
                    <p role="alert" className="text-sm font-semibold text-red-600 mt-1.5">{error}</p>
                ) : (
                    <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                        {preview ? "새 사진이 선택되었어요. 저장하면 바뀝니다." : isNew ? "사진을 선택해 주세요. 없으면 저장할 때 빠집니다." : "고르지 않으면 지금 사진이 유지됩니다."}
                    </p>
                )}
            </div>
        </div>
    );
}

function SpaceFormInner({ data, mode, onDiscard }: { data: SpaceFormData; mode: "create" | "edit"; onDiscard: () => void }) {
    const isCreate = mode === "create";
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(isCreate ? createSpace : saveSpace, null);

    const [kind, setKind] = useState<"room" | "lobby">(data.kind);
    const [isActive, setIsActive] = useState(data.isActive);
    const [prices, setPrices] = useState<PriceRow[]>(data.prices);
    const [features, setFeatures] = useState<string[]>(data.features);
    const [notes, setNotes] = useState<string[]>(data.notes);
    const [images, setImages] = useState<ImageRow[]>(data.images);

    const { isDirty, markDirty, summaryRef, handleListClick } = useGuardedForm(state);
    const isLobby = kind === "lobby";

    const listsJson = JSON.stringify({
        prices: prices.map((p) => ({ _key: p.key, label: p.label, value: p.value, unit: p.unit })),
        features,
        notes,
        images: images.map((im) => ({ _key: im.key })),
    });

    const updatePrice = (i: number, patch: Partial<PriceRow>) => {
        setPrices((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
        markDirty();
    };
    const apply = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        markDirty();
    };

    return (
        <form action={formAction} onChange={markDirty} className="space-y-5 pb-32">
            <input type="hidden" name="documentId" value={data._id} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
            <input type="hidden" name="listsJson" value={listsJson} />

            {state && !state.ok && state.fields && state.fields.length > 0 && <ErrorSummary fields={state.fields} summaryRef={summaryRef} />}

            {!isActive && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    지금 비공개 상태예요. 저장해도 홈페이지 스튜디오 페이지에는 나오지 않습니다.
                </div>
            )}

            <Section step={1} title="기본 정보">
                {isCreate && (
                    <div>
                        <p className="text-sm font-bold mb-1.5">종류</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(["room", "lobby"] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    aria-pressed={kind === v}
                                    onClick={() => {
                                        setKind(v);
                                        markDirty();
                                    }}
                                    className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${kind === v ? "bg-black text-white border-black" : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"}`}
                                >
                                    {v === "room" ? "연습실" : "로비"}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">로비는 홈페이지에 한 곳만 나옵니다. 만든 뒤에는 종류를 바꿀 수 없어요.</p>
                    </div>
                )}

                <div>
                    <p className="text-sm font-bold mb-1.5">공개 상태</p>
                    <p className="text-sm text-neutral-600 mb-2 leading-relaxed">잠시 빼고 싶을 때는 삭제 대신 비공개로 바꿔주세요.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[true, false].map((v) => (
                            <button
                                key={String(v)}
                                type="button"
                                aria-pressed={isActive === v}
                                onClick={() => {
                                    setIsActive(v);
                                    markDirty();
                                }}
                                className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${isActive === v ? "bg-black text-white border-black" : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"}`}
                            >
                                {v ? "공개" : "비공개"}
                            </button>
                        ))}
                    </div>
                </div>

                <Field
                    label="이름"
                    htmlFor="name"
                    required
                    hint={isLobby ? "큰 제목으로 나옵니다." : '꼭 "W.L Studio [A Room]" 형태로 적어 주세요. 대괄호 안이 큰 제목("A ROOM")이 됩니다.'}
                >
                    <input id="name" name="name" defaultValue={data.name} className={inputClass} />
                </Field>

                {isLobby && (
                    <>
                        <Field label="소제목" htmlFor="subtitle" hint="이름 위에 작게 나옵니다. 예: 로비 & 1인 데스크">
                            <input id="subtitle" name="subtitle" defaultValue={data.subtitle} className={inputClass} />
                        </Field>
                        <Field label="소개글" htmlFor="description" hint="따옴표로 감싸져 기울임체로 나옵니다.">
                            <textarea id="description" name="description" rows={6} defaultValue={data.description} className={textareaClass} />
                        </Field>
                    </>
                )}
            </Section>

            <Section step={2} title="사진" hint="홈페이지 사진 넘기기에 이 순서대로 나옵니다. 첫 번째 사진이 처음에 보여요.">
                {images.length === 0 && <p className="text-sm text-neutral-500">아직 사진이 없어요. 아래에서 추가해 주세요.</p>}
                {images.map((im, i) => (
                    <ImageItem
                        key={im.key}
                        row={im}
                        index={i}
                        count={images.length}
                        onMove={(to) => apply(setImages)(move(images, i, to))}
                        onRemove={() => {
                            if (window.confirm("이 사진을 지울까요? 저장하기 전에는 홈페이지에 반영되지 않고, '변경 버리기'로 되돌릴 수 있어요.")) apply(setImages)(images.filter((_, idx) => idx !== i));
                        }}
                        onPicked={markDirty}
                    />
                ))}
                {images.length < MAX_IMAGES && (
                    <button type="button" onClick={() => apply(setImages)([...images, { key: newKey(), url: null }])} className={dashedBtn}>+ 사진 추가</button>
                )}
            </Section>

            <Section step={3} title="가격" hint="예: 라벨 '기본' / 금액 '6,000' / 단위 '원 / 1H'. 라벨과 금액이 모두 비면 저장할 때 빠집니다.">
                {prices.map((p, i) => (
                    <div key={p.key} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold">가격 {i + 1}</p>
                            <div className="flex items-center">
                                <button type="button" aria-label={`가격 ${i + 1} 위로`} disabled={i === 0} onClick={() => apply(setPrices)(move(prices, i, i - 1))} className={smallBtn}>▲</button>
                                <button type="button" aria-label={`가격 ${i + 1} 아래로`} disabled={i === prices.length - 1} onClick={() => apply(setPrices)(move(prices, i, i + 1))} className={smallBtn}>▼</button>
                                <button type="button" aria-label={`가격 ${i + 1} 지우기`} onClick={() => apply(setPrices)(prices.filter((_, idx) => idx !== i))} className={dangerBtn}>지우기</button>
                            </div>
                        </div>
                        <Field label="라벨" htmlFor={`price-label-${p.key}`}>
                            <input id={`price-label-${p.key}`} value={p.label} onChange={(e) => updatePrice(i, { label: e.target.value })} className={inputClass} />
                        </Field>
                        <Field label="금액" htmlFor={`price-value-${p.key}`}>
                            <input id={`price-value-${p.key}`} value={p.value} onChange={(e) => updatePrice(i, { value: e.target.value })} className={inputClass} />
                        </Field>
                        <Field label="단위" htmlFor={`price-unit-${p.key}`}>
                            <input id={`price-unit-${p.key}`} value={p.unit} onChange={(e) => updatePrice(i, { unit: e.target.value })} className={inputClass} />
                        </Field>
                    </div>
                ))}
                {prices.length < MAX_PRICES && (
                    <button type="button" onClick={() => apply(setPrices)([...prices, { key: newKey(), label: "", value: "", unit: "원 / 1H" }])} className={dashedBtn}>+ 가격 추가</button>
                )}
            </Section>

            <Section step={4} title={isLobby ? "이용 규칙·특징" : "장비·특징"} hint="한 줄씩 적어 주세요. 홈페이지에 줄 앞에 — 표시와 함께 나옵니다. 비워둔 줄은 저장할 때 빠집니다.">
                <LinesEditor lines={features} onChange={apply(setFeatures)} label="특징" placeholder="예: 삼익 업라이트 피아노" />
            </Section>

            <Section step={5} title="안내 문구" hint="붉은 글씨로 맨 아래에 나옵니다. 없으면 비워두세요. (예: * 방음문 사용 안내)">
                <LinesEditor lines={notes} onChange={apply(setNotes)} label="안내 문구" placeholder="예: * 방음문: 열때는 아래로…" />
            </Section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">{isCreate ? "추가하면" : "저장하면"} 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/studio" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        목록
                    </Link>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("변경한 내용을 모두 버릴까요? 되돌릴 수 없습니다.")) onDiscard();
                            }}
                            className="h-12 px-4 rounded-xl border border-neutral-300 font-bold text-sm hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            변경 버리기
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 h-12 rounded-xl bg-black text-white font-bold disabled:opacity-50 hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        {isPending ? (isCreate ? "추가하는 중…" : "저장하는 중…") : isCreate ? "추가하기" : "저장하기"}
                    </button>
                </div>
                {state && (
                    <div className="max-w-2xl mx-auto mt-2" role="status" aria-live="polite">
                        {state.ok ? <p className="text-sm font-bold text-green-700">저장했습니다. 홈페이지에 바로 반영됩니다.</p> : <p className="text-sm font-bold text-red-600">{state.error}</p>}
                    </div>
                )}
            </div>
        </form>
    );
}

/** "변경 버리기"를 누르면 key를 바꿔 폼 전체를 최신 data로 다시 마운트한다 */
export default function SpaceForm(props: { data: SpaceFormData; mode?: "create" | "edit" }) {
    const [resetKey, setResetKey] = useState(0);
    return <SpaceFormInner key={resetKey} data={props.data} mode={props.mode ?? "edit"} onDiscard={() => setResetKey((k) => k + 1)} />;
}
