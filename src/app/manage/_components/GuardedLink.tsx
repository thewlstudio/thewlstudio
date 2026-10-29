"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";

/** 현재 탭을 떠나는 Next 탐색만 확인한다. 새 탭·다운로드는 원래 동작을 유지한다. */
export default function GuardedLink(props: Omit<ComponentProps<typeof Link>, "onNavigate">) {
    return <Link {...props} onNavigate={(event) => {
        if (typeof props.href === "string") {
            const next = new URL(props.href, window.location.href);
            const current = window.location;
            if (next.origin === current.origin && next.pathname === current.pathname && next.search === current.search &&
                (props.href.startsWith("#") || next.hash !== current.hash)) return;
        }
        if (!confirmLeaveIfDirty()) event.preventDefault();
    }} />;
}
