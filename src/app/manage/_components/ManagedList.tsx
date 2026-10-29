"use client";

import { createContext, useContext, useId, useState } from "react";
import { useToast } from "./Toast";
import { ListReorderContext, useReorderMutation } from "./useReorderMutation";

/**
 * 관리 목록 공통: 검색, 공개 상태 필터, 끌어서 순서 바꾸기.
 * - 항목 모양(사진·글자·버튼)은 서버 페이지가 만들어 node로 넘기고, 여기서는 걸러내기·순서만 맡는다.
 * - 검색·필터 중에는 순서가 헷갈리지 않도록 끌어서 바꾸기를 잠시 끈다. (▲▼ 버튼은 그대로 쓸 수 있다)
 * - 끌어서 바꾸기는 마우스용이다. 키보드·터치는 항목 왼쪽의 ▲▼ 버튼을 쓴다.
 */

export type ManagedItem = {
    id: string;
    node: React.ReactNode;
    /** 검색에 쓸 글자 (이름·역할 등을 이어 붙인 것) */
    search: string;
    status?: "public" | "hidden";
    /** 같은 그룹 안에서만 순서를 바꿀 수 있다 (예: 연습실끼리, 로비끼리) */
    group?: string;
};

type Result = { ok: true } | { ok: false; error: string };

const DragCtx = createContext<{ canDrag: boolean; begin: (id: string) => void; end: () => void } | null>(null);

/** 항목 카드 안에 넣는 끌기 손잡이. 순서를 바꿀 수 없는 상황이면 아무것도 그리지 않는다. */
export function DragHandle({ id }: { id: string }) {
    const ctx = useContext(DragCtx);
    if (!ctx?.canDrag) return null;
    return (
        <span
            draggable
            aria-hidden="true"
            title="끌어서 순서 바꾸기"
            onDragStart={(e) => {
                const card = (e.currentTarget as HTMLElement).closest("li");
                if (card) e.dataTransfer.setDragImage(card, 24, 24);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
                ctx.begin(id);
            }}
            onDragEnd={ctx.end}
            className="hidden md:flex w-6 h-10 items-center justify-center cursor-grab active:cursor-grabbing select-none text-neutral-400 hover:text-neutral-700 text-lg"
        >
            ⠿
        </span>
    );
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export default function ManagedList({
    items,
    reorder,
    searchPlaceholder,
    statusFilter = false,
    minItemsForTools = 5,
}: {
    items: ManagedItem[];
    reorder?: (ids: string[]) => Promise<Result>;
    searchPlaceholder: string;
    statusFilter?: boolean;
    /** 항목이 이보다 적으면 검색·필터 도구를 숨긴다 (항목이 몇 개 없을 때는 거추장스러움) */
    minItemsForTools?: number;
}) {
    const toast = useToast();
    const searchId = useId();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"all" | "public" | "hidden">("all");
    const [order, setOrder] = useState(() => items.map((i) => i.id));
    const [dragId, setDragId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const mutation = useReorderMutation();

    // 서버에서 새 목록이 내려오면(저장·이동 뒤 새로고침) 그 순서를 따른다
    const serverKey = items.map((i) => i.id).join("|");
    const [lastKey, setLastKey] = useState(serverKey);
    if (serverKey !== lastKey) {
        setLastKey(serverKey);
        setOrder(items.map((i) => i.id));
    }

    const byId = new Map(items.map((i) => [i.id, i]));
    const ordered = order.map((id) => byId.get(id)).filter((i): i is ManagedItem => !!i);

    const showTools = items.length >= minItemsForTools;
    // 도구가 보이지 않을 때(항목이 적을 때)는 남아 있는 검색어·필터가 있어도 적용하지 않는다
    const activeStatus = showTools && statusFilter ? status : "all";
    const q = showTools ? norm(query) : "";
    const filtering = q !== "" || activeStatus !== "all";
    const visible = ordered.filter((i) => (activeStatus === "all" || i.status === activeStatus) && (q === "" || norm(i.search).includes(q)));
    const canDrag = !!reorder && !filtering && !mutation.isPending && items.length > 1;

    const drop = (targetId: string) => {
        const from = dragId;
        setDragId(null);
        setOverId(null);
        if (!canDrag || !from || from === targetId || !reorder) return;
        const a = byId.get(from);
        const b = byId.get(targetId);
        if (!a || !b || (a.group ?? "") !== (b.group ?? "")) return; // 다른 그룹으로는 옮기지 않는다
        const next = [...order];
        const i = next.indexOf(from);
        const j = next.indexOf(targetId);
        next.splice(i, 1);
        next.splice(j, 0, from);
        const previous = order;
        mutation.run(() => reorder(next), {
            onStart: () => setOrder(next),
            onSuccess: () => {
                toast.show({ message: "순서를 바꿨어요." });
            },
            onError: (message) => {
                // 저장 중 서버에서 새 목록을 받은 경우, 그 목록을 예전 배열로 덮어쓰지 않는다.
                setOrder((current) => current === next ? previous : current);
                toast.show({ message, tone: "info" });
            },
        });
    };

    return (
        <ListReorderContext.Provider value={mutation}>
        <DragCtx.Provider value={{ canDrag, begin: setDragId, end: () => { setDragId(null); setOverId(null); } }}>
            {showTools && (
                <div data-tour="list-tools" className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <label htmlFor={searchId} className="sr-only">목록에서 찾기</label>
                        <input
                            id={searchId}
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            autoComplete="off"
                            className="flex-1 h-11 px-4 rounded-xl border border-neutral-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                        />
                        {statusFilter && (
                            <div role="group" aria-label="공개 상태로 걸러 보기" className="flex rounded-xl border border-neutral-300 bg-white overflow-hidden shrink-0">
                                {([["all", "전체"], ["public", "공개"], ["hidden", "비공개"]] as const).map(([v, label]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        aria-pressed={status === v}
                                        onClick={() => setStatus(v)}
                                        className={`h-11 px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black ${status === v ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {filtering && (
                        <p className="text-sm text-neutral-600" role="status" aria-live="polite">
                            {items.length}개 중 {visible.length}개를 보고 있어요. 찾는 중에는 끌어서 순서를 바꿀 수 없어요.{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    setStatus("all");
                                }}
                                className="font-semibold underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                            >
                                모두 보기
                            </button>
                        </p>
                    )}
                </div>
            )}

            {visible.length === 0 && filtering && <p className="text-sm text-neutral-500 py-8 text-center">조건에 맞는 항목이 없어요.</p>}

            <ul className="space-y-3" aria-busy={mutation.isPending}>
                {visible.map((item, rowIndex) => (
                    <li
                        key={item.id}
                        data-tour={rowIndex === 0 ? "list-row" : undefined}
                        onDragOver={(e) => {
                            if (dragId && canDrag) {
                                e.preventDefault();
                                setOverId(item.id);
                            }
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            drop(item.id);
                        }}
                        className={`transition-opacity ${dragId === item.id ? "opacity-40" : ""} ${overId === item.id && dragId && dragId !== item.id ? "ring-2 ring-black rounded-2xl" : ""}`}
                    >
                        {item.node}
                    </li>
                ))}
            </ul>
        </DragCtx.Provider>
        </ListReorderContext.Provider>
    );
}
