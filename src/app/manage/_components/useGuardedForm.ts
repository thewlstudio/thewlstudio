"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { isFormPending, setFormDirty, setFormPending } from "@/lib/formDirtyGuard";
import { eulReul } from "@/lib/josa";
import { listenForManageHistoryLeave } from "./manageHistoryGuard";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";

type FieldError = { id: string; label: string };
type FormState = { ok: true } | { ok: false; fields?: FieldError[] } | null;

/**
 * 관리 폼 공통:
 * - 미저장 변경사항 추적(허브 이동·로그아웃 가드와 공유), 탭 닫기 경고
 * - 저장 성공 시 dirty 해제, 저장 실패 시 입력 보존·오류 요약으로 포커스 이동
 * - 제출 전 필수 칸 검사: 비어 있으면 서버에 보내기 전에 칸 바로 아래에 안내하고 그 칸으로 이동
 * - Ctrl/Cmd+S로 저장
 */
export function useGuardedForm(state: FormState, formAction: (data: FormData) => void, isPending: boolean) {
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
        setFormDirty(isDirty);
    }, [isDirty]);
    // 클라이언트 라우팅에서는 모듈이 유지되므로, 폼이 사라질 때 반드시 리셋한다
    useEffect(() => () => {
        setFormDirty(false);
        setFormPending(false);
    }, []);

    // 저장 성공 시 dirty 해제 — effect 대신 렌더 중 이전 state와 비교(파생 state 리셋 패턴)
    const [lastHandled, setLastHandled] = useState(state);
    if (state !== lastHandled) {
        setLastHandled(state);
        if (state?.ok) setIsDirty(false);
    }
    const submitting = useRef(false);
    useEffect(() => {
        setFormPending(isPending);
        if (!isPending) submitting.current = false;
    }, [isPending, state]);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isDirtyRef.current && !isFormPending()) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    useEffect(() => listenForManageHistoryLeave(), []);

    // Ctrl/Cmd+S → 저장 (브라우저의 "페이지 저장" 대신)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                const form = document.querySelector<HTMLFormElement>("form[data-manage-form]");
                if (!form) return;
                e.preventDefault();
                form.requestSubmit();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── 제출 전 필수 칸 검사 ──
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const validateOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        // React의 form action 자동 reset은 {ok:false}도 성공으로 취급한다.
        // 기본 제출을 막고 직접 dispatch하여 오류·로그인 만료 시 입력과 파일을 보존한다.
        e.preventDefault();
        if (isPending || submitting.current || isManageMutationPending()) return;
        const found: Record<string, string> = {};
        let first: HTMLElement | null = null;
        e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((el) => {
            if (!el.id || el.disabled) return;
            const message = el.dataset.imageError ?? (el.dataset.imageProcessing || el.dataset.imageCropping
                ? "사진 준비를 마친 뒤 다시 저장해 주세요."
                : null);
            if (message) {
                found[el.id] = message;
                if (!first) first = el;
            }
        });
        e.currentTarget.querySelectorAll<HTMLElement>('[data-field-required="true"]').forEach((box) => {
            const id = box.dataset.fieldFor;
            if (!id) return;
            const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
            if (!el || el.disabled) return;
            if (el.value.trim() === "") {
                const label = box.dataset.fieldLabel ?? "이 칸";
                found[id] = `${label}${eulReul(label)} 입력해 주세요.`;
                if (!first) first = el;
            }
        });
        // 필수 사진 칸: 숨겨 둔 파일 입력이라 칸 자체가 아니라 "사진 고르기" 버튼 쪽으로 이동한다
        e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"][required]').forEach((el) => {
            if (el.id && !el.disabled && (el.files?.length ?? 0) === 0) {
                found[el.id] ??= "사진을 골라 주세요.";
                if (!first) first = document.querySelector<HTMLElement>(`label[for="${el.id}"]`) ?? el;
            }
        });
        if (Object.keys(found).length > 0) {
            setClientErrors(found);
            const target = first as HTMLElement | null;
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
            target?.focus({ preventScroll: true });
            return;
        }
        if (Object.keys(clientErrors).length > 0) setClientErrors({});
        // fieldset이 disabled 되기 전에 모든 입력·파일을 캡처한다.
        const data = new FormData(e.currentTarget);
        submitting.current = true;
        setFormPending(true);
        startTransition(() => formAction(data));
    };

    const summaryRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (state && !state.ok && state.fields && state.fields.length > 0) {
            summaryRef.current?.focus();
            summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [state]);
    // 서버가 돌려준 오류 요약 (클라이언트 검사는 칸 아래에 바로 보이므로 요약을 따로 만들지 않는다)
    const summaryFields: FieldError[] = state && !state.ok && state.fields ? state.fields : [];

    /** 폼 onChange에 연결: 변경 표시 + 고친 칸의 오류 안내 지우기 */
    const markDirty = (e?: React.SyntheticEvent) => {
        // 같은 이벤트 안에서 이동해도 effect를 기다리다 변경을 놓치지 않게 한다.
        isDirtyRef.current = true;
        setFormDirty(true);
        setIsDirty(true);
        const id = (e?.target as HTMLElement | undefined)?.id;
        if (id && clientErrors[id]) {
            setClientErrors((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };
    return { isDirty, markDirty, summaryRef, summaryFields, clientErrors, validateOnSubmit };
}
