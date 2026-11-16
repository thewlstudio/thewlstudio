// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageNavigationFocus from "./PageNavigationFocus";
import WorkDetailClient from "@/app/works/[slug]/WorkDetailClient";
import CrewDetailClient from "@/app/crew/[slug]/CrewDetailClient";
import { readPublicDetail } from "@/lib/public-detail-read";
import { publicDetailPath } from "@/lib/public-routes";
const state = vi.hoisted(() => ({ pathname: "/works/first" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("motion/react", async () => {
    const { createElement } = await import("react");
    const components = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition", "variants"]);
    return { motion: new Proxy({}, { get: (_, tag: string) => {
        if (!components.has(tag)) components.set(tag, (props) => createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))), props.children as ReactNode));
        return components.get(tag);
    } }) };
});
const scroll = vi.fn();
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    scroll.mockReset(); state.pathname = "/works/first"; history.replaceState({}, "", state.pathname);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
    (document.activeElement as HTMLElement)?.blur?.(); await act(async () => root.unmount()); host.remove();
    if (originalScroll) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll); else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    vi.restoreAllMocks();
});
const title = () => document.getElementById("page-title")!;
function path(value: string) { state.pathname = value; history.replaceState({}, "", value); }
function Frame({ route = state.pathname, ready = true, name = "작품", staleSlug }: { route?: string; ready?: boolean; name?: string; staleSlug?: string }) {
    // 실제 workBySlugQuery처럼 slug를 포함하지 않는 결과를 사용한다.
    const document = readPublicDetail("work", { title: name, artist: "아티스트", imageUrl: null, contentBlocks: [], ...(staleSlug ? { slug: staleSlug } : {}) })!;
    return <><PageNavigationFocus /><input aria-label="사용자 입력" />{ready && <WorkDetailClient initialWork={document} path={route} />}</>;
}
async function render(node: ReactNode) { await act(async () => root.render(<StrictMode>{node}</StrictMode>)); }
describe("실제 상세 본문과 경로별 포커스 연결", () => {
    it.each(["second", "With_you_n@di", "한글", "literal%2Fname", "100%"])("slug 필드가 없어도 %s의 새 제목을 재사용된 DOM에서 인식한다", async (slug) => {
        await render(<Frame />); const before = title();
        expect(document.activeElement).toBe(document.body);
        const route = publicDetailPath("works", slug)!; path(route);
        await render(<Frame name="새 작품" />);
        expect(title()).toBe(before); expect(title().dataset.pagePath).toBe(route);
        expect(document.activeElement).toBe(title()); expect(title().textContent).toContain("새 작품");
    });
    it("조회 결과에 잘못된 slug가 있어도 서버가 전달한 실제 경로가 우선한다", async () => {
        await render(<Frame staleSlug="wrong-source" />);
        path("/works/second"); await render(<Frame staleSlug="wrong-source" />);
        expect(title().dataset.pagePath).toBe("/works/second"); expect(document.activeElement).toBe(title());
    });
    it("로딩 중 이전 Works 본문은 건드리지 않고 새 경로 표식이 반영될 때 이동한다", async () => {
        await render(<Frame />); path("/works/second");
        await render(<Frame route="/works/first" />);
        expect(document.activeElement).toBe(document.body);
        await render(<Frame route="/works/second" />); expect(document.activeElement).toBe(title());
    });
    it("새 본문이 늦게 도착해도 이미 선택한 입력에서 포커스를 빼앗지 않는다", async () => {
        await render(<Frame />); path("/works/second"); await render(<Frame ready={false} />);
        const input = host.querySelector("input")!; input.focus();
        await render(<Frame />); expect(document.activeElement).toBe(input);
    });
    it("Crew 상세도 재사용된 제목에서 다음 경로를 구분한다", async () => {
        const member = readPublicDetail("crew", { name: "크루", role: "역할", imageUrl: null, sections: [] })!;
        path("/crew/first");
        await render(<><PageNavigationFocus /><CrewDetailClient member={member} path={state.pathname} /></>);
        const before = title(); path("/crew/second");
        await render(<><PageNavigationFocus /><CrewDetailClient member={member} path={state.pathname} /></>);
        expect(title()).toBe(before); expect(title().dataset.pagePath).toBe("/crew/second"); expect(document.activeElement).toBe(title());
    });
});
