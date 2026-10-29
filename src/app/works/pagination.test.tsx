// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorksClient from "./WorksClient";
import WorksPage, { generateMetadata } from "./page";
import type { WorkSummary } from "@/types/sanity";

const { fetchWorks, navigate } = vi.hoisted(() => ({ fetchWorks: vi.fn(), navigate: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: fetchWorks }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("next/image", async () => {
    const { createElement } = await import("react");
    return { default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }) };
});
vi.mock("motion/react", async () => {
    const { createElement } = await import("react");
    const cache = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    const ignored = new Set(["initial", "animate", "transition", "viewport", "whileInView"]);
    return { motion: new Proxy({}, { get: (_, key: string) => {
        if (!cache.has(key)) cache.set(key, (props) => createElement(key, Object.fromEntries(Object.entries(props).filter(([name]) => !ignored.has(name))), props.children as ReactNode));
        return cache.get(key);
    } }) };
});
vi.mock("next/link", () => ({ default: ({ children, onNavigate, scroll, replace, ...props }: {
    children: ReactNode; href: string; onNavigate?: (event: { preventDefault: () => void }) => void; scroll?: boolean; replace?: boolean;
}) => {
    void scroll;
    return <a {...props} onClick={(e) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        let prevented = false;
        onNavigate?.({ preventDefault: () => { prevented = true; } });
        if (!prevented) navigate(props.href, { replace });
    }}>{children}</a>;
} }));

