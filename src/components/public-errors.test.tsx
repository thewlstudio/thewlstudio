// @vitest-environment jsdom
import { act, Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageError from "@/app/error";
import WorksError from "@/app/works/error";
import CrewError from "@/app/crew/error";
import GlobalError from "@/app/global-error";
import ManageError from "@/app/manage/error";
const state = vi.hoisted(() => ({ pathname: "/works" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next/link", () => ({ default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
describe.each([
    { Component: PageError, title: "문제가 발생했습니다" },
    { Component: WorksError, title: "작업물을 불러올 수 없습니다" },
    { Component: CrewError, title: "크루 정보를 불러올 수 없습니다" },
    { Component: ManageError, title: "화면을 불러오지 못했어요" },
])("공개 오류 화면 $title", ({ Component, title }) => {
    it("다시 시도는 reset이 아닌 프레임워크의 재조회 retry를 호출한다", async () => {
        const retry = vi.fn(), reset = vi.fn(); const callbacks = { retry, reset };
        act(() => root.render(<Component error={new Error("test-only-source-detail")} {...callbacks} />));
        expect(host.querySelector("h1")?.textContent).toBe(title);
        await act(async () => host.querySelector("button")!.click());
        expect(retry).toHaveBeenCalledTimes(1); expect(reset).not.toHaveBeenCalled();
    });
    it("오류 원문을 화면에 노출하지 않고 홈 이동을 유지한다", () => {
        act(() => root.render(<Component error={{ message: "test-only-source-detail" }} retry={vi.fn()} />));
        expect(host.textContent).not.toContain("test-only-source-detail");
        expect(host.querySelector("a")?.getAttribute("href")).toBe(Component === ManageError ? "/manage" : "/");
    });
});
describe("오류 화면 대비", () => {
    it("검은 화면에서는 홈 링크·재시도 버튼과 키보드 윤곽선이 배경에 묻히지 않는다", () => {
        act(() => root.render(<PageError error={null} retry={vi.fn()} />));
        expect(host.querySelector("main")?.classList.contains("bg-black")).toBe(true);
        expect(host.querySelector("a")?.className).toContain("border-white text-white");
        expect(host.querySelector("button")?.className).toContain("bg-white text-black");
        for (const element of host.querySelectorAll("a,button")) expect(element.className).toContain("focus-visible:outline-white");
    });
    it.each([WorksError, CrewError])("밝은 화면의 기존 대비는 유지한다", (Component) => {
        act(() => root.render(<Component error={null} retry={vi.fn()} />));
        expect(host.querySelector("a")?.className).toContain("border-black text-black");
        expect(host.querySelector("button")?.className).toContain("bg-black text-white");
    });
});
type Props = { children?: ReactNode; onClick?: unknown };
function nodes(node: ReactNode): ReactElement<Props>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...nodes(child.props.children)] : []);
}
describe("루트 레이아웃 바깥의 오류 화면", () => {
    it("문서 전체 오류도 실제 retry를 버튼에 연결한다", () => {
        const retry = vi.fn(); let captured: ReactNode;
        function Capture() { captured = GlobalError({ error: null, retry }); return captured; }
        renderToStaticMarkup(<Capture />);
        expect(nodes(captured).find((child) => child.type === "button")?.props.onClick).toBe(retry);
    });
    it("HTML·body를 유지하고 민감한 오류 문구는 출력하지 않는다", () => {
        const markup = renderToStaticMarkup(<GlobalError error="test-only-source-detail" retry={vi.fn()} />);
        expect(markup).toContain('<html lang="ko">'); expect(markup).toContain("<body");
        expect(markup).not.toContain("test-only-source-detail");
    });
    it("루트 레이아웃 없이도 제목·검색 방지·본문 랜드마크를 제공한다", () => {
        const markup = renderToStaticMarkup(<GlobalError error={null} retry={vi.fn()} />);
        const doc = new DOMParser().parseFromString(markup, "text/html");
        expect(doc.title).toContain("문제가 발생했습니다");
        expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
        expect(doc.querySelectorAll("main")).toHaveLength(1);
        expect(doc.querySelector("main h1")?.id).toBe("page-title");
        expect(doc.querySelector("h1")?.tabIndex).toBe(-1);
        expect(doc.querySelector("button")?.type).toBe("button");
    });
});
