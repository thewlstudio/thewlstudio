"use client";

import { useActionState, useState, useId, useMemo } from "react";
import Link from "next/link";
import { saveInstructor, type SaveResult } from "../actions";

export type InstructorFormData = {
    _id: string;
    instructorName: string;
    category: string;
    subtitle: string;
    lessonInfo: string;
    about: string[];
    process: string[];
    order: number;
    imagePosition: string;
    portfolioUrl: string;
    portfolioText: string;
    portfolioBtn: string;
    imageUrl: string | null;
    modalImageUrl: string | null;
    bgImageUrl: string | null;
};

/**
 * 사진 위치 선택지.
 * 값은 Tailwind 클래스 문자열이지만 관리자에게는 보여주지 않는다.
 * ⚠️ 새 항목을 추가하려면 tailwind.config.ts의 safelist에도 반드시 등록해야 한다.
 */
const PHOTO_PRESETS = [
    { value: "object-top", label: "얼굴 위쪽" },
    { value: "object-center", label: "가운데" },
    { value: "object-[center_30%]", label: "조금 아래" },
    { value: "object-bottom", label: "아래쪽" },
    { value: "object-top scale-[1.5] origin-[center_30%]", label: "1.5배 확대" },
    { value: "object-top scale-[1.8] origin-[center_20%]", label: "1.8배 확대" },
] as const;

// ── 실시간 미리보기에 쓰는 값들 (실제 저장에는 영향 없음) ──────────────────────────

type PreviewState = {
    category: string;
    subtitle: string;
    instructorName: string;
    about: string[];
    process: string[];
    portfolioText: string;
    portfolioBtn: string;
};

