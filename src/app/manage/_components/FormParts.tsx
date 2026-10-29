"use client";

import { cloneElement, createContext, isValidElement, useContext } from "react";
import Rich from "./Rich";
import HelpTip from "./HelpTip";

type FieldError = { id: string; label: string };

/** 폼이 제출 전에 찾아낸 칸별 오류(칸 id → 안내 문구). Field가 칸 바로 아래에 보여 준다. */
const FieldErrorsContext = createContext<Record<string, string>>({});
export const FieldErrorsProvider = FieldErrorsContext.Provider;

/** Field로 감싸기 어려운 칸(사진 선택 등)의 오류 안내를 원하는 자리에 보여 준다 */
export function InlineError({ id }: { id: string }) {
    const error = useContext(FieldErrorsContext)[id];
    if (!error) return null;
    return (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-red-600 mt-2">
            {error}
        </p>
    );
}

/** /manage 폼들이 공유하는 화면 조각 (강사·크루). 스타일은 강사 화면 기준. */

export function Section({
    id,
    step,
    title,
    hint,
    help,
    tour,
    children,
}: {
    /** 오류 요약에서 입력 묶음으로 이동할 때 사용하는 포커스 대상 */
    id?: string;
    step: number;
    title: string;
    hint?: string;
    /** 제목 옆 "?"를 눌렀을 때 펼쳐지는 설명 (**강조** 가능) */
    help?: string;
    /** 화면 안내(투어)가 가리킬 이름 → data-tour */
    tour?: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} tabIndex={id ? -1 : undefined} data-tour={tour ?? (step === 1 ? "form-first" : undefined)} className="bg-white rounded-2xl border border-neutral-200 p-5 md:p-6">
            <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                        {step}
                    </span>
                    <h2 className="text-lg font-black tracking-tight">{title}</h2>
                    {help && <HelpTip title={title} body={help} />}
                </div>
                {hint && (
                    <p className="text-sm text-neutral-600 leading-relaxed pl-8.5">
                        <Rich text={hint} />
                    </p>
                )}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

export function Field({
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
    const error = useContext(FieldErrorsContext)[htmlFor];
    // 입력칸에 오류 상태와 안내 문구 연결 (스크린 리더용) — 칸이 하나일 때만
    const control =
        error && isValidElement<Record<string, unknown>>(children)
            ? cloneElement(children, { "aria-invalid": true, "aria-describedby": `${htmlFor}-error` })
            : children;
    return (
        <div data-field-required={required ? "true" : undefined} data-field-for={htmlFor} data-field-label={label}>
            <label htmlFor={htmlFor} className="block text-sm font-bold mb-1.5">
                {label}
                {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {hint && (
                <p className="text-sm text-neutral-600 mb-2 leading-relaxed">
                    <Rich text={hint} />
                </p>
            )}
            {control}
            {error && (
                <p id={`${htmlFor}-error`} role="alert" className="text-sm font-semibold text-red-600 mt-1.5">
                    {error}
                </p>
            )}
        </div>
    );
}

export const inputClass =
    "w-full h-12 px-4 rounded-xl border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50";
export const textareaClass =
    "w-full px-4 py-3 rounded-xl border border-neutral-300 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-black aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50";

/** 저장 실패 시 상단에 뜨는 오류 요약. 각 항목을 누르면 해당 입력칸으로 이동한다. */
export function ErrorSummary({
    fields,
    summaryRef,
}: {
    fields: FieldError[];
    summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
    if (fields.length === 0) return null;
    return (
        <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border-2 border-red-400 bg-red-50 p-4 focus:outline-none"
        >
            <p className="text-sm font-bold text-red-700 mb-2">
                다음 항목을 확인해 주세요 ({fields.length}개)
            </p>
            <ul className="space-y-1.5">
                {fields.map((f) => (
                    <li key={f.id}>
                        <a
                            href={`#${f.id}`}
                            className="text-sm font-semibold text-red-700 underline underline-offset-4 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 rounded-sm"
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById(f.id);
                                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                // 사진 입력은 화면에 안 보이게 숨겨둔 요소라 포커스 링이 안 보인다.
                                // 그런 경우는 스크롤만 하고, 눈에 보이는 입력칸만 포커스한다.
                                const isHiddenFileInput = el instanceof HTMLInputElement && el.type === "file";
                                if (!isHiddenFileInput) el?.focus({ preventScroll: true });
                            }}
                        >
                            {f.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
