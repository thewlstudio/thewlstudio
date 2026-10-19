"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveCrew, createCrew, type SaveResult, type FieldError } from "../actions";
import { Section, Field, ErrorSummary, inputClass } from "../../_components/FormParts";
import { useGuardedForm } from "../../_components/useGuardedForm";
import { prepareImageFile, replaceInputFile } from "../../_components/imageUpload";
import { CREW_ICON_PRESETS } from "@/lib/crew-icons";
import { toState } from "@/lib/crew-sections";
import CrewSectionsEditor from "./CrewSectionsEditor";

export type CrewLinkRow = { key: string; url: string; iconRef: string };

export type CrewFormData = {
    _id: string;
    isActive: boolean;
    name: string;
    koName: string;
    role: string;
    slug: string;
    imageUrl: string | null;
    links: CrewLinkRow[];
    /** 서버에서 읽은 프로필 섹션 원본 (생성 화면에서는 빈 배열) */
    sections: unknown[];
};

const MAX_LINKS = 10;
function CrewFormInner({ data, mode, onDiscard }: { data: CrewFormData; mode: "create" | "edit"; onDiscard: () => void }) {
    const isCreate = mode === "create";
    const router = useRouter();
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(isCreate ? createCrew : saveCrew, null);

    const [isActive, setIsActive] = useState(data.isActive);
    const [rows, setRows] = useState<CrewLinkRow[]>(data.links);
    const [preview, setPreview] = useState({ name: data.name, koName: data.koName, role: data.role });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const keySeq = useRef(0);
    const shownPhoto = photoPreview ?? data.imageUrl;

    // 미저장 변경사항 추적·탭 닫기 경고·저장 성공 처리·오류 요약 포커스는 공통 훅이 담당한다
    const { isDirty, markDirty, summaryRef, handleListClick: handleListClick } = useGuardedForm(state);

    const updateRow = (i: number, patch: Partial<CrewLinkRow>) => {
        setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
        markDirty();
    };

    return (
        <form action={formAction} onChange={markDirty} className="space-y-5 pb-32">
            <input type="hidden" name="documentId" value={data._id} />
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
            <input type="hidden" name="linkCount" value={rows.length} />

            {state && !state.ok && state.fields && state.fields.length > 0 && <ErrorSummary fields={state.fields} summaryRef={summaryRef} />}

            {!isActive && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    지금 비공개 상태예요. 저장해도 홈페이지 크루 목록에는 나오지 않습니다.
                </div>
            )}

            {/* 미리보기 */}
            <div className="bg-neutral-100 rounded-2xl border border-neutral-200 p-4 md:p-5">
                <p className="text-sm font-bold text-neutral-600 mb-3">👀 목록에서 이렇게 보여요 (입력하면 바로 바뀝니다)</p>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
                    <div className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">사진 없음</div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-lg truncate">{preview.name || "영문 이름"}</p>
                        <p className="text-sm text-neutral-600 truncate">{preview.koName || "한글 이름"}</p>
                        <p className="text-xs font-bold tracking-widest text-neutral-500 uppercase truncate">{preview.role || "직책/역할"}</p>
                    </div>
                </div>
            </div>

            <Section step={1} title="기본 정보">
                <div>
                    <p className="text-sm font-bold mb-1.5">공개 상태</p>
                    <p className="text-sm text-neutral-600 mb-2 leading-relaxed">
                        잠시 목록에서 빼고 싶을 때는 삭제 대신 비공개로 바꿔주세요.
                    </p>
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

                <Field label="영문 이름" htmlFor="name" required hint="예: Baek Kwang-heum">
                    <input id="name" name="name" defaultValue={data.name} onChange={(e) => setPreview((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="한글 이름" htmlFor="koName" required hint="예: 백광흠">
                    <input id="koName" name="koName" defaultValue={data.koName} onChange={(e) => setPreview((p) => ({ ...p, koName: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="직책/역할" htmlFor="role" required hint="예: CEO / HEAD PRODUCER">
                    <input id="role" name="role" defaultValue={data.role} onChange={(e) => setPreview((p) => ({ ...p, role: e.target.value }))} className={inputClass} />
                </Field>

                {isCreate ? (
                    <Field label="주소(영문)" htmlFor="slug" required hint="홈페이지 주소에 들어가는 이름이에요. 영문 소문자, 숫자, 하이픈(-)만 가능합니다. 만든 뒤에는 바꿀 수 없어요. (예: vocal-scon)">
                        <input id="slug" name="slug" defaultValue="" autoCapitalize="none" spellCheck={false} className={inputClass} />
                    </Field>
                ) : (
                    <div>
                        <p className="text-sm font-bold mb-1.5">홈페이지 주소</p>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            /crew/<span className="font-mono">{data.slug}</span> — 주소를 바꾸면 기존 링크가 끊겨서 여기서는 바꿀 수 없어요.
                        </p>
                    </div>
                )}
            </Section>

            <Section step={2} title="프로필 사진">
                <div className="flex items-start gap-4">
                    <div className="relative w-24 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="프로필 사진 미리보기" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">사진 없음</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <label htmlFor="imageFile" className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors focus-within:outline-2 focus-within:outline-offset-2">
                            사진 고르기
                        </label>
                        <input
                            id="imageFile"
                            name="imageFile"
                            type="file"
                            accept="image/*"
                            required={isCreate}
                            className="sr-only"
                            onChange={async (e) => {
                                const input = e.target;
                                const picked = input.files?.[0];
                                if (!picked) {
                                    setPhotoPreview(null);
                                    setPhotoError(null);
                                    return;
                                }
                                const prepared = await prepareImageFile(picked);
                                if ("error" in prepared) {
                                    setPhotoError(prepared.error);
                                    input.value = "";
                                    setPhotoPreview(null);
                                    return;
                                }
                                replaceInputFile(input, prepared.file);
                                setPhotoError(null);
                                setPhotoPreview(URL.createObjectURL(prepared.file));
                            }}
                        />
                        {photoError ? (
                            <p role="alert" className="text-sm font-semibold text-red-600 mt-2">{photoError}</p>
                        ) : (
                            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                                {photoPreview ? "새 사진이 선택되었어요. 저장하면 바뀝니다." : isCreate ? "사진을 선택해 주세요." : "고르지 않으면 지금 사진이 그대로 유지됩니다."}
                            </p>
                        )}
                    </div>
                </div>
            </Section>

            <Section step={3} title="소셜 링크" hint="Instagram, YouTube 등 프로필에 보이는 아이콘 링크예요. 없으면 비워두셔도 됩니다.">
                {rows.map((row, i) => {
                    const known = CREW_ICON_PRESETS.some((p) => p.ref === row.iconRef);
                    return (
                        <div key={row.key} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                            {!row.key.startsWith("new-") && !row.key.startsWith("legacy-") && (
                                <input type="hidden" name={`linkKey_${i}`} value={row.key} />
                            )}
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold">링크 {i + 1}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRows((r) => r.filter((_, idx) => idx !== i));
                                        markDirty();
                                    }}
                                    className="py-2 text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm"
                                >
                                    이 링크 지우기
                                </button>
                            </div>
                            <Field label="종류" htmlFor={`linkIconKeep_${i}`}>
                                <select
                                    id={`linkIconKeep_${i}`}
                                    name={`linkIconKeep_${i}`}
                                    value={row.iconRef}
                                    onChange={(e) => updateRow(i, { iconRef: e.target.value })}
                                    className={inputClass}
                                >
                                    {CREW_ICON_PRESETS.map((p) => (
                                        <option key={p.ref} value={p.ref}>{p.label}</option>
                                    ))}
                                    {row.iconRef && !known && <option value={row.iconRef}>기존 아이콘 유지</option>}
                                    <option value="">기타 (아이콘 직접 올리기)</option>
                                </select>
                            </Field>
                            {row.iconRef === "" && (
                                <Field label="아이콘 이미지" htmlFor={`linkIconFile_${i}`} hint="작은 정사각형 이미지(PNG 권장)를 골라 주세요.">
                                    <input id={`linkIconFile_${i}`} name={`linkIconFile_${i}`} type="file" accept="image/*" className="text-sm" />
                                </Field>
                            )}
                            <Field label="링크 주소" htmlFor={`linkUrl_${i}`} hint="https://로 시작하는 주소를 붙여넣으세요.">
                                <input
                                    id={`linkUrl_${i}`}
                                    name={`linkUrl_${i}`}
                                    type="url"
                                    inputMode="url"
                                    placeholder="https://..."
                                    value={row.url}
                                    onChange={(e) => updateRow(i, { url: e.target.value })}
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    );
                })}
                {rows.length < MAX_LINKS && (
                    <button
                        type="button"
                        onClick={() => {
                            keySeq.current += 1;
                            setRows((r) => [...r, { key: `new-${keySeq.current}`, url: "", iconRef: CREW_ICON_PRESETS[0].ref }]);
                            markDirty();
                        }}
                        className="h-11 px-5 rounded-xl border-2 border-dashed border-neutral-400 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        + 링크 추가
                    </button>
                )}
            </Section>

            {!isCreate && (
                <Section
                    step={4}
                    title="프로필 섹션"
                    hint="크루 상세 페이지에 나오는 소개·경력 블록이에요. 순서는 ▲▼ 버튼이나 끌어서 바꿀 수 있어요."
                >
                    <div className="flex justify-end -mt-2">
                        <a href={`/crew/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            진짜 화면 보기 ↗ (저장한 내용 기준)
                        </a>
                    </div>
                    <CrewSectionsEditor initial={toState(data.sections)} onDirty={markDirty} failedState={state && !state.ok ? state : null} />
                </Section>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">{isCreate ? "추가하면" : "저장하면"} 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/crew" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
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
export default function CrewForm(props: { data: CrewFormData; mode?: "create" | "edit" }) {
    const [resetKey, setResetKey] = useState(0);
    return <CrewFormInner key={resetKey} data={props.data} mode={props.mode ?? "edit"} onDiscard={() => setResetKey((k) => k + 1)} />;
}
