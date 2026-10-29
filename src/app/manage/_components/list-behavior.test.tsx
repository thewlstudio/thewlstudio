// @vitest-environment jsdom
import { act, Suspense, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagedList, { DragHandle, type ManagedItem } from "./ManagedList";
import ReorderButtons from "./ReorderButtons";

const { refresh, show, router } = vi.hoisted(() => {
    const refresh = vi.fn();
    return { refresh, show: vi.fn(), router: { refresh } };
});
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./Toast", () => ({ useToast: () => ({ show }) }));
type Result = { ok: true } | { ok: false; error: string };
let root: Root;
let host: HTMLDivElement;
let reorder: ReturnType<typeof vi.fn<(...args: string[][]) => Promise<Result>>>;
let move: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<Result>>>;

const rows = (ids = ["a", "b", "c", "d", "e"]): ManagedItem[] => ids.map((id, i) => ({
    id, search: id, status: i % 2 ? "hidden" : "public",
    node: <div><DragHandle id={id} /><span data-row={id}>{id}</span><ReorderButtons documentId={id} disableUp={i === 0} disableDown={i === ids.length - 1} move={move} /></div>,
}));
async function render(items: ManagedItem[], statusFilter = true) {
    await act(async () => { root.render(<ManagedList items={items} reorder={reorder} searchPlaceholder="찾기" statusFilter={statusFilter} />); });
}
const visible = () => Array.from(host.querySelectorAll<HTMLElement>("[data-row]")).map((el) => el.dataset.row);
async function clickLabel(label: string, index = 0) {
    await act(async () => { (host.querySelectorAll<HTMLButtonElement>(`button[aria-label="${label}"]`)[index]).click(); });
}
async function clickText(text: string) {
    await act(async () => { Array.from(host.querySelectorAll("button")).find((b) => b.textContent === text)!.click(); });
}
async function search(query: string) {
    await act(async () => {
        const el = host.querySelector<HTMLInputElement>('input[type="search"]')!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, query);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
function dragEvent(type: string) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { setData: vi.fn(), setDragImage: vi.fn() } });
    return event;
}
async function drag(from: string, to: string) {
    const source = host.querySelector(`[data-row="${from}"]`)!.closest("li")!.querySelector('[draggable="true"]');
    if (!source) return;
    await act(async () => { source.dispatchEvent(dragEvent("dragstart")); });
    await act(async () => { host.querySelector(`[data-row="${to}"]`)!.closest("li")!.dispatchEvent(dragEvent("drop")); });
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    refresh.mockReset();
    reorder = vi.fn(async () => ({ ok: true } as const));
    move = vi.fn(async () => ({ ok: true } as const));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

describe("목록 필터와 항목 수 변경", () => {
    it("검색 도구가 사라지면 이전 검색어도 적용하지 않는다", async () => {
        await render(rows());
        await search("e");
        expect(visible()).toEqual(["e"]);
        await render(rows(["a", "b", "c", "d"]));
        expect(host.querySelector('input[type="search"]')).toBeNull();
        expect(visible()).toEqual(["a", "b", "c", "d"]);
    });
    it("상태 필터 도구를 숨기면 이전 공개/비공개 조건도 무시한다", async () => {
        await render(rows());
        await clickText("비공개");
        expect(visible()).toEqual(["b", "d"]);
        await render(rows(), false);
        expect(visible()).toEqual(["a", "b", "c", "d", "e"]);
    });
});

describe("순서 저장 잠금·실패 복구", () => {
    it("끌어서 저장하는 동안 모든 행의 화살표와 새 드래그를 잠근다", async () => {
        let finish!: (result: Result) => void;
        reorder.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(rows());
        await drag("a", "c");
        expect(reorder).toHaveBeenCalledWith(["b", "c", "a", "d", "e"]);
        expect(host.querySelector('[draggable="true"]')).toBeNull();
        expect(Array.from(host.querySelectorAll<HTMLButtonElement>('button[aria-label="아래로 이동"]')).every((b) => b.disabled)).toBe(true);
        await clickLabel("아래로 이동", 1);
        expect(move).not.toHaveBeenCalled();
        await act(async () => { finish({ ok: true }); });
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(host.querySelector('[draggable="true"]')).not.toBeNull();
    });
    it("화살표로 저장하는 동안 다른 행의 이동과 드래그도 잠근다", async () => {
        let finish!: (result: Result) => void;
        move.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(rows());
        await clickLabel("아래로 이동", 0);
        await clickLabel("아래로 이동", 1);
        expect(move).toHaveBeenCalledTimes(1);
        expect(host.querySelector('[draggable="true"]')).toBeNull();
        await act(async () => { finish({ ok: true }); });
    });
    it("저장 성공 후 서버 새로고침이 끝날 때까지 잠금을 유지한다", async () => {
        let ready = false;
        let finishRefresh!: () => void;
        const waiting = new Promise<void>((resolve) => { finishRefresh = resolve; });
        function Screen() {
            const [version, setVersion] = useState(0);
            useEffect(() => { refresh.mockImplementation(() => setVersion((v) => v + 1)); }, []);
            if (version > 0 && !ready) throw waiting;
            return <ManagedList items={rows()} reorder={reorder} searchPlaceholder="찾기" />;
        }
        await act(async () => { root.render(<Suspense fallback={<p>불러오는 중</p>}><Screen /></Suspense>); });
        await clickLabel("아래로 이동", 0);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(host.querySelector("ul")!.getAttribute("aria-busy")).toBe("true");
        expect(host.querySelector('[draggable="true"]')).toBeNull();
        await act(async () => { ready = true; finishRefresh(); });
        expect(host.querySelector("ul")!.getAttribute("aria-busy")).toBe("false");
        expect(host.querySelector('[draggable="true"]')).not.toBeNull();
        refresh.mockReset();
    });
    it("서버가 순서 저장을 거부하면 원래 순서로 돌아가고 재시도할 수 있다", async () => {
        reorder.mockResolvedValueOnce({ ok: false, error: "목록이 바뀌었어요." });
        await render(rows());
        await drag("a", "c");
        expect(visible()).toEqual(["a", "b", "c", "d", "e"]);
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("목록이 바뀌었어요.") }));
        expect(refresh).not.toHaveBeenCalled();
        await drag("a", "b");
        expect(reorder).toHaveBeenCalledTimes(2);
    });
    it("드래그 요청의 통신 예외도 화면을 복구하고 잠금을 해제한다", async () => {
        reorder.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        await render(rows());
        await drag("a", "c");
        expect(visible()).toEqual(["a", "b", "c", "d", "e"]);
        expect(host.querySelector("ul")!.getAttribute("aria-busy")).toBe("false");
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("저장 결과를 확인하지 못했어요") }));
        await drag("a", "b");
        expect(reorder).toHaveBeenCalledTimes(2);
    });
    it("저장 중 서버에서 항목이 추가되면 실패 복구가 새 항목을 지우지 않는다", async () => {
        let finish!: (result: Result) => void;
        reorder.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(rows());
        await drag("a", "c");
        await render(rows(["a", "b", "c", "d", "e", "f"]));
        await act(async () => { finish({ ok: false, error: "목록이 바뀌었어요." }); });
        expect(visible()).toEqual(["a", "b", "c", "d", "e", "f"]);
    });
    it("화살표 요청의 통신 예외도 오류로 안내하고 다음 요청을 허용한다", async () => {
        move.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        await render(rows());
        await clickLabel("아래로 이동", 0);
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("목록을 새로고침해 확인") }));
        await clickLabel("아래로 이동", 0);
        expect(move).toHaveBeenCalledTimes(2);
        expect(refresh).toHaveBeenCalledTimes(1);
    });
    it("같은 프레임의 서로 다른 화살표 클릭도 한 번만 저장한다", async () => {
        let finish!: (result: Result) => void;
        move.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(rows());
        await act(async () => {
            const buttons = host.querySelectorAll<HTMLButtonElement>('button[aria-label="아래로 이동"]');
            buttons[0].click();
            buttons[1].click();
        });
        expect(move).toHaveBeenCalledTimes(1);
        await act(async () => { finish({ ok: true }); });
    });
    it("목록 밖에 단독으로 쓴 화살표도 저장·통신 오류를 안전하게 처리한다", async () => {
        move.mockRejectedValueOnce(new Error("offline"));
        await act(async () => { root.render(<ReorderButtons documentId="a" disableUp disableDown={false} move={move} />); });
        await clickLabel("아래로 이동");
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ tone: "info" }));
        await clickLabel("아래로 이동");
        expect(move).toHaveBeenCalledTimes(2);
    });
    it("다른 그룹으로는 이동 요청을 보내지 않는다", async () => {
        await render(rows().map((r, i) => ({ ...r, group: i < 2 ? "room" : "lobby" })));
        await drag("a", "c");
        expect(reorder).not.toHaveBeenCalled();
        expect(visible()).toEqual(["a", "b", "c", "d", "e"]);
    });
    it("화살표 저장 오류는 기존 토스트로도 알려 준다", async () => {
        move.mockResolvedValueOnce({ ok: false, error: "인증이 필요해요." });
        await render(rows());
        await clickLabel("아래로 이동", 0);
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("인증이 필요해요.") }));
        expect(refresh).not.toHaveBeenCalled();
    });
});
