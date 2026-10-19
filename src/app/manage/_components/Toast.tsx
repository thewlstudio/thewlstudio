"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { restoreCrew } from "../crew/actions";
import { restoreInstructor } from "../instructors/actions";
import { restoreWork } from "../works/actions";
import { restoreSpace } from "../studio/actions";

/**
 * 관리 화면 공통 알림(토스트). 삭제·복원·생성처럼 "결과가 화면에 안 남는" 동작의 결과를 알려 주고,
 * 삭제는 "되돌리기"로 바로 복원할 수 있게 한다.
 * 화면 이동이 따르는 동작(삭제 후 목록으로, 생성 후 수정 화면으로)을 위해 알림을 sessionStorage에 잠시 맡긴다.
 */

type Area = "crew" | "works" | "studio" | "instructors";
type Undo = { area: Area; id: string };
type Tone = "success" | "info";
export type ToastInput = { message: string; tone?: Tone; undo?: Undo };

const FLASH_KEY = "wls_manage_flash";

const RESTORERS: Record<Area, (id: string) => Promise<{ ok: true } | { ok: false; error: string }>> = {
    crew: restoreCrew,
    works: restoreWork,
    studio: restoreSpace,
    instructors: restoreInstructor,
};

/** 화면 이동 뒤에 보여 줄 알림을 예약한다 (이동하는 동작에서 호출) */
export function flashToast(t: ToastInput) {
    try {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify(t));
    } catch {
        /* 저장소를 못 쓰는 환경에서는 알림만 생략한다 */
    }
}

type Item = ToastInput & { id: number };
const Ctx = createContext<{ show: (t: ToastInput) => void }>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [items, setItems] = useState<Item[]>([]);
    const seq = useRef(0);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        setItems((list) => list.filter((x) => x.id !== id));
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        timers.current.delete(id);
    }, []);

    const show = useCallback(
        (t: ToastInput) => {
            const id = ++seq.current;
            setItems((list) => [...list.slice(-2), { ...t, id }]);
            // 되돌리기 버튼이 있는 알림은 놓치지 않게 더 오래 둔다
            timers.current.set(id, setTimeout(() => dismiss(id), t.undo ? 10000 : 5000));
        },
        [dismiss],
    );

    // 화면이 바뀔 때마다: 예약된 알림 표시 + 생성 직후(?created=1) 알림
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FLASH_KEY);
            if (raw) {
                sessionStorage.removeItem(FLASH_KEY);
                show(JSON.parse(raw) as ToastInput);
            }
        } catch {
            /* 무시 */
        }
        const url = new URL(window.location.href);
        if (url.searchParams.get("created") === "1") {
            show({ message: "새로 만들었어요. 이어서 내용을 채워 보세요." });
            url.searchParams.delete("created");
            window.history.replaceState(null, "", url.pathname + url.search);
        }
    }, [pathname, show]);

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((t) => clearTimeout(t));
    }, []);

    const undo = async (item: Item) => {
        if (!item.undo) return;
        dismiss(item.id);
        const result = await RESTORERS[item.undo.area](item.undo.id);
        if (result.ok) {
            show({ message: "복원했어요." });
            router.refresh();
        } else {
            show({ message: `복원하지 못했어요. ${result.error}`, tone: "info" });
        }
    };

    return (
        <Ctx.Provider value={{ show }}>
            {children}
            <div className="fixed left-0 right-0 bottom-28 z-[70] px-4 flex flex-col items-center gap-2 pointer-events-none" role="status" aria-live="polite">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="pointer-events-auto max-w-md w-full flex items-center gap-3 rounded-xl bg-neutral-900 text-white pl-4 pr-2 py-2.5 shadow-lg"
                    >
                        <p className="flex-1 text-sm font-semibold leading-snug break-keep">{item.message}</p>
                        {item.undo && (
                            <button
                                type="button"
                                onClick={() => undo(item)}
                                className="shrink-0 h-9 px-3 rounded-lg bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                되돌리기
                            </button>
                        )}
                        <button
                            type="button"
                            aria-label="알림 닫기"
                            onClick={() => dismiss(item.id)}
                            className="shrink-0 w-9 h-9 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}
