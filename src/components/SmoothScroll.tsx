"use client";

import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

// OS의 "동작 줄이기(prefers-reduced-motion)" 설정을 구독한다.
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void) {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
}

export function usePrefersReducedMotion() {
    return useSyncExternalStore(
        subscribeReducedMotion,
        () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
        () => false, // 서버 렌더 시에는 false로 가정 (하이드레이션 불일치 방지)
    );
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const prefersReducedMotion = usePrefersReducedMotion();

    // Sanity Studio(/admin), 관리 화면(/manage)에서는 Lenis 비활성화
    // — 폼 입력, 드롭다운 등 관리 화면 조작과 충돌 방지, 안정성 우선
    // 동작 줄이기 설정 시에도 비활성화 — 스크롤 하이재킹은 어지럼증을 유발할 수 있음
    if (pathname.startsWith('/admin') || pathname.startsWith('/manage') || prefersReducedMotion) {
        return <>{children}</>;
    }

    return (
        <ReactLenis root options={{ lerp: 0.15, smoothWheel: true }}>
            {children}
        </ReactLenis>
    );
}
