"use client";

import { useState } from "react";

/**
 * 긴 편집기(블록·섹션·묶음)용 접기/펼치기 공통 조각.
 * 접힌 카드의 본문은 지우지 않고 숨기기만 한다 — 파일 입력·입력 중인 값이 그대로 폼에 실려야 하기 때문이다.
 */
/** initial: 처음부터 펼쳐 둘 카드의 key (예: 반드시 봐야 하는 경고가 있는 카드) */
export function useOpenKeys(initial: string[] = []) {
    const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(initial));
    return {
        isOpen: (key: string) => openKeys.has(key),
        toggle: (key: string) =>
            setOpenKeys((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            }),
        /** 새로 만든 카드는 바로 입력할 수 있게 펼친다 */
        open: (key: string) => setOpenKeys((prev) => new Set(prev).add(key)),
        openAll: (keys: string[]) => setOpenKeys(new Set(keys)),
        closeAll: () => setOpenKeys(new Set()),
    };
}

export function ToggleButton({ open, onClick, name }: { open: boolean; onClick: () => void; name: string }) {
    return (
        <button
            type="button"
            aria-expanded={open}
            aria-label={`${name} ${open ? "접기" : "펼치기"}`}
            onClick={onClick}
            className="h-9 px-3 shrink-0 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
            {open ? "접기" : "펼치기"}
        </button>
    );
}

/** 접힌 상태에서 제목 아래에 보이는 한 줄 요약 */
export function Summary({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-neutral-500 truncate mt-0.5">{children}</p>;
}

/** 모두 펼치기 / 모두 접기 */
export function ExpandControls({ onOpenAll, onCloseAll }: { onOpenAll: () => void; onCloseAll: () => void }) {
    const cls =
        "h-8 px-3 rounded-lg text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
    return (
        <div className="flex justify-end gap-1 -mt-1">
            <button type="button" onClick={onOpenAll} className={cls}>모두 펼치기</button>
            <button type="button" onClick={onCloseAll} className={cls}>모두 접기</button>
        </div>
    );
}

/** 한 줄 요약용: 긴 글을 잘라서 보여준다 */
export const snippet = (text: string, max = 36) => {
    const t = text.replace(/\s+/g, " ").trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
};
