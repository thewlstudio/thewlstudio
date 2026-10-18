"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveCrew, createCrew, type SaveResult, type FieldError } from "../actions";
import { setFormDirty } from "@/lib/formDirtyGuard";
import { CREW_ICON_PRESETS } from "@/lib/crew-icons";

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
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_LINKS = 10;
const inputClass =
    "w-full h-12 px-4 rounded-xl border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black";

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-2xl border border-neutral-200 p-5 md:p-6">
            <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-1.5">
                    <span aria-hidden="true" className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {step}
                    </span>
                    <h2 className="text-lg font-black tracking-tight">{title}</h2>
                </div>
                {hint && <p className="text-sm text-neutral-600 leading-relaxed">{hint}</p>}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

function Field({ label, hint, required, htmlFor, children }: { label: string; hint?: string; required?: boolean; htmlFor: string; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-bold mb-1.5">
                {label}
                {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {hint && <p className="text-sm text-neutral-600 mb-2 leading-relaxed">{hint}</p>}
            {children}
        </div>
    );
}

function ErrorSummary({ fields, summaryRef }: { fields: FieldError[]; summaryRef: React.RefObject<HTMLDivElement | null> }) {
    return (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-400 bg-red-50 p-4 focus:outline-none">
            <p className="text-sm font-bold text-red-700 mb-2">다음 항목을 확인해 주세요 ({fields.length}개)</p>
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
                                const hiddenFile = el instanceof HTMLInputElement && el.type === "file";
                                if (!hiddenFile) el?.focus({ preventScroll: true });
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

    // ── 미저장 변경사항 추적 (강사 화면과 동일한 방식, ManageNav와 공유) ──
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
        setFormDirty(isDirty);
    }, [isDirty]);
    useEffect(() => () => setFormDirty(false), []);
    const markDirty = () => setIsDirty(true);

    const [lastHandled, setLastHandled] = useState(state);
    if (state !== lastHandled) {
        setLastHandled(state);
        if (state?.ok) setIsDirty(false);
    }
    // 저장 성공 후 "변경 버리기"가 최초 로딩값이 아니라 방금 저장한 값으로 돌아가도록 서버 데이터를 다시 받는다
    useEffect(() => {
        if (state?.ok) router.refresh();
    }, [state, router]);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isDirtyRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    const summaryRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (state && !state.ok && state.fields && state.fields.length > 0) {
            summaryRef.current?.focus();
            summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [state]);

    const handleListClick = (e: React.MouseEvent) => {
        if (!isDirty) return;
        if (!window.confirm("저장하지 않은 내용이 있어요. 그래도 나가시겠어요?")) e.preventDefault();
    };

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
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) {
                                    setPhotoPreview(null);
                                    setPhotoError(null);
                                    return;
                                }
                                if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
                                    setPhotoError(!file.type.startsWith("image/") ? "이미지 파일만 선택할 수 있어요." : `사진 용량이 너무 커요 (${(file.size / 1024 / 1024).toFixed(1)}MB). 10MB 이하로 줄여 주세요.`);
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
                                    className="text-sm font-semibold text-red-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm"
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
                <p className="text-sm text-neutral-500 leading-relaxed">
                    소개·경력 같은 프로필 섹션은 아직 이 화면에서 수정할 수 없어요(저장해도 그대로 유지됩니다). 지금은 개발자에게 요청해 /admin에서 수정해 주세요.
                </p>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">{isCreate ? "추가하면" : "저장하면"} 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/crew" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors">
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
