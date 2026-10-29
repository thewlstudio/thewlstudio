"use client";

import { VisibilityBanner, VisibilityField } from "../../_components/VisibilityField";
import { useState } from "react";
import Link from "../../_components/GuardedLink";
import { saveWork, createWork } from "../actions";
import { Section, Field, ErrorSummary, inputClass, FieldErrorsProvider, InlineError } from "../../_components/FormParts";
import { useGuardedForm } from "../../_components/useGuardedForm";
import { useManagedFormAction, type ManagedFormSession } from "../../_components/useManagedFormAction";
import SaveStatus from "../../_components/SaveStatus";
import { useImageInput } from "../../_components/useImageInput";
import { toState } from "@/lib/work-blocks";
import WorkBlocksEditor from "./WorkBlocksEditor";
import { Eye } from "lucide-react";
import { publicDetailPath } from "@/lib/public-routes";
import CropButton from "../../_components/ImageCropper";

export type WorkFormData = {
    _id: string;
    _rev?: string;
    isActive: boolean;
    title: string;
    artist: string;
    slug: string;
    /** 달력 입력용 YYYY-MM-DD (저장 형식 "YYYY. MM. DD."은 서버에서 변환) */
    releaseDate: string;
    imageUrl: string | null;
    youtubeUrl: string;
    instagramId: string;
    instagramUrl: string;
    /** 서버에서 읽은 상세 페이지 콘텐츠 블록 원본 (생성 화면에서는 빈 배열) */
    blocks: unknown[];
};


