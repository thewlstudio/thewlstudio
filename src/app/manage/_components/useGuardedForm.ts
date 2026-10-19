"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setFormDirty } from "@/lib/formDirtyGuard";

type FormState = { ok: true } | { ok: false; fields?: unknown[] } | null;

/**
 * 관리 폼 공통: 미저장 변경사항 추적(허브 이동·로그아웃 가드와 공유), 탭 닫기 경고,
 * 저장 성공 시 dirty 해제 + 서버 데이터 새로고침, 저장 실패 시 오류 요약으로 포커스 이동.
 */
export function useGuardedForm(state: FormState) {
    const router = useRouter();
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
        setFormDirty(isDirty);
    }, [isDirty]);
    // 클라이언트 라우팅에서는 모듈이 유지되므로, 폼이 사라질 때 반드시 리셋한다
    useEffect(() => () => setFormDirty(false), []);

    // 저장 성공 시 dirty 해제 — effect 대신 렌더 중 이전 state와 비교(파생 state 리셋 패턴)
    const [lastHandled, setLastHandled] = useState(state);
    if (state !== lastHandled) {
        setLastHandled(state);
        if (state?.ok) setIsDirty(false);
    }
    // "변경 버리기"가 방금 저장한 값으로 돌아가도록 서버 데이터를 다시 받는다
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

    const markDirty = () => setIsDirty(true);
    /** "목록" 링크: 미저장 변경사항이 있으면 확인 */
    const handleListClick = (e: React.MouseEvent) => {
        if (!isDirty) return;
        if (!window.confirm("저장하지 않은 내용이 있어요. 그래도 나가시겠어요?")) e.preventDefault();
    };

    return { isDirty, markDirty, summaryRef, handleListClick };
}
