"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { focusPageElement, isManagePath, isStudioPath, pageFocusTarget, PAGE_TITLE_ID } from '@/lib/page-focus';

/** 최초 진입·탐색 기록 복원은 그대로 두고, 공개 SPA 이동의 본문 시작만 안내한다. */
export default function PageNavigationFocus() {
    const pathname = usePathname();
    const previousPath = useRef(pathname);
    const previousTitle = useRef<HTMLElement | null>(null);
    const historyPath = useRef<string | null>(null);
    useEffect(() => {
        const onPopState = () => { historyPath.current = location.pathname; };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);
    useEffect(() => {
        const changed = previousPath.current !== pathname;
        const oldTitle = previousTitle.current;
        const restoreHistory = historyPath.current === location.pathname;
        previousPath.current = pathname;
        historyPath.current = null;
        if (isManagePath(pathname) || isStudioPath(pathname)) { previousTitle.current = null; return; }

        const apply = () => {
            const title = document.getElementById(PAGE_TITLE_ID);
            // URL이 먼저 바뀌고 이전 본문이 남는 스트리밍 구간에는 포커스를 주지 않는다.
            if (!title || (changed && (title.dataset.pagePath ? title.dataset.pagePath !== pathname : title === oldTitle))) return false;
            previousTitle.current = title;
            if (!changed || restoreHistory) return true;
            if (title.closest('[inert]')) return false;
            // 새 화면에서 이미 누른 링크·입력칸·대화상자의 포커스는 빼앗지 않는다.
            if (document.activeElement !== document.body) return true;
            return focusPageElement(pageFocusTarget(location.hash), { reveal: true });
        };
        if (apply()) return;
        const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'data-page-path'] });
        return () => observer.disconnect();
    }, [pathname]);
    return null;
}