function WorkFormInner({ data, mode, onDiscard, session }: { data: WorkFormData; mode: "create" | "edit"; onDiscard: () => void; session: ManagedFormSession }) {
    const isCreate = mode === "create";
    const publicPath = publicDetailPath("works", data.slug);
    const { state, formAction, isPending } = session;
    const [preview, setPreview] = useState({ title: data.title, artist: data.artist, releaseDate: data.releaseDate });
    const { preview: photoPreview, error: photoError, processing, onChange: onPhotoChange } = useImageInput();
    const shownPhoto = photoPreview ?? data.imageUrl;
    const [isActive, setIsActive] = useState(data.isActive);

    const { isDirty, markDirty, summaryRef, summaryFields, clientErrors, validateOnSubmit } = useGuardedForm(state, formAction, isPending);

    const prettyDate = preview.releaseDate ? preview.releaseDate.replace(/-/g, ". ") + "." : "";

    return (
        <FieldErrorsProvider value={clientErrors}>
        <form data-manage-form noValidate action={formAction} onChange={markDirty} onSubmit={validateOnSubmit} className="space-y-5 pb-32">
            <fieldset disabled={isPending} aria-busy={isPending} className="contents">
            <input type="hidden" name="documentId" value={data._id} />
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

            <ErrorSummary fields={summaryFields} summaryRef={summaryRef} />

            <VisibilityBanner isActive={isActive} where="홈페이지 Works 목록" />

            {/* 미리보기 */}
            <div data-tour="form-preview" className="bg-neutral-100 rounded-2xl border border-neutral-200 p-4 md:p-5">
                <p className="text-sm font-bold text-neutral-600 mb-3"><Eye size={16} strokeWidth={2} aria-hidden="true" className="inline-block align-[-3px] mr-1.5 shrink-0" />목록에서 이렇게 보여요 (입력하면 바로 바뀌어요)</p>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
                    <div className="relative w-24 aspect-square rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">이미지 없음</div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-lg truncate">{preview.title || "제목"}</p>
                        <p className="text-sm text-neutral-600 truncate">{preview.artist || "아티스트"}</p>
                        <p className="text-xs font-bold tracking-widest text-neutral-500 truncate">{prettyDate || "발매일"}</p>
                    </div>
                </div>
            </div>

            <Section step={1} title="기본 정보" help="**공개/비공개**로 홈페이지 표시를 바꿔요. **발매일**을 달력에서 고르면 목록이 최신순으로 자동 정렬돼요. 홈페이지 주소(영문)는 만든 뒤에 **바꿀 수 없어요**.">
                <VisibilityField isActive={isActive} where="홈페이지 Works 목록" onChange={(v) => { setIsActive(v); markDirty(); }} />

                <Field label="앨범(작품) 제목" htmlFor="title" required>
                    <input id="title" name="title" defaultValue={data.title} onChange={(e) => setPreview((p) => ({ ...p, title: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="아티스트" htmlFor="artist" required>
                    <input id="artist" name="artist" defaultValue={data.artist} onChange={(e) => setPreview((p) => ({ ...p, artist: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="발매일" htmlFor="releaseDate" required hint="달력에서 골라 주세요. 목록은 이 날짜로 최신순 정렬돼요.">
                    <input id="releaseDate" name="releaseDate" type="date" defaultValue={data.releaseDate} onChange={(e) => setPreview((p) => ({ ...p, releaseDate: e.target.value }))} className={inputClass} />
                </Field>

                {isCreate ? (
                    <Field label="주소(영문)" htmlFor="slug" required hint="홈페이지 주소에 들어가는 이름이에요. 영문 소문자, 숫자, 하이픈(-), 밑줄(_)만 가능해요. 만든 뒤에는 고정돼요. (예: folkfolio-2)">
                        <input id="slug" name="slug" defaultValue="" autoCapitalize="none" spellCheck={false} className={inputClass} />
                    </Field>
                ) : (
                    <div>
                        <p className="text-sm font-bold mb-1.5">홈페이지 주소</p>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            /works/<span className="font-mono">{data.slug}</span> — 주소를 바꾸면 기존 링크가 끊겨서 여기서는 고정돼 있어요.
                        </p>
                    </div>
                )}
            </Section>

            <Section tour="form-photo" step={2} title="커버 이미지" help="목록과 상세 맨 위에 나오는 정사각형 이미지예요. **사진 자르기**에서 1:1을 고르면 딱 맞아요.">
                <div className="flex items-start gap-4">
                    <div className="relative w-28 aspect-square shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                        {shownPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shownPhoto} alt="커버 이미지 미리보기" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">이미지 없음</div>
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
                            aria-busy={processing}
                            onChange={onPhotoChange}
                        />
                        <span className="inline-block ml-2 align-top">
                            <CropButton inputId={"imageFile"} currentUrl={data.imageUrl} defaultRatio={1} />
                        </span>
                        {processing ? <p role="status" className="text-sm text-neutral-600 mt-2">사진을 준비하는 중…</p> : photoError ? (
                            <p role="alert" className="text-sm font-semibold text-red-600 mt-2">{photoError}</p>
                        ) : (
                            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                                {photoPreview ? "새 이미지를 골랐어요. 저장하면 바뀌어요." : isCreate ? "이미지를 선택해 주세요." : "고르지 않으면 지금 이미지가 그대로 유지돼요."}
                            </p>
                        )}
                    </div>
                </div>
            <InlineError id="imageFile" />
            </Section>

            <Section step={3} title="링크" help="모두 선택 사항이에요. 유튜브 주소를 넣으면 **커버를 눌렀을 때** 영상이 열려요." hint="모두 선택 사항이에요. 비워 두면 사이트에서 해당 버튼이 나오지 않을 수 있어요.">
                <Field label="유튜브 주소 (커버를 눌렀을 때 열림)" htmlFor="youtubeUrl" hint="브라우저 주소창의 주소를 복사해 붙여넣어 주세요.">
                    <input id="youtubeUrl" name="youtubeUrl" type="url" inputMode="url" placeholder="https://..." defaultValue={data.youtubeUrl} className={inputClass} />
                </Field>
                <Field label="인스타그램 아이디" htmlFor="instagramId" hint="예: @warobaru">
                    <input id="instagramId" name="instagramId" defaultValue={data.instagramId} autoCapitalize="none" spellCheck={false} className={inputClass} />
                </Field>
                <Field label="인스타그램 프로필 주소" htmlFor="instagramUrl" hint="브라우저 주소창의 주소를 복사해 붙여넣어 주세요.">
                    <input id="instagramUrl" name="instagramUrl" type="url" inputMode="url" placeholder="https://..." defaultValue={data.instagramUrl} className={inputClass} />
                </Field>
            </Section>

            {!isCreate && (
                <Section tour="works-blocks" step={4} title="상세 페이지 내용" help="설명·크레딧·트랙리스트·인사말·이미지·유튜브를 **블록**으로 쌓아요. 블록 추가 → 채우기 → 저장 순서예요. 오디오 파일을 새로 올리는 것은 /admin에서만 할 수 있어요." hint="작업물 상세 페이지에 나오는 설명·크레딧·트랙리스트·인사말 블록이에요. 순서는 ▲▼ 버튼이나 끌어서 바꿀 수 있어요.">
                    <div className="flex justify-end -mt-2">
                        {publicPath ? <a href={publicPath} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            진짜 화면 보기 ↗ (저장한 내용 기준)
                        </a> : <p className="py-2 text-sm text-neutral-600">공개 주소를 확인하지 못했어요. /admin에서 주소를 확인해 주세요.</p>}
                    </div>
                    <WorkBlocksEditor initial={toState(data.blocks)} onDirty={markDirty} failedState={state && !state.ok ? state : null} />
                </Section>
            )}

            <div data-tour="form-save-bar" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">{isCreate ? "추가하면" : "저장하면"} 홈페이지에 바로 반영돼요.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/works" className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        목록
                    </Link>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("변경한 내용을 모두 버릴까요? 되돌릴 수 없어요.")) onDiscard();
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
                <SaveStatus state={state} />
            </div>
            </fieldset>
        </form>
        </FieldErrorsProvider>
    );
}

/** "변경 버리기"를 누르면 key를 바꿔 폼 전체를 최신 data로 다시 마운트한다 */
export default function WorkForm(props: { data: WorkFormData; mode?: "create" | "edit" }) {
    const session = useManagedFormAction(props.mode === "create" ? createWork : saveWork, props.data._rev);
    return <WorkFormInner key={session.formKey} data={props.data} mode={props.mode ?? "edit"} onDiscard={session.onDiscard} session={session} />;
}
