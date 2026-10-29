// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import PreviewBanner from "./PreviewBanner";
import PreviewBannerView from "./PreviewBannerView";
import { PREVIEW_EXIT_HREF } from "@/lib/preview-path";

const { enabled, pathname } = vi.hoisted(() => ({ enabled: { value: false }, pathname: { value: "/crew" } }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: enabled.value }) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); pathname.value = "/crew"; });
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("미리보기 띠", () => {
    it("미리보기가 꺼져 있으면(일반 방문자) 아무것도 그리지 않는다", async () => {
        enabled.value = false;
        expect(await PreviewBanner()).toBeNull();
    });
    it("미리보기가 켜져 있으면 띠를 그린다", async () => {
        enabled.value = true;
        expect(await PreviewBanner()).not.toBeNull();
    });
    it("홈페이지 화면에서는 안내와 끝내기 링크를 보여 준다", () => {
        act(() => root.render(<PreviewBannerView />));
        expect(host.textContent).toContain("미리보기 중이에요");
        const exit = host.querySelector("a")!;
        expect(exit.getAttribute("href")).toBe(PREVIEW_EXIT_HREF);
        expect(exit.textContent).toContain("미리보기 끝내기");
    });
    it.each(["/manage", "/manage/crew"])("관리 화면(%s)에서는 보이지 않는다", (path) => {
        pathname.value = path;
        act(() => root.render(<PreviewBannerView />));
        expect(host.textContent).toBe("");
    });
});
