"use client";

import { ReactLenis, useLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { isBodyScrollLocked, subscribeBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
export { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/** body 잠금과 Lenis의 가상 스크롤 처리를 함께 멈춘다. */
function ScrollLockBridge() {
    const lenis = useLenis();
    const stoppedByBridge = useRef<typeof lenis>(undefined);
    const locked = useSyncExternalStore(subscribeBodyScrollLock, isBodyScrollLocked, () => false);
    useEffect(() => {
        if (!lenis) return;
        if (locked && !lenis.isStopped) {
            lenis.stop();
            stoppedByBridge.current = lenis;
        } else if (!locked && stoppedByBridge.current === lenis) {
            if (lenis.rootElement.classList.contains('lenis')) lenis.start();
            stoppedByBridge.current = undefined;
        }
        return () => {
            // 설정 변경으로 교체되는 옛 인스턴스는 재시작하지 않는다.
            // StrictMode 재실행 중에는 소유권을 유지해 마지막 잠금 해제 때만 복원한다.
            if (stoppedByBridge.current === lenis && !isBodyScrollLocked() && lenis.rootElement.classList.contains('lenis')) {
                lenis.start();
                stoppedByBridge.current = undefined;
            }
        };
    }, [lenis, locked]);
    return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const prefersReducedMotion = usePrefersReducedMotion();

    // Sanity Studio(/admin), 관리 화면(/manage)에서는 Lenis 비활성화
    // — 폼 입력, 드롭다운 등 관리 화면 조작과 충돌 방지, 안정성 우선
    if (pathname.startsWith('/admin') || pathname.startsWith('/manage')) {
        return <>{children}</>;
    }

    return (
        // 설정 변경 시 Provider 자체는 유지해 열린 모달·입력값이 초기화되지 않게 한다.
        // 동작 줄이기에서는 가상 보간과 프레임 루프 없이 브라우저의 기본 스크롤을 쓴다.
        <ReactLenis root autoRaf={!prefersReducedMotion} options={{ lerp: 0.15, smoothWheel: !prefersReducedMotion, syncTouch: false }}>
            <ScrollLockBridge />
            {children}
        </ReactLenis>
    );
}
