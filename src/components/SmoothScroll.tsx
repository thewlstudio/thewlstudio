"use client";

import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Sanity Studio (/admin)에서는 Lenis 비활성화 — 폼 입력, 드롭다운 등과 충돌 방지
    if (pathname.startsWith('/admin')) {
        return <>{children}</>;
    }

    return (
        <ReactLenis root options={{ lerp: 0.15, smoothWheel: true }}>
            {children}
        </ReactLenis>
    );
}
