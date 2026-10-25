"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { checklist } from "./storage";

/** 화면 방문과 "홈페이지 보기" 클릭을 지켜보다가 체크리스트 항목을 자동으로 완료한다 (화면에는 아무것도 그리지 않음) */
export default function ChecklistTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === "/manage/help") checklist.mark("help");
        if (pathname === "/manage/contact") checklist.mark("contact");
    }, [pathname]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if ((e.target as Element | null)?.closest?.('[data-tour="hub-view-site"]')) checklist.mark("view-site");
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);

    return null;
}
