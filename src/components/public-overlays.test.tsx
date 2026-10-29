// @vitest-environment jsdom
import { act, StrictMode, useCallback, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPortal } from "react-dom";
import Header from "./Header";
import Preloader from "./Preloader";
import ClassClient, { type Instructor } from "@/app/class/ClassClient";
import { usePublicDialog } from "@/hooks/usePublicDialog";
import { isBodyScrollLocked } from "@/hooks/useBodyScrollLock";

const mocks = vi.hoisted(() => ({ pathname: "/", reduced: false, exits: new Map<string, () => void>(), navigate: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("next/image", async () => {
    const { createElement } = await import("react");
    return { default: ({ src, alt, sizes }: { src: string; alt: string; sizes?: string }) => createElement("img", { src, alt, sizes }) };
});
vi.mock("next/link", () => ({ default: ({ children, onNavigate, ...props }: { children: ReactNode; href: string; onNavigate?: () => void }) => <a {...props} onClick={(event) => {
    event.preventDefault();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    onNavigate?.();
    mocks.navigate(props.href);
}}>{children}</a> }));
vi.mock("@/sanity/lib/image", () => ({ urlFor: () => ({ url: () => "/test.jpg" }) }));
vi.mock("./Footer", () => ({ default: () => null }));
vi.mock("lenis/react", () => ({ ReactLenis: ({ children }: { children: ReactNode }) => children, useLenis: () => undefined }));
vi.mock("motion/react", async () => {
    const { createElement, isValidElement, useEffect, useState } = await import("react");
    const cache = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    const ignored = new Set(["initial", "animate", "exit", "transition", "viewport", "variants", "whileInView"]);
    function Presence({ children, onExitComplete }: { children: ReactNode; onExitComplete?: () => void }) {
        const [previous, setPrevious] = useState(children);
        if (children && children !== previous) setPrevious(children);
        useEffect(() => {
            if (children || !previous || !onExitComplete) return;
            const props = isValidElement(previous) ? previous.props as Record<string, unknown> : {};
            const label = props.id === "main-menu-overlay" ? "menu" : props["aria-hidden"] ? "preloader" : "modal";
            const finish = () => { setPrevious(null); onExitComplete(); };
            mocks.exits.set(label, finish);
            return () => { if (mocks.exits.get(label) === finish) mocks.exits.delete(label); };
        }, [children, previous, onExitComplete]);
        return children || previous;
    }
    return {
        AnimatePresence: Presence,
        motion: new Proxy({}, { get: (_, key: string) => {
            if (!cache.has(key)) cache.set(key, (props) => createElement(key, { ...Object.fromEntries(Object.entries(props).filter(([name]) => !ignored.has(name))), "data-motion-transition": JSON.stringify(props.transition) }, props.children as ReactNode));
            return cache.get(key);
        } }),
    };
});

let root: Root;
let host: HTMLDivElement;
let skip: HTMLAnchorElement;
const mediaListeners = new Set<() => void>();
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const openMenu = () => host.querySelector<HTMLButtonElement>('[aria-label="메뉴 열기"]')!;
const closeModal = () => document.querySelector<HTMLButtonElement>('[aria-label="모달 닫기"]')!;
async function render(node: ReactNode) {
    await act(async () => root.render(node));
    await act(async () => vi.advanceTimersByTime(0));
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function key(value: string, shiftKey = false) {
    const event = new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, cancelable: true });
    await act(async () => document.dispatchEvent(event));
    return event;
}
async function finish(label: string) {
    expect(mocks.exits.get(label), label + " exit").toBeTypeOf("function");
    await act(async () => mocks.exits.get(label)!());
}
function HeaderPage() { return <main id="main-content"><Header /><button>배경 버튼</button></main>; }
const image = { _type: "image" as const, asset: { _type: "reference" as const, _ref: "image-test" } };
const instructor: Instructor = { _id: "i1", id: "i1", category: "VOCAL", instructorName: "강사", image, bgImage: image, subtitle: "소개", lessonInfo: "수업", about: ["설명"], process: ["과정"], portfolioUrl: "https://example.com" };

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.pathname = "/";
    history.replaceState({}, '', '/');
    mocks.reduced = false;
    mocks.exits.clear();
    mediaListeners.clear();
    sessionStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
        get matches() { return mocks.reduced; },
        addEventListener: (_: string, callback: () => void) => mediaListeners.add(callback),
        removeEventListener: (_: string, callback: () => void) => mediaListeners.delete(callback),
    })));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // rAF가 실행되지 않아도 열기 포커스가 정해져야 한다.
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    skip = document.createElement("a"); skip.id = "skip-link"; skip.href = "#main-content"; document.body.append(skip);
    host = document.createElement("div"); document.body.append(host);
    document.body.style.overflow = "clip";
    root = createRoot(host);
});
afterEach(async () => {
    try {
        await act(async () => root.unmount());
        // jsdom이 focus/selectionchange에 예약한 0ms 작업은 앱의 타이머가 아니다.
        await act(async () => vi.advanceTimersByTime(0));
        expect(vi.getTimerCount()).toBe(0);
        expect(isBodyScrollLocked()).toBe(false);
    } finally {
        host.remove(); skip.remove(); document.body.style.overflow = "";
        vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
});

describe("공개 메뉴의 실제 표시 수명", () => {
    it.each(["menu", "modal"])("%s가 열린 동안 설정을 바꿔도 포커스·배경 잠금과 DOM을 유지한다", async (mode) => {
        if (mode === "menu") {
            await render(<HeaderPage />); await click(openMenu());
        } else {
            await render(<ClassClient initialInstructors={[instructor]} />);
            await click(host.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!);
        }
        const overlay = dialog(), focused = document.activeElement;
        await act(async () => { mocks.reduced = true; mediaListeners.forEach((listener) => listener()); });
        expect(dialog()).toBe(overlay); expect(document.activeElement).toBe(focused);
        expect(document.body.style.overflow).toBe("hidden");
        expect(document.getElementById("main-content")?.hasAttribute("inert")).toBe(true);
        const motions = [overlay, ...overlay.querySelectorAll('[data-public-motion]')].filter((node) => node.hasAttribute('data-public-motion'));
        expect(motions.length).toBeGreaterThan(0);
        for (const node of motions) expect(JSON.parse(node.getAttribute('data-motion-transition')!)).toMatchObject({ duration: 0, delay: 0, repeat: 0 });
        await act(async () => { mocks.reduced = false; mediaListeners.forEach((listener) => listener()); });
        expect(dialog()).toBe(overlay); expect(document.activeElement).toBe(focused);
        await key("Escape"); expect(document.body.style.overflow).toBe("hidden");
        await finish(mode); expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(document.body.style.overflow).toBe("clip");
    });
    it("같은 페이지 섹션 이동은 퇴장과 inert 해제 뒤 해당 제목으로 이어진다", async () => {
        history.replaceState({}, '', '/studio'); mocks.pathname = '/studio';
        await render(<main id="main-content"><Header /><h1 id="page-title" tabIndex={-1}>Studio</h1><section id="membership"><h2>멤버십</h2><button>가입 안내</button></section></main>);
        await click(openMenu());
        await click(dialog().querySelector<HTMLAnchorElement>('a[href="/studio#membership"]')!);
        history.replaceState({}, '', '/studio#membership');
        expect(document.getElementById('main-content')?.hasAttribute('inert')).toBe(true);
        expect(document.activeElement).not.toBe(host.querySelector('h2'));
        await finish('menu');
        expect(document.activeElement).toBe(host.querySelector('h2'));
        expect(document.getElementById('main-content')?.hasAttribute('inert')).toBe(false);
    });
    it("현재 페이지 링크도 퇴장 후 본문 제목으로 이어지고 일반 닫기는 버튼으로 복원한다", async () => {
        await render(<main id="main-content"><Header /><h1 id="page-title" tabIndex={-1}>홈</h1></main>);
        await click(openMenu()); await click(dialog().querySelector<HTMLAnchorElement>('a[href="/"]')!);
        await finish('menu'); expect(document.activeElement).toBe(document.getElementById('page-title'));
        const trigger = openMenu(); await click(trigger); await key('Escape'); await finish('menu');
        expect(document.activeElement).toBe(trigger);
    });
    it("닫는 도중 URL이 달라지면 취소된 이전 목적지로 포커스를 보내지 않는다", async () => {
        history.replaceState({}, '', '/studio'); mocks.pathname = '/studio';
        await render(<main id="main-content"><Header /><section id="membership"><h2>멤버십</h2></section></main>);
        await click(openMenu()); await click(dialog().querySelector<HTMLAnchorElement>('a[href="/studio#membership"]')!);
        history.replaceState({}, '', '/studio#equipment');
        await finish('menu');
        expect(document.activeElement).not.toBe(host.querySelector('h2'));
    });
    it("같은 URL의 탐색 기록으로 돌아가도 이전 메뉴 이동의 포커스 요청은 취소한다", async () => {
        history.replaceState({}, '', '/studio#membership'); mocks.pathname = '/studio';
        await render(<main id="main-content"><Header /><section id="membership"><h2>멤버십</h2></section></main>);
        await click(openMenu()); await click(dialog().querySelector<HTMLAnchorElement>('a[href="/studio#membership"]')!);
        await act(async () => window.dispatchEvent(new PopStateEvent('popstate')));
        await finish('menu');
        expect(document.activeElement).not.toBe(host.querySelector('h2'));
    });
    it("좁은 화면의 브랜드 크기를 줄이고 숨겨진 Instagram의 간격이 버튼을 밀지 않는다", async () => {
        await render(<HeaderPage />);
        const trigger = openMenu();
        const controls = trigger.parentElement!;
        expect(controls.classList.contains("gap-6")).toBe(true);
        expect(controls.classList.contains("space-x-6")).toBe(false);
        expect(trigger.classList.contains("shrink-0")).toBe(true);
        const brand = host.querySelector("header a span")!;
        expect(brand.classList.contains("text-xl")).toBe(true);
        expect(brand.classList.contains("min-[360px]:text-2xl")).toBe(true);
        await click(trigger);
        const close = dialog().querySelector<HTMLButtonElement>('button[aria-label="메뉴 닫기"]')!;
        expect(close.parentElement!.classList.contains("gap-6")).toBe(true);
        expect(close.classList.contains("shrink-0")).toBe(true);
        const overlayBrand = dialog().querySelector("a span")!;
        expect(overlayBrand.classList.contains("text-xl")).toBe(true);
        expect(overlayBrand.classList.contains("min-[360px]:text-2xl")).toBe(true);
    });
    it("열자마자 포커스를 옮기고 퇴장 완료 전까지 배경·Tab·스크롤을 잠근다", async () => {
        await render(<StrictMode><HeaderPage /></StrictMode>);
        const trigger = openMenu();
        await click(trigger);
        expect(document.activeElement).toBe(dialog().querySelector("a"));
        expect(document.getElementById("main-content")?.hasAttribute("inert")).toBe(true);
        expect(skip.hasAttribute("inert")).toBe(true);
        expect(dialog().hasAttribute("data-lenis-prevent")).toBe(true);
        expect(document.body.style.overflow).toBe("hidden");
        const links = dialog().querySelectorAll<HTMLAnchorElement>("a");
        links[links.length - 1].focus();
        await key("Tab");
        expect(document.activeElement).toBe(links[0]);
        await key("Escape");
        expect(dialog()).toBeTruthy();
        expect(document.body.style.overflow).toBe("hidden");
        expect(document.getElementById("main-content")?.hasAttribute("inert")).toBe(true);
        await finish("menu");
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(document.body.style.overflow).toBe("clip");
        expect(skip.hasAttribute("inert")).toBe(false);
        expect(document.activeElement).toBe(trigger);
    });
    it("숨겨진 항목·disabled 버튼은 Tab 경계에서 제외하고 바깥 포커스도 안으로 돌린다", async () => {
        await render(<HeaderPage />);
        await click(openMenu());
        const links = dialog().querySelectorAll<HTMLAnchorElement>("a");
        const last = links[links.length - 1];
        last.style.display = "none";
        links[0].focus();
        await key("Tab", true);
        expect(document.activeElement).toBe(links[links.length - 2]);
        host.querySelector<HTMLButtonElement>("main > button")!.focus();
        expect(dialog().contains(document.activeElement)).toBe(true);
    });
    it("새 탭 클릭은 메뉴를 닫지 않고 실제 탐색일 때만 닫는다", async () => {
        await render(<HeaderPage />);
        await click(openMenu());
        const link = dialog().querySelector<HTMLAnchorElement>('a[href="/works"]')!;
        await act(async () => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true })));
        expect(openMenu()).toBeNull();
        expect(mocks.exits.has("menu")).toBe(false);
        await click(link);
        await finish("menu");
        expect(mocks.navigate).toHaveBeenCalledWith("/works");
        expect(document.activeElement).not.toBe(openMenu());
    });
    it("닫는 중 다시 열면 이전 퇴장 완료 콜백이 새 메뉴 잠금을 해제하지 않는다", async () => {
        await render(<HeaderPage />);
        const trigger = openMenu();
        await click(trigger);
        await key("Escape");
        const stale = mocks.exits.get("menu")!;
        await click(trigger); // inert를 구현하지 않는 jsdom에서 빠른 재열기를 모사
        await act(async () => stale());
        expect(document.getElementById("main-content")?.hasAttribute("inert")).toBe(true);
        expect(document.body.style.overflow).toBe("hidden");
        expect(dialog()).toBeTruthy();
        await key("Escape"); await finish("menu");
    });
    it("화면 이동으로 제거되면 잠금과 키 리스너를 정리하고 새 화면 포커스를 가로채지 않는다", async () => {
        await render(<HeaderPage />);
        await click(openMenu());
        await render(<main id="main-content"><button id="new-page">새 화면</button></main>);
        expect(skip.hasAttribute("inert")).toBe(false);
        expect(document.getElementById("main-content")?.hasAttribute("inert")).toBe(false);
        expect(document.body.style.overflow).toBe("clip");
        const target = document.getElementById("new-page")!;
        target.focus();
        expect(document.activeElement).toBe(target);
        expect((await key("Escape")).defaultPrevented).toBe(false);
    });
});

