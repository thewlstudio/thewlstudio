"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { focusPageElement, PAGE_TITLE_ID } from "@/lib/page-focus";

/** 오류·404 화면도 재사용된 제목과 현재 주소를 연결한다. */
export default function PublicRecoveryTitle({ children, className, focusOnMount = false }: {
    children: ReactNode;
    className?: string;
    focusOnMount?: boolean;
}) {
    const pathname = usePathname();
    // 정적 404는 실제 주소를 알 수 없을 수 있다. 내부 경로를 방문 URL로 표시하지 않는다.
    // 이 경우 경로 표식을 생략하고 기본 제목/해시 이동을 사용한다.
    const path = pathname && pathname !== "/_not-found" ? pathname : undefined;
    const ref = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        // 같은 주소에서 본문이 오류 화면으로 교체돼도 안내한다. 직접 선택한 컨트롤은 유지한다.
        if (focusOnMount && document.activeElement === document.body) focusPageElement(ref.current);
    }, [focusOnMount]);
    return <h1 ref={ref} id={PAGE_TITLE_ID} tabIndex={-1} data-page-path={path ?? undefined} className={className}>{children}</h1>;
}