function linesToArray(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

// ── 재사용 UI 조각 ────────────────────────────────────────────────────────────

function Section({
    step,
    title,
    hint,
    children,
}: {
    step: number;
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white rounded-2xl border border-neutral-200 p-5 md:p-6">
            <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                        {step}
                    </span>
                    <h2 className="text-lg font-black tracking-tight">{title}</h2>
                </div>
                {hint && <p className="text-sm text-neutral-600 leading-relaxed pl-8.5">{hint}</p>}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

function Field({
    label,
    hint,
    required,
    children,
    htmlFor,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    htmlFor: string;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-bold mb-1.5">
                {label}
                {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {hint && <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{hint}</p>}
            {children}
        </div>
    );
}

const inputClass =
    "w-full h-12 px-4 rounded-xl border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black";
const textareaClass =
    "w-full px-4 py-3 rounded-xl border border-neutral-300 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-black";

/** 사진 업로드 + 미리보기. onPreviewUrl로 부모(상단 결과 미리보기)에도 알려준다. */
function PhotoInput({
    name,
    label,
    whereText,
    howText,
    currentUrl,
    previewClassName,
    aspect,
    onPreviewUrl,
}: {
    name: string;
    label: string;
    /** 어디에 나오는지 */
    whereText: string;
    /** 어떻게 잘려/보이는지 */
    howText: string;
    currentUrl: string | null;
    previewClassName?: string;
    aspect: string;
    onPreviewUrl?: (url: string | null) => void;
}) {
    const id = useId();
    const [preview, setPreview] = useState<string | null>(null);
    const shown = preview ?? currentUrl;

    return (
        <div>
            <p className="text-sm font-bold mb-1.5">{label}</p>
            <p className="text-xs text-neutral-500 mb-0.5 leading-relaxed">📍 {whereText}</p>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">🖼️ {howText}</p>

            <div className="flex items-start gap-4">
                <div
                    className={`relative ${aspect} w-24 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200`}
                >
                    {shown ? (
                        // 미리보기는 blob URL일 수 있어 next/image 최적화 대상이 아니다
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={shown}
                            alt={`${label} 미리보기`}
                            className={`w-full h-full object-cover ${previewClassName ?? ""}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-neutral-400 text-center px-1">
                            사진 없음
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <label
                        htmlFor={id}
                        className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors focus-within:outline-2 focus-within:outline-offset-2"
                    >
                        사진 고르기
                    </label>
                    <input
                        id={id}
                        name={name}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            const url = file ? URL.createObjectURL(file) : null;
                            setPreview(url);
                            onPreviewUrl?.(url);
                        }}
                    />
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                        {preview
                            ? "새 사진이 선택되었습니다. 저장하면 바뀝니다."
                            : "고르지 않으면 지금 사진이 그대로 유지됩니다."}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── 상단 결과 미리보기 ────────────────────────────────────────────────────────

/** class 페이지의 실제 목록 줄과 최대한 비슷하게 축소 재현 */
function ListRowPreview({
    thumbUrl,
    photoPosition,
    category,
    instructorName,
}: {
    thumbUrl: string | null;
    photoPosition: string;
    category: string;
    instructorName: string;
}) {
    return (
        <div className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200 p-3">
            <div className="relative w-14 h-[4.7rem] shrink-0 rounded-sm overflow-hidden bg-neutral-200 border-2 border-white shadow">
                {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt="" className={`w-full h-full object-cover ${photoPosition}`} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-400">
                        사진
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-base font-black tracking-tighter uppercase truncate text-neutral-800">
                    {category || "클래스 이름"}
                </p>
                <p className="text-xs font-semibold text-neutral-500 truncate">
                    Inst. {instructorName || "강사 이름"}
                </p>
            </div>
        </div>
    );
}

/** 강사를 눌렀을 때 뜨는 팝업창을 최대한 비슷하게 축소 재현 */
function PopupPreview({
    modalUrl,
    category,
    subtitle,
    instructorName,
    about,
    process,
    portfolioText,
    portfolioBtn,
}: {
    modalUrl: string | null;
    category: string;
    subtitle: string;
    instructorName: string;
    about: string[];
    process: string[];
    portfolioText: string;
    portfolioBtn: string;
}) {
    const firstName = instructorName.split(" ")[0] || "강사 이름";
    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="flex">
                {/* 왼쪽: 글 정보 */}
                <div className="flex-1 min-w-0 p-4">
                    <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase truncate mb-1">
                        {category || "클래스 이름"}
                    </p>
                    <p className="text-sm font-black tracking-tight text-black leading-snug mb-1.5 break-keep line-clamp-2">
                        {subtitle || "한 줄 소개가 여기 크게 나와요"}
                    </p>
                    <p className="text-[10px] font-bold text-neutral-600 mb-2.5">Inst. {firstName}</p>

                    <p className="text-[9px] font-black tracking-widest text-neutral-400 uppercase mb-1">
                        About
                    </p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed break-keep line-clamp-2 mb-2">
                        {about[0] || "레슨 소개 첫 문단이 여기 나와요"}
                    </p>
                    {process.length > 0 && (
                        <p className="text-[9px] text-neutral-400">커리큘럼 {process.length}단계</p>
                    )}
                </div>

                {/* 오른쪽: 사진 + 작업물 */}
                <div className="w-24 shrink-0 bg-neutral-50 p-3 flex flex-col items-center border-l border-neutral-100">
                    <div className="relative w-14 h-[4.9rem] rounded-sm overflow-hidden bg-neutral-200 border-2 border-white shadow mb-2">
                        {modalUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={modalUrl} alt="" className="w-full h-full object-cover object-top" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-neutral-400">
                                사진
                            </div>
                        )}
                    </div>
                    <p className="text-[8px] text-neutral-400 text-center leading-tight break-keep line-clamp-2 mb-1.5">
                        {portfolioText || "작업물 설명"}
                    </p>
                    <div className="text-[8px] font-bold border border-black px-2 py-1 text-center whitespace-nowrap">
                        {portfolioBtn || "작업물 보기"}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LivePreview({
    preview,
    thumbUrl,
    modalUrl,
    photoPosition,
}: {
    preview: PreviewState;
    thumbUrl: string | null;
    modalUrl: string | null;
    photoPosition: string;
}) {
    return (
        <div className="bg-neutral-100 rounded-2xl border border-neutral-200 p-4 md:p-5">
            <p className="text-xs font-bold text-neutral-500 mb-3">
                👀 실제로 이렇게 보여요 (입력하면 바로 바뀝니다)
            </p>
            <div className="space-y-3">
                <div>
                    <p className="text-[10px] font-bold text-neutral-400 mb-1.5">① 클래스 목록 화면</p>
                    <ListRowPreview
                        thumbUrl={thumbUrl}
                        photoPosition={photoPosition}
                        category={preview.category}
                        instructorName={preview.instructorName}
                    />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-neutral-400 mb-1.5">② 이름을 누르면 뜨는 창</p>
                    <PopupPreview
                        modalUrl={modalUrl}
                        category={preview.category}
                        subtitle={preview.subtitle}
                        instructorName={preview.instructorName}
                        about={preview.about}
                        process={preview.process}
                        portfolioText={preview.portfolioText}
                        portfolioBtn={preview.portfolioBtn}
                    />
                </div>
            </div>
        </div>
    );
}

// ── 본체 ──────────────────────────────────────────────────────────────────────

export default function InstructorForm({ data }: { data: InstructorFormData }) {
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(
        saveInstructor,
        null,
    );

    const [photoPosition, setPhotoPosition] = useState(data.imagePosition || "object-top");
    const [thumbPreview, setThumbPreview] = useState<string | null>(null);
    const [modalPreview, setModalPreview] = useState<string | null>(null);
    const shownThumb = thumbPreview ?? data.imageUrl;
    const shownModal = modalPreview ?? data.modalImageUrl ?? data.imageUrl;

    // 실제 저장은 폼 필드 값(uncontrolled)을 그대로 쓰고,
    // 이 state는 오직 위쪽 "결과 미리보기"를 실시간으로 그리는 용도로만 쓴다.
    const [preview, setPreview] = useState<PreviewState>(() => ({
        category: data.category,
        subtitle: data.subtitle,
        instructorName: data.instructorName,
        about: data.about,
        process: data.process,
        portfolioText: data.portfolioText,
        portfolioBtn: data.portfolioBtn,
    }));

    const updatePreview = useMemo(
        () =>
            <K extends keyof PreviewState>(key: K) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const raw = e.target.value;
                setPreview((p) => ({
                    ...p,
                    [key]: key === "about" || key === "process" ? linesToArray(raw) : raw,
                }));
            },
        [],
    );

    return (
        <form action={formAction} className="space-y-5 pb-32">
            <input type="hidden" name="documentId" value={data._id} />
            <input type="hidden" name="imagePosition" value={photoPosition} />

            <LivePreview
                preview={preview}
                thumbUrl={shownThumb}
                modalUrl={shownModal}
                photoPosition={photoPosition}
            />

            {/* 1. 기본 정보 */}
            <Section step={1} title="기본 정보">
                <Field label="강사 이름" htmlFor="instructorName" required hint="한글 이름만 적어주세요. (예: 박인국)">
                    <input
                        id="instructorName"
                        name="instructorName"
                        defaultValue={data.instructorName}
                        onChange={updatePreview("instructorName")}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field label="클래스 이름" htmlFor="category" required hint="영문 대문자로 적어주세요. (예: FLUTE CLASS)">
                    <input
                        id="category"
                        name="category"
                        defaultValue={data.category}
                        onChange={updatePreview("category")}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="보여지는 순서"
                    htmlFor="order"
                    hint="숫자가 작을수록 목록에서 위에 나옵니다."
                >
                    <input
                        id="order"
                        name="order"
                        type="number"
                        inputMode="numeric"
                        defaultValue={data.order}
                        className={`${inputClass} max-w-28`}
                    />
                </Field>
            </Section>

            {/* 2. 사진 */}
            <Section
                step={2}
                title="사진"
                hint="사진은 총 3장이 필요합니다. 바꾸고 싶은 것만 고르시면 됩니다. 위 미리보기에서 바로 확인하세요."
            >
                <div>
                    <p className="text-sm font-bold mb-1.5">목록에 보이는 사진</p>
                    <p className="text-xs text-neutral-500 mb-0.5 leading-relaxed">
                        📍 위 미리보기 ① 클래스 목록 화면의 왼쪽 네모 칸
                    </p>
                    <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                        🖼️ 세로로 긴 네모 모양으로 잘려서 나와요. 얼굴이 잘리면 아래 &quot;사진에서 보여줄 부분&quot;에서 조정하세요.
                    </p>
                    <div className="flex items-start gap-4">
                        <div className="relative w-24 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                            {shownThumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={shownThumb}
                                    alt="목록 사진 미리보기"
                                    className={`w-full h-full object-cover ${photoPosition}`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[11px] text-neutral-400">
                                    사진 없음
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <label
                                htmlFor="imageFile"
                                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-black bg-white text-sm font-bold cursor-pointer hover:bg-black hover:text-white transition-colors"
                            >
                                사진 고르기
                            </label>
                            <input
                                id="imageFile"
                                name="imageFile"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    setThumbPreview(file ? URL.createObjectURL(file) : null);
                                }}
                            />
                            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                                {thumbPreview
                                    ? "새 사진이 선택되었습니다."
                                    : "고르지 않으면 지금 사진이 유지됩니다."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 사진 위치 — 눈으로 보고 고른다 */}
                <fieldset>
                    <legend className="text-sm font-bold mb-1.5">사진에서 보여줄 부분</legend>
                    <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                        얼굴이 잘리거나 너무 작으면 아래에서 골라보세요. 위 미리보기가 바로 바뀝니다.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {PHOTO_PRESETS.map((preset) => {
                            const selected = photoPosition === preset.value;
                            return (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setPhotoPosition(preset.value)}
                                    aria-pressed={selected}
                                    className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                                        selected
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                <hr className="border-neutral-200" />

                <PhotoInput
                    name="modalImageFile"
                    label="팝업창 사진"
                    whereText="위 미리보기 ② 팝업창의 오른쪽 위 네모 칸"
                    howText="꾸미지 않은 원본 인물사진이 잘 어울려요. 위치 조정은 되지 않으니 얼굴이 가운데쯤 오는 사진을 골라주세요."
                    currentUrl={data.modalImageUrl}
                    aspect="aspect-[3/4]"
                    onPreviewUrl={setModalPreview}
                />

                <PhotoInput
                    name="bgImageFile"
                    label="배경 사진"
                    whereText="목록 화면에서 이 강사 줄에 마우스를 올렸을 때"
                    howText="흑백으로 흐릿하게, 오른쪽에 크게 깔리는 장식용 사진이에요. 없어도 크게 표 안 나요."
                    currentUrl={data.bgImageUrl}
                    aspect="aspect-[3/4]"
                    previewClassName="grayscale opacity-60"
                />
            </Section>

            {/* 3. 소개 글 */}
            <Section step={3} title="소개 글">
                <Field
                    label="한 줄 소개"
                    htmlFor="subtitle"
                    required
                    hint="팝업창 제목 아래에 들어가는 짧은 문구입니다."
                >
                    <input
                        id="subtitle"
                        name="subtitle"
                        defaultValue={data.subtitle}
                        onChange={updatePreview("subtitle")}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="레슨 형태"
                    htmlFor="lessonInfo"
                    required
                    hint="예: 1:1 Private & Group Lesson"
                >
                    <input
                        id="lessonInfo"
                        name="lessonInfo"
                        defaultValue={data.lessonInfo}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="레슨 소개"
                    htmlFor="about"
                    required
                    hint="줄을 바꾸면 문단이 나뉩니다. 엔터를 눌러 여러 문단을 쓰세요."
                >
                    <textarea
                        id="about"
                        name="about"
                        rows={5}
                        defaultValue={data.about.join("\n")}
                        onChange={updatePreview("about")}
                        required
                        className={textareaClass}
                    />
                </Field>

                <Field
                    label="커리큘럼"
                    htmlFor="process"
                    required
                    hint="한 줄에 하나씩 적어주세요."
                >
                    <textarea
                        id="process"
                        name="process"
                        rows={5}
                        defaultValue={data.process.join("\n")}
                        onChange={updatePreview("process")}
                        required
                        className={textareaClass}
                    />
                </Field>
            </Section>

            {/* 4. 작업물 (선택) */}
            <Section
                step={4}
                title="작업물 링크"
                hint="없으면 비워두셔도 됩니다."
            >
                <Field label="링크 주소" htmlFor="portfolioUrl" hint="유튜브, 인스타그램 등 주소를 붙여넣으세요.">
                    <input
                        id="portfolioUrl"
                        name="portfolioUrl"
                        type="url"
                        inputMode="url"
                        placeholder="https://..."
                        defaultValue={data.portfolioUrl}
                        className={inputClass}
                    />
                </Field>

                <Field label="버튼 위 설명" htmlFor="portfolioText">
                    <textarea
                        id="portfolioText"
                        name="portfolioText"
                        rows={2}
                        defaultValue={data.portfolioText}
                        onChange={updatePreview("portfolioText")}
                        className={textareaClass}
                    />
                </Field>

                <Field label="버튼에 쓸 글자" htmlFor="portfolioBtn" hint="예: 작업물 보기, 작업물 듣기">
                    <input
                        id="portfolioBtn"
                        name="portfolioBtn"
                        defaultValue={data.portfolioBtn}
                        onChange={updatePreview("portfolioBtn")}
                        className={inputClass}
                    />
                </Field>
            </Section>

            {/* 저장 바 — 화면 아래 고정 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link
                        href="/manage/instructors"
                        className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors"
                    >
                        목록
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 h-12 rounded-xl bg-black text-white font-bold disabled:opacity-50 hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        {isPending ? "저장하는 중…" : "저장하기"}
                    </button>
                </div>

                {state && (
                    <div className="max-w-2xl mx-auto mt-2" role="status" aria-live="polite">
                        {state.ok ? (
                            <p className="text-sm font-bold text-green-700">
                                저장했습니다. 홈페이지에 바로 반영됩니다.
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-red-600">{state.error}</p>
                        )}
                    </div>
                )}
            </div>
        </form>
    );
}
