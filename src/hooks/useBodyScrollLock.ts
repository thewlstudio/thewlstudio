"use client";

import { useEffect } from "react";

/**
 * 메뉴, Preloader, 모달처럼 서로 독립적인 여러 UI가 각자 body 스크롤을
 * 잠그려고 하면, 먼저 열린 쪽이 열려 있는 동안 나중에 끝난 쪽이 스크롤을
 * 풀어버리는 충돌이 생길 수 있다 (예: Preloader가 실행되는 2초 동안 메뉴를
 * 열면, Preloader가 끝나면서 메뉴가 아직 열려 있는데도 스크롤이 풀림).
 * 잠금 요청을 토큰(symbol) 단위로 집계해, 요청이 하나라도 남아 있으면
 * 계속 잠가두고 전부 해제됐을 때만 원래 값으로 복원한다.
 */
const activeLocks = new Set<symbol>();
let previousBodyOverflow: string | null = null;

function acquireBodyScrollLock(token: symbol) {
    if (activeLocks.has(token)) return;

    if (activeLocks.size === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }

    activeLocks.add(token);
}

function releaseBodyScrollLock(token: symbol) {
    if (!activeLocks.delete(token)) return;

    if (activeLocks.size === 0) {
        document.body.style.overflow = previousBodyOverflow ?? "";
        previousBodyOverflow = null;
    }
}

export function useBodyScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;

        const token = Symbol("body-scroll-lock");
        acquireBodyScrollLock(token);

        return () => {
            releaseBodyScrollLock(token);
        };
    }, [active]);
}
