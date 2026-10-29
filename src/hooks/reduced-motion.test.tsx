// @vitest-environment jsdom
import { act, StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmoothScroll from "@/components/SmoothScroll";
import Template from "@/app/template";
import { isBodyScrollLocked, useBodyScrollLock } from "./useBodyScrollLock";
import { usePublicMotion } from "./usePublicMotion";

const state = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("motion/react", () => ({ motion: { div: ({ children, initial, animate: _animate, transition, ...props }: {
    children: ReactNode; initial: unknown; animate: unknown; transition: unknown;
}) => <div {...props} data-initial={JSON.stringify(initial)} data-transition={JSON.stringify(transition)}>{children}</div> } }));

let root: Root, host: HTMLDivElement, reduced: boolean, current: Lenis | undefined;
const listeners = new Set<() => void>();
function Probe() {
    const lenis = useLenis();
    useEffect(() => { current = lenis; }, [lenis]);
    return null;
}
function Stateful() {
    const [value, setValue] = useState("입력값");
    const [open, setOpen] = useState(false);
    useBodyScrollLock(open);
    const { reduced: preference, transitionFor } = usePublicMotion();
    return <><input value={value} onChange={(event) => setValue(event.target.value)} />
        <button onClick={() => setOpen(!open)}>모달 전환</button>
        {open && <div role="dialog" data-lenis-prevent>열린 모달</div>}
        <output data-reduced={preference} data-transition={JSON.stringify(transitionFor({ duration: 2, delay: 1, repeat: Infinity }))} />
    </>;
}
function Page() { return <SmoothScroll><Template><Probe /><Stateful /></Template></SmoothScroll>; }
async function render(node: ReactNode = <Page />) { await act(async () => root.render(node)); }
async function prefer(value: boolean) { await act(async () => { reduced = value; listeners.forEach((listener) => listener()); }); }
function wheel(target: EventTarget = window) {
    const event = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true });
    target.dispatchEvent(event); return event;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    reduced = false; current = undefined; state.pathname = "/"; listeners.clear();
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ get matches() { return reduced; },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    document.body.style.overflow = "clip";
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount()); host.remove();
    expect(listeners.size).toBe(0); expect(isBodyScrollLocked()).toBe(false);
    expect(document.body.style.overflow).toBe("clip");
    document.body.style.overflow = ""; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("실행 중 동작 줄이기 설정 변경", () => {
    it("실제 ReactLenis 엔진만 교체하고 입력 DOM·열린 모달·잠금을 유지한다", async () => {
        await render();
        const input = host.querySelector("input"), wrapper = host.firstElementChild, before = current!;
        await act(async () => host.querySelector("button")!.click());
        const modal = host.querySelector('[role="dialog"]');
        expect(before.isStopped).toBe(true);
        const startOld = vi.spyOn(before, "start");
        await prefer(true);
        expect(current).not.toBe(before);
        expect(startOld).not.toHaveBeenCalled();
        expect(current!.options.smoothWheel).toBe(false);
        expect(current!.options.autoRaf).toBe(false);
        expect(current!.isStopped).toBe(true);
        expect(host.firstElementChild).toBe(wrapper);
        expect(host.querySelector("input")).toBe(input);
        expect(host.querySelector("input")!.value).toBe("입력값");
        expect(host.querySelector('[role="dialog"]')).toBe(modal);
        expect(document.body.style.overflow).toBe("hidden");
        expect(wheel().defaultPrevented).toBe(true);
        expect(wheel(modal!).defaultPrevented).toBe(false);
        await act(async () => host.querySelector("button")!.click());
        expect(current!.isStopped).toBe(false);
        expect(document.body.style.overflow).toBe("clip");
        expect(wheel().defaultPrevented).toBe(false);
        await prefer(false);
        expect(current!.options.smoothWheel).toBe(true);
        expect(current!.options.autoRaf).toBe(true);
        expect(host.querySelector("input")).toBe(input);
    });
    it("처음부터 설정이 켜져 있어도 기본 스크롤과 모달 잠금을 함께 지원한다", async () => {
        reduced = true; await render();
        expect(current!.options.smoothWheel).toBe(false);
        const scroll = vi.spyOn(current!, "scrollTo");
        expect(wheel().defaultPrevented).toBe(false); expect(scroll).not.toHaveBeenCalled();
        await act(async () => host.querySelector("button")!.click());
        expect(current!.isStopped).toBe(true);
        await prefer(false); expect(current!.isStopped).toBe(true);
        await act(async () => host.querySelector("button")!.click());
        expect(current!.isStopped).toBe(false);
    });
    it("지연·반복을 모두 제거하고 페이지 전환 초기 숨김도 건너뛴다", async () => {
        await render();
        const output = host.querySelector("output")!;
        expect(JSON.parse(output.dataset.transition!)).toMatchObject({ duration: 2, delay: 1 });
        await prefer(true);
        expect(JSON.parse(output.dataset.transition!)).toMatchObject({ type: false, duration: 0, delay: 0, repeat: 0, delayChildren: 0 });
        expect(host.firstElementChild!.getAttribute("data-initial")).toBe("false");
        expect(JSON.parse(host.firstElementChild!.getAttribute("data-transition")!)).toMatchObject({ duration: 0, delay: 0 });
        await prefer(false);
        expect(JSON.parse(output.dataset.transition!)).toMatchObject({ duration: 2, delay: 1 });
    });
    it("StrictMode와 연속 설정 변경 뒤에도 마지막 잠금 해제가 엔진을 복원한다", async () => {
        await render(<StrictMode><Page /></StrictMode>);
        await act(async () => host.querySelector("button")!.click());
        await prefer(true); await prefer(false); await prefer(true);
        expect(current!.isStopped).toBe(true);
        await act(async () => host.querySelector("button")!.click());
        expect(current!.isStopped).toBe(false); expect(isBodyScrollLocked()).toBe(false);
    });
    it("matchMedia가 없는 환경에서도 페이지를 렌더링한다", async () => {
        vi.stubGlobal("matchMedia", undefined);
        await render(); expect(host.querySelector("input")).not.toBeNull();
        expect(host.querySelector("output")!.dataset.reduced).toBe("false");
    });
    it.each(["/manage", "/admin"])("%s에는 스크롤 엔진과 페이지 전환 래퍼를 만들지 않는다", async (pathname) => {
        state.pathname = pathname; await render();
        expect(current).toBeUndefined(); expect(host.querySelector("[data-public-motion]")).toBeNull();
    });
});