const works = (count: number): WorkSummary[] => Array.from({ length: count }, (_, i) => ({ title: `작품 ${i + 1}`, artist: "아티스트", slug: `work-${i + 1}`, releaseDate: "2026. 10. 26.", imageUrl: null, lqip: null }));
let root: Root;
let host: HTMLDivElement;
async function render(node: ReactNode) { await act(async () => root.render(node)); }
const titles = () => Array.from(host.querySelectorAll("h2")).map((el) => el.textContent);
async function click(label: string, options: MouseEventInit = {}) {
    await act(async () => host.querySelector(`[aria-label="${label}"]`)!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...options })));
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    fetchWorks.mockResolvedValue(works(25));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Works의 서버 렌더링과 페이지 이동", () => {
    it.each([1, 4, 8])("많은 작품의 %s페이지도 번호 줄과 터치 영역을 분리하고 탐색 순서를 유지한다", async (page) => {
        await render(<WorksClient initialWorks={works(96)} currentPage={page} />);
        const nav = host.querySelector<HTMLElement>('nav[aria-label="페이지 탐색"]')!;
        expect(nav.classList.contains("flex-wrap")).toBe(true);
        expect(nav.children).toHaveLength(3);
        const numbers = nav.children[1];
        expect(numbers.classList.contains("w-full")).toBe(true);
        expect(numbers.classList.contains("sm:w-auto")).toBe(true);
        expect(numbers.children).toHaveLength(5);
        expect(numbers.querySelector('[aria-current="page"]')?.textContent).toBe(String(page));
        const controls = [...nav.querySelectorAll<HTMLElement>('a,button')];
        expect(controls).toHaveLength(9);
        for (const control of controls) {
            expect(control.classList.contains("w-11")).toBe(true);
            expect(control.classList.contains("h-11")).toBe(true);
            expect(control.classList.contains("shrink-0")).toBe(true);
        }
        expect(controls.slice(0, 2).map((node) => node.getAttribute('aria-label'))).toEqual(["첫 페이지", "이전 페이지"]);
        expect(controls.slice(-2).map((node) => node.getAttribute('aria-label'))).toEqual(["다음 페이지", "마지막 페이지"]);
    });
    it("서버 searchParams로 선택한 페이지의 작품을 초기 HTML에 포함한다", async () => {
        const node = await WorksPage({ searchParams: Promise.resolve({ page: "2" }) });
        const html = renderToStaticMarkup(node);
        expect(html).toContain("작품 13");
        expect(html).toContain("작품 24");
        expect(html).not.toContain("작품 25");
        expect(html).toContain('href="/works/work-13"');
    });
    it.each(["1.5", "4.5", "Infinity", "1e2", "nonsense"])("비정상 page=%s도 첫 페이지 전체와 정수 링크만 보여 준다", async (page) => {
        fetchWorks.mockResolvedValue(works(72));
        const node = await WorksPage({ searchParams: Promise.resolve({ page }) });
        await render(node);
        expect(titles()).toHaveLength(12);
        expect(titles()[0]).toBe("작품 1");
        expect(host.querySelector('[aria-current="page"]')?.textContent).toBe("1");
        const labels = Array.from(host.querySelectorAll('nav[aria-label="페이지 탐색"] a')).map((el) => el.getAttribute("aria-label"));
        expect(labels.some((label) => label?.includes(".5"))).toBe(false);
    });
    it("범위 밖 페이지와 잘못된 CMS slug는 빈 목록을 만들지 않는다", async () => {
        fetchWorks.mockResolvedValue([...works(25), { ...works(1)[0], slug: "bad/path" }]);
        const node = await WorksPage({ searchParams: Promise.resolve({ page: "999" }) });
        await render(node);
        expect(titles()).toEqual(["작품 25"]);
        expect(host.querySelector('[aria-current="page"]')?.textContent).toBe("3");
    });
    it("canonical은 실제 선택된 페이지를 가리키고 추적용 쿼리는 제외한다", async () => {
        expect((await generateMetadata({ searchParams: Promise.resolve({ page: "999", campaign: "test" }) })).alternates?.canonical).toBe("/works?page=3");
        expect((await generateMetadata({ searchParams: Promise.resolve({ page: "1.5" }) })).alternates?.canonical).toBe("/works");
    });
    it("공유 주소도 실제 페이지 번호와 일치하며 추적 쿼리·홈 소개를 상속하지 않는다", async () => {
        const metadata = await generateMetadata({ searchParams: Promise.resolve({ page: "999", campaign: "test" }) });
        expect(metadata.alternates?.canonical).toBe("/works?page=3");
        expect(metadata.openGraph).toMatchObject({ url: "/works?page=3", title: "WORKS | WHITE LIGHT STUDIO", description: "화이트라이트 스튜디오에서 제작된 음악 작업물 포트폴리오", siteName: "WHITE LIGHT STUDIO" });
        expect(metadata.twitter).toMatchObject({ title: "WORKS | WHITE LIGHT STUDIO", card: "summary_large_image" });
    });
    it("페이지 링크는 다른 쿼리를 보존하고 replace로 탐색 기록을 덮어쓰지 않는다", async () => {
        await render(<WorksClient initialWorks={works(25)} currentPage={1} query="campaign=a&campaign=b&page=1&page=2" />);
        await click("다음 페이지");
        expect(navigate).toHaveBeenCalledWith("/works?campaign=a&campaign=b&page=2", { replace: undefined });
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
        expect(host.querySelector<HTMLButtonElement>('[aria-label="이전 페이지"]')?.disabled).toBe(true);
    });
    it("새 탭 클릭은 현재 화면을 스크롤하거나 탐색하지 않는다", async () => {
        await render(<WorksClient initialWorks={works(25)} />);
        await click("2페이지", { ctrlKey: true });
        expect(navigate).not.toHaveBeenCalled();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
    it("이미 선택된 페이지 클릭은 탐색 기록을 추가하지 않는다", async () => {
        await render(<WorksClient initialWorks={works(25)} currentPage={2} />);
        await click("2페이지");
        expect(navigate).not.toHaveBeenCalled();
    });
    it("뒤로/앞으로 이동으로 받은 서버 페이지 값은 이전 로컬 상태 없이 반영한다", async () => {
        await render(<WorksClient initialWorks={works(25)} currentPage={2} />);
        expect(titles()[0]).toBe("작품 13");
        await render(<WorksClient initialWorks={works(25)} currentPage={1} />);
        expect(titles()[0]).toBe("작품 1");
        await render(<WorksClient initialWorks={works(25)} currentPage={3} />);
        expect(titles()).toEqual(["작품 25"]);
    });
});
