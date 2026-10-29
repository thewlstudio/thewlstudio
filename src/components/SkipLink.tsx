"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { focusPageElement, isManagePath, isStudioPath, PAGE_TITLE_ID } from '@/lib/page-focus';

export default function SkipLink() {
    const pathname = usePathname();
    const pending = useRef<MutationObserver | null>(null);
    useEffect(() => () => { pending.current?.disconnect(); pending.current = null; }, [pathname]);
    if (isStudioPath(pathname)) return null; // Studio는 별도 앱이며 이 사이트의 main 대상이 없다.
    const targetId = isManagePath(pathname) ? 'main-content' : PAGE_TITLE_ID;
    return <Link id="skip-link" href={`#${targetId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold focus:shadow-lg"
        onNavigate={() => { focusPageElement(document.getElementById(targetId)); }}
        onClick={(event) => {
            pending.current?.disconnect(); pending.current = null;
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || document.getElementById(targetId)) return;
            // 스트리밍 중 눌렀다면, 같은 화면의 실제 본문이 준비될 때 요청을 마친다.
            const originPath = location.pathname;
            const link = event.currentTarget;
            const observer = new MutationObserver(() => {
                if (location.pathname !== originPath || location.hash !== `#${targetId}` || !link.isConnected || (document.activeElement !== link && document.activeElement !== document.body)) {
                    observer.disconnect(); return;
                }
                const target = document.getElementById(targetId);
                if (focusPageElement(target)) {
                    target!.scrollIntoView({ block: 'start', behavior: 'auto' });
                    observer.disconnect();
                }
            });
            pending.current = observer;
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] });
        }}>본문 바로가기</Link>;
}