describe("클래스 모달의 닫기·포커스 복원", () => {
    it("닫기 버튼은 내용과 함께 사라지지 않는 0높이 sticky 영역에 두고 클릭도 유지한다", async () => {
        await render(<ClassClient initialInstructors={[instructor]} />);
        const trigger = host.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!;
        await click(trigger);
        const button = closeModal(), bar = button.parentElement!;
        expect(bar.parentElement).toBe(dialog());
        for (const name of ["sticky", "top-0", "h-0", "shrink-0", "pointer-events-none"]) expect(bar.classList.contains(name)).toBe(true);
        expect(button.classList.contains("pointer-events-auto")).toBe(true);
        expect(button.classList.contains("w-11")).toBe(true);
        expect(button.classList.contains("h-11")).toBe(true);
        expect(bar.querySelectorAll("button")).toHaveLength(1);
        expect(document.activeElement).toBe(button);
        await click(button);
        expect(document.body.style.overflow).toBe("hidden");
        await finish("modal");
        expect(document.activeElement).toBe(trigger);
    });
    it.each(["Escape", "닫기", "배경"])("%s 경로도 퇴장 완료 후에만 열었던 카드로 돌아간다", async (path) => {
        mocks.pathname = "/class";
        await render(<ClassClient initialInstructors={[instructor]} />);
        const trigger = host.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!;
        await click(trigger);
        expect(document.activeElement).toBe(closeModal());
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(trigger.getAttribute("aria-controls")).toBe(dialog().id);
        expect(dialog().hasAttribute("data-lenis-prevent")).toBe(true);
        if (path === "Escape") await key("Escape");
        else if (path === "닫기") await click(closeModal());
        else await click(dialog().parentElement!);
        expect(document.body.style.overflow).toBe("hidden");
        expect(trigger.closest("main")?.hasAttribute("inert")).toBe(true);
        await finish("modal");
        expect(document.activeElement).toBe(trigger);
        expect(document.body.style.overflow).toBe("clip");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
    it("빠른 다른 강사 재열기 뒤 오래된 완료는 선택된 강사·잠금을 지우지 않는다", async () => {
        await render(<ClassClient initialInstructors={[instructor, { ...instructor, _id: "i2", id: "i2", instructorName: "다른 강사" }]} />);
        const cards = host.querySelectorAll<HTMLElement>('button[aria-haspopup="dialog"]');
        await click(cards[0]); await key("Escape");
        const stale = mocks.exits.get("modal")!;
        await click(cards[1]);
        await act(async () => stale());
        expect(dialog().getAttribute("aria-label")).toBe("다른 강사");
        expect(document.body.style.overflow).toBe("hidden");
        await key("Escape"); await finish("modal");
        expect(document.activeElement).toBe(cards[1]);
    });
});

function Synthetic({ active, children = "대상 없음" }: { active: boolean; children?: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => {}, []);
    usePublicDialog({ active, dialogRef: ref, triggerRef: trigger, initialFocus: "button", onClose: close });
    return <><button ref={trigger}>트리거</button>{active && createPortal(<div ref={ref} role="dialog" tabIndex={-1}>{children}</div>, document.body)}</>;
}
describe("배경 속성 소유권", () => {
    it("숨겨진 부모·disabled 필드 안의 요소는 Tab 대상이 아니고 빈 대화상자도 밖으로 새지 않는다", async () => {
        await render(<Synthetic active>
            <button id="first-focus">첫 항목</button><button id="last-focus">마지막 항목</button>
            <button disabled>비활성</button><fieldset disabled><input /></fieldset>
            <div style={{ display: "none" }}><button>숨긴 항목</button></div>
        </Synthetic>);
        document.getElementById("last-focus")!.focus();
        await key("Tab");
        expect(document.activeElement?.id).toBe("first-focus");
        await render(<Synthetic active />);
        dialog().focus();
        expect((await key("Tab")).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(dialog());
    });
    it("기존 inert 속성을 유지하고 비활성 대화상자는 다른 잠금을 제거하지 않는다", async () => {
        const main = document.createElement("main"); main.id = "main-content"; main.setAttribute("inert", "original"); document.body.append(main);
        skip.setAttribute("inert", "prior");
        try {
            await render(<Synthetic active={true} />);
            expect(document.activeElement).toBe(dialog());
            await render(<Synthetic active={false} />);
            expect(main.getAttribute("inert")).toBe("original");
            expect(skip.getAttribute("inert")).toBe("prior");
        } finally { main.remove(); }
    });
    it("겹친 두 대화상자 중 하나를 닫아도 나머지의 배경 잠금은 유지한다", async () => {
        const main = document.createElement("main"); main.id = "main-content"; document.body.append(main);
        try {
            await render(<><Synthetic active={true} /><Synthetic active={true} /></>);
            await render(<><Synthetic active={false} /><Synthetic active={true} /></>);
            expect(main.hasAttribute("inert")).toBe(true);
            expect(skip.hasAttribute("inert")).toBe(true);
            expect(document.body.style.overflow).toBe("hidden");
            await render(<p>종료</p>);
            expect(main.hasAttribute("inert")).toBe(false);
            expect(skip.hasAttribute("inert")).toBe(false);
        } finally { main.remove(); }
    });
});

describe("Preloader의 저장소·타이머·종료 처리", () => {
    it("StrictMode에서도 1.6초 단계 전환과 2초 종료를 유지하고 퇴장 완료까지 잠근다", async () => {
        await render(<StrictMode><Preloader /></StrictMode>);
        expect(host.querySelector('img[src$="studio_logo_2.png"]')?.getAttribute('sizes')).toBe('(min-width: 1024px) 768px, (min-width: 768px) 576px, (min-width: 640px) 384px, 256px');
        await act(async () => vi.advanceTimersByTime(1600));
        expect(host.querySelector('img[src$="studio_logo.jpg"]')?.getAttribute('sizes')).toBe('(min-width: 768px) 80vw, (min-width: 640px) 384px, 256px');
        expect(document.body.style.overflow).toBe("hidden");
        await act(async () => vi.advanceTimersByTime(400));
        expect(document.body.style.overflow).toBe("hidden");
        await finish("preloader");
        expect(document.body.style.overflow).toBe("clip");
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
    it("저장소 접근이 차단돼도 페이지를 유지하고 연출을 정상 종료한다", async () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
        await render(<Preloader />);
        await act(async () => vi.advanceTimersByTime(2000));
        await finish("preloader");
        expect(document.body.style.overflow).toBe("clip");
    });
    it.each(["/manage", "/admin"])("%s에서는 저장소·타이머·잠금을 실행하지 않는다", async (path) => {
        mocks.pathname = path;
        const read = vi.spyOn(Storage.prototype, "getItem");
        await render(<Preloader />);
        expect(read).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
        expect(document.body.style.overflow).toBe("clip");
    });
    it("이미 봤거나 동작 줄이기가 켜진 경우 생략한다", async () => {
        sessionStorage.setItem("wls_preloader_seen", "true");
        await render(<Preloader />);
        expect(host.querySelector("img")).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
        await render(<p>다른 화면</p>); sessionStorage.clear(); mocks.reduced = true;
        await render(<Preloader />);
        expect(host.querySelector("img")).toBeNull();
        expect(document.body.style.overflow).toBe("clip");
    });
    it("진행 중 관리 화면으로 이동하면 타이머와 잠금을 정리하고 재방문 시 반복하지 않는다", async () => {
        await render(<Preloader />);
        mocks.pathname = "/manage/login";
        await render(<Preloader />);
        expect(vi.getTimerCount()).toBe(0);
        expect(document.body.style.overflow).toBe("clip");
        mocks.pathname = "/works";
        await render(<Preloader />);
        expect(host.querySelector("img")).toBeNull();
    });
    it("진행 중 동작 줄이기를 켜면 즉시 정리한다", async () => {
        await render(<Preloader />);
        await act(async () => { mocks.reduced = true; mediaListeners.forEach((listener) => listener()); });
        expect(vi.getTimerCount()).toBe(0);
        expect(document.body.style.overflow).toBe("clip");
    });
    it("Preloader가 끝나도 열려 있는 메뉴의 잠금을 풀지 않는다", async () => {
        await render(<><Preloader /><HeaderPage /></>);
        await click(openMenu());
        await act(async () => vi.advanceTimersByTime(2000));
        await finish("preloader");
        expect(document.body.style.overflow).toBe("hidden");
        await key("Escape"); await finish("menu");
        expect(document.body.style.overflow).toBe("clip");
    });
});
