// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import Lenis from "lenis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmoothScroll from "@/components/SmoothScroll";
import { isBodyScrollLocked, useBodyScrollLock } from "./useBodyScrollLock";

const state = vi.hoisted(() => ({ pathname: "/", reduced: false, lenis: undefined as unknown }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("lenis/react", () => ({ ReactLenis: ({ children }: { children: ReactNode }) => children, useLenis: () => state.lenis }));
let root: Root;
let host: HTMLDivElement;
let lenis: Lenis;
function Lock({ active }: { active: boolean }) { useBodyScrollLock(active); return null; }
function Page({ first = false, second = false }: { first?: boolean; second?: boolean }) {
    return <SmoothScroll><Lock active={first} /><Lock active={second} /><main>본문</main><div data-lenis-prevent>모달 내부</div></SmoothScroll>;
}
async function render(node: ReactNode) { await act(async () => root.render(node)); }
function wheel(target: EventTarget = window) {
    const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    state.pathname = "/"; state.reduced = false;
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ get matches() { return state.reduced; }, addEventListener() {}, removeEventListener() {} })));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    lenis = new Lenis({ smoothWheel: true, autoRaf: false });
    state.lenis = lenis;
    document.body.style.overflow = "clip";
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
    try {
        await act(async () => root.unmount());
        expect(isBodyScrollLocked()).toBe(false);
        expect(document.body.style.overflow).toBe("clip");
    } finally {
        lenis.destroy(); host.remove(); document.body.style.overflow = "";
        state.lenis = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
});

describe("실제 Lenis와 공통 스크롤 잠금", () => {
    it("body overflow만 숨기면 Lenis의 wheel 경로가 실행되지만 공통 잠금은 그것도 멈춘다", async () => {
        const scroll = vi.spyOn(lenis, "scrollTo");
        await render(<Page />);
        document.body.style.overflow = "hidden";
        wheel();
        expect(scroll).toHaveBeenCalled();
        document.body.style.overflow = "clip";
        scroll.mockClear();
        await render(<Page first />);
        const event = wheel();
        expect(lenis.isStopped).toBe(true);
        expect(scroll).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
    });
    it("중첩 잠금은 마지막 소유자가 해제할 때만 Lenis와 body를 복원한다", async () => {
        const stop = vi.spyOn(lenis, "stop"), start = vi.spyOn(lenis, "start");
        await render(<Page first second />);
        expect(stop).toHaveBeenCalledTimes(1);
        await render(<Page second />);
        expect(lenis.isStopped).toBe(true);
        expect(document.body.style.overflow).toBe("hidden");
        expect(start).not.toHaveBeenCalled();
        await render(<Page />);
        expect(start).toHaveBeenCalledTimes(1);
        expect(lenis.isStopped).toBe(false);
        expect(document.body.style.overflow).toBe("clip");
    });
    it("모달 내부의 data-lenis-prevent는 wheel 기본 동작을 취소하지 않아 내부 스크롤을 허용한다", async () => {
        await render(<Page first />);
        const scroll = vi.spyOn(lenis, "scrollTo");
        const event = wheel(host.querySelector("[data-lenis-prevent]")!);
        expect(event.defaultPrevented).toBe(false);
        expect(scroll).not.toHaveBeenCalled();
        expect(lenis.isStopped).toBe(true);
    });
    it("잠금 전부터 멈춰 있던 Lenis를 임의로 다시 시작하지 않는다", async () => {
        lenis.stop();
        const start = vi.spyOn(lenis, "start");
        await render(<Page first />);
        await render(<Page />);
        expect(start).not.toHaveBeenCalled();
        expect(lenis.isStopped).toBe(true);
    });
    it("StrictMode 재실행과 잠금 중 전체 해제 후에도 토큰과 overflow가 남지 않는다", async () => {
        await render(<StrictMode><Page first second /></StrictMode>);
        expect(isBodyScrollLocked()).toBe(true);
        await render(<p>다른 화면</p>);
        expect(isBodyScrollLocked()).toBe(false);
        expect(document.body.style.overflow).toBe("clip");
    });
    it.each(["/manage", "/admin"])("%s 화면에서는 Lenis를 조작하지 않고 기본 스크롤만 잠근다", async (mode) => {
        state.pathname = mode;
        const stop = vi.spyOn(lenis, "stop"), start = vi.spyOn(lenis, "start");
        await render(<Page first />);
        expect(document.body.style.overflow).toBe("hidden");
        expect(stop).not.toHaveBeenCalled();
        await render(<Page />);
        expect(start).not.toHaveBeenCalled();
    });
    it("이미 파괴된 Lenis를 해제 처리에서 다시 시작하지 않는다", async () => {
        await render(<Page first />);
        const start = vi.spyOn(lenis, "start");
        lenis.destroy();
        await render(<Page />);
        expect(start).not.toHaveBeenCalled();
        expect(document.documentElement.classList.contains("lenis")).toBe(false);
    });
});
