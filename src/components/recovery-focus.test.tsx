// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";
import PageError from "@/app/error";
import PageNavigationFocus from "./PageNavigationFocus";

const state = vi.hoisted(() => ({ pathname: "/missing-one" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
let root: Root;
let host: HTMLDivElement;
function path(value: string) { state.pathname = value; history.replaceState({}, "", value); }
async function render(node: ReactNode) { await act(async () => root.render(<StrictMode>{node}</StrictMode>)); }
const title = () => host.querySelector<HTMLElement>("#page-title")!;
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    path("/missing-one");
    vi.spyOn(console, "error").mockImplementation(() => {});
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
describe("오류·404의 본문 안내", () => {
    it("정적 404의 내부 경로는 서버에서 방문 URL로 출력하지 않는다", () => {
        state.pathname = "/_not-found";
        expect(renderToString(<NotFound />)).not.toContain('data-page-path="/_not-found"');
    });
    it.each(["/_not-found", null])("정적 404 훅 값이 %s이면 잘못된 경로 표식을 생략한다", async (pathname) => {
        state.pathname = pathname;
        await render(<NotFound />);
        expect(title().dataset.pagePath).toBeUndefined();
        expect(title().tagName).toBe("H1");
    });
    it("404의 실제 안내를 유일한 h1로 두며 첫 진입에는 초점을 강제하지 않는다", async () => {
        await render(<><PageNavigationFocus /><NotFound /></>);
        expect(host.querySelectorAll("h1")).toHaveLength(1);
        expect(title().tagName).toBe("H1");
        expect(title().textContent).toBe("Page Not Found");
        expect(title().tabIndex).toBe(-1);
        expect(title().dataset.pagePath).toBe("/missing-one");
        expect(host.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe("404");
        expect(document.activeElement).toBe(document.body);
        expect(host.querySelector("a")?.getAttribute("href")).toBe("/");
    });
    it("다른 404 주소에서 같은 제목 DOM을 재사용해도 이동 안내가 멈추지 않는다", async () => {
        const frame = () => <><PageNavigationFocus /><NotFound /></>;
        await render(frame()); const previous = title();
        path("/missing-two"); await render(frame());
        expect(title()).toBe(previous);
        expect(title().dataset.pagePath).toBe("/missing-two");
        expect(document.activeElement).toBe(title());
    });
    it("404 이동 중 직접 선택한 입력칸의 초점은 유지한다", async () => {
        const frame = () => <><PageNavigationFocus /><input /><NotFound /></>;
        await render(frame()); const input = host.querySelector("input")!; input.focus();
        path("/missing-two"); await render(frame());
        expect(document.activeElement).toBe(input);
    });
    it("뒤로 가기로 재사용된 404가 돌아오면 자동 초점을 추가하지 않는다", async () => {
        const frame = () => <><PageNavigationFocus /><NotFound /></>;
        await render(frame()); path("/missing-two");
        window.dispatchEvent(new PopStateEvent("popstate")); await render(frame());
        expect(document.activeElement).toBe(document.body);
    });
    it("주소가 그대로인 채 본문이 오류로 바뀌어도 안내 제목에 초점을 연결한다", async () => {
        await render(<><PageNavigationFocus /><main><button>기존 내용</button></main></>);
        host.querySelector("button")!.focus();
        await render(<><PageNavigationFocus /><PageError error={null} retry={vi.fn()} /></>);
        expect(document.activeElement).toBe(title());
        expect(title().dataset.pagePath).toBe("/missing-one");
    });
    it("오류가 나타나도 남아 있는 사용자 입력의 초점은 빼앗지 않는다", async () => {
        await render(<><input /><div /></>); const input = host.querySelector("input")!; input.focus();
        await render(<><input /><PageError error={null} retry={vi.fn()} /></>);
        expect(document.activeElement).toBe(input);
    });
    it.each(["inert", "hidden", "aria-hidden"])("%s인 오류 제목에는 자동 초점을 주지 않는다", async (attribute) => {
        const props = attribute === "aria-hidden" ? { "aria-hidden": true as const } : { [attribute]: true };
        await render(<div {...props}><PageError error={null} retry={vi.fn()} /></div>);
        expect(document.activeElement).toBe(document.body);
    });
});
