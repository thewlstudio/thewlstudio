"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveWork, createWork, type SaveResult } from "../actions";
import { Section, Field, ErrorSummary, inputClass } from "../../_components/FormParts";
import { useGuardedForm } from "../../_components/useGuardedForm";

export type WorkFormData = {
    _id: string;
    title: string;
    artist: string;
    slug: string;
    /** 달력 입력용 YYYY-MM-DD (저장 형식 "YYYY. MM. DD."은 서버에서 변환) */
    releaseDate: string;
    imageUrl: string | null;
    youtubeUrl: string;
    instagramId: string;
    instagramUrl: string;
    /** 상세 페이지 콘텐츠 블록의 _type 목록 (이 단계에서는 읽기 전용 안내용) */
    blockSummary: string[];
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const BLOCK_LABELS: Record<string, string> = {
    descriptionBlock: "설명",
    creditGridBlock: "크레딧",
    tracklistBlock: "트랙리스트",
    signatureMessageBlock: "인사말",
    imageBlock: "이미지",
    videoEmbedBlock: "유튜브 영상",
    freeformTextBlock: "자유 서식",
    audioBlock: "오디오",
};

function WorkFormInner({ data, mode, onDiscard }: { data: WorkFormData; mode: "create" | "edit"; onDiscard: () => void }) {
    const isCreate = mode === "create";
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(isCreate ? createWork : saveWork, null);
    const [preview, setPreview] = useState({ title: data.title, artist: data.artist, releaseDate: data.releaseDate });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const shownPhoto = photoPreview ?? data.imageUrl;

    const { isDirty, markDirty, summaryRef, handleListClick } = useGuardedForm(state);

    const prettyDate = preview.releaseDate ? preview.releaseDate.replace(/-/g, ". ") + "." : "";

    return (
        <form action={formAction} onChange={markDirty} className="space-y-5 pb-32">
            <input type="hidden" name="documentId" value={data._id} />

            {state && !state.ok && state.fields && state.fields.length > 0 && <ErrorSummary fields={state.fields} summaryRef={summaryRef} />}

            {/* 미리보기 */}
            <div className="bg-neutral-100 rounded-2xl border border-neutral-200 p-4 md:p-5">
                <p className="text-sm font-bold text-neutral-600 mb-3">👀 목록에서 이렇게 보여요 (입력하면 바로 바뀝니다)</p>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
                    <div className="relative w-24 aspect-square rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">이미지 없음</div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-lg truncate">{preview.title || "제목"}</p>
                        <p className="text-sm text-neutral-600 truncate">{preview.artist || "아티스트"}</p>
                        <p className="text-xs font-bold tracking-widest text-neutral-500 truncate">{prettyDate || "발매일"}</p>
                    </div>
                </div>
            </div>

            <Section step={1} title="기본 정보">
                <Field label="앨범(작품) 제목" htmlFor="title" required>
                    <input id="title" name="title" defaultValue={data.title} onChange={(e) => setPreview((p) => ({ ...p, title: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="아티스트" htmlFor="artist" required>
                    <input id="artist" name="artist" defaultValue={data.artist} onChange={(e) => setPreview((p) => ({ ...p, artist: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="발매일" htmlFor="releaseDate" required hint="달력에서 골라 주세요. 목록은 이 날짜로 최신순 정렬됩니다.">
                    <input id="releaseDate" name="releaseDate" type="date" defaultValue={data.releaseDate} onChange={(e) => setPreview((p) => ({ ...p, releaseDate: e.target.value }))} className={inputClass} />
                </Field>

                {isCreate ? (
                    <Field label="주소(영문)" htmlFor="slug" required hint="홈페이지 주소에 들어가는 이름이에요. 영문 소문자, 숫자, 하이픈(-), 밑줄(_)만 가능합니다. 만든 뒤에는 바꿀 수 없어요. (예: folkfolio-2)">
                        <input id="slug" name="slug" defaultValue="" autoCapitalize="none" spellCheck={false} className={inputClass} />
                    </Field>
                ) : (
                    <div>
                        <p className="text-sm font-bold mb-1.5">홈페이지 주소</p>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            /works/<span className="font-mono">{data.slug}</span> — 주소를 바꾸면 기존 링크가 끊겨서 여기서는 바꿀 수 없어요.
                        </p>
                    </div>
                )}
            </Section>

            <Section step={2} title="커버 이미지">
                <div className="flex items-start gap-4">
                    <div className="relative w-28 aspect-square shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="커버 이미지 미리보기" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">이미지 없음</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <label htmlFor="imageFile" className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors focus-within:outline-2 focus-within:outline-offset-2">
                            이미지 고르기
                        </label>
                        <input
                            id="imageFile"
                            name="imageFile"
                            type="file"
                            accept="image/*"
                            required={isCreate}
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) {
                                    setPhotoPreview(null);
                                    setPhotoError(null);
                                    return;
                                }
                                if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
                                    setPhotoError(!file.type.startsWith("image/") ? "이미지 파일만 선택할 수 있어요." : `이미지 용량이 너무 커요 (${(file.size / 1024 / 1024).toFixed(1)}MB). 10MB 이하로 줄여 주세요.`);
                                    e.target.value = "";
                                    setPhotoPreview(null);
                                    return;
                                }
                                setPhotoError(null);
                                setPhotoPreview(URL.createObjectURL(file));
                            }}
                        />
                        {photoError ? (
                            <p role="alert" className="text-sm font-semibold text-red-600 mt-2">{photoError}</p>
                        ) : (
                            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                                {photoPreview ? "새 이미지가 선택되었어요. 저장하면 바뀝니다." : isCreate ? "이미지를 선택해 주세요." : "고르지 않으면 지금 이미지가 그대로 유지됩니다."}
                            </p>
                        )}
                    </div>
                </div>
            </Section>

            <Section step={3} title="링크" hint="모두 선택 사항이에요. 비워두면 사이트에서 해당 버튼이 나오지 않을 수 있습니다.">
                <Field label="유튜브 주소 (커버를 눌렀을 때 열림)" htmlFor="youtubeUrl" hint="https://로 시작하는 주소">
                    <input id="youtubeUrl" name="youtubeUrl" type="url" inputMode="url" placeholder="https://..." defaultValue={data.youtubeUrl} className={inputClass} />
                </Field>
                <Field label="인스타그램 아이디" htmlFor="instagramId" hint="예: @warobaru">
                    <input id="instagramId" name="instagramId" defaultValue={data.instagramId} autoCapitalize="none" spellCheck={false} className={inputClass} />
                </Field>
                <Field label="인스타그램 프로필 주소" htmlFor="instagramUrl" hint="https://로 시작하는 주소">
                    <input id="instagramUrl" name="instagramUrl" type="url" inputMode="url" placeholder="https://..." defaultValue={data.instagramUrl} className={inputClass} />
                </Field>
            </Section>

            {!isCreate && (
                <Section step={4} title="상세 페이지 내용" hint="설명·크레딧·트랙리스트 같은 상세 페이지 블록이에요. 이 화면에서는 아직 편집할 수 없고, 저장해도 그대로 유지됩니다.">
                    <p className="text-sm text-neutral-700 leading-relaxed">
                        {data.blockSummary.length === 0
                            ? "등록된 블록이 없습니다."
                            : `현재 ${data.blockSummary.length}개: ${data.blockSummary.map((t) => BLOCK_LABELS[t] ?? t).join(" → ")}`}
                    </p>
                    <a href={`/works/${data.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4">
                        진짜 화면 보기 ↗ (저장한 내용 기준)
                    </a>
                </Section>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">{isCreate ? "추가하면" : "저장하면"} 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/works" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors">
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
export default function WorkForm(props: { data: WorkFormData; mode?: "create" | "edit" }) {
    const [resetKey, setResetKey] = useState(0);
    return <WorkFormInner key={resetKey} data={props.data} mode={props.mode ?? "edit"} onDiscard={() => setResetKey((k) => k + 1)} />;
}
