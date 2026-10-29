import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { previewTarget, previewHref } from "@/lib/preview-path";

const { enable, redirect, authed } = vi.hoisted(() => ({ enable: vi.fn(), redirect: vi.fn(), authed: vi.fn() }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ enable }) }));
// 실제 redirect()처럼 던져서 이후 코드가 실행되지 않게 한다
vi.mock("next/navigation", () => ({ redirect: (to: string) => { redirect(to); throw new Error(`NEXT_REDIRECT:${to}`); } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: authed }));
beforeEach(() => { vi.clearAllMocks(); authed.mockResolvedValue(true); });

const call = (to?: string) => GET(new Request(`https://studio.example/manage/preview${to === undefined ? "" : `?to=${encodeURIComponent(to)}`}`)).catch((e: Error) => e);

describe("관리자 미리보기 진입(/manage/preview)", () => {
    it("로그인하지 않았으면 미리보기를 켜지 않고 로그인으로 보낸다", async () => {
        authed.mockResolvedValue(false);
        const result = await call("/crew/scon");
        expect(String(result)).toContain("NEXT_REDIRECT:/manage/login");
        expect(enable).not.toHaveBeenCalled();
    });
    it("로그인했으면 미리보기를 켜고 요청한 홈페이지 화면으로 이동한다", async () => {
        await call("/crew/scon");
        expect(enable).toHaveBeenCalledTimes(1);
        expect(redirect).toHaveBeenCalledWith("/crew/scon");
    });
    it("주소가 없으면 홈으로 이동한다", async () => {
        await call();
        expect(redirect).toHaveBeenCalledWith("/");
    });
    it.each(["/manage", "/manage/crew", "/manage?x=1", "/api/draft", "/api", "/admin", "/admin/desk", "https://evil.example", "//evil.example", "/\\evil.example"])("관리·API·편집기·외부 주소는 홈으로 돌린다: %s", async (to) => {
        await call(to);
        expect(redirect).toHaveBeenCalledWith("/");
    });
});

describe("미리보기 주소 규칙", () => {
    it.each(["/works/a", "/studio", "/class", "/crew/%ED%95%9C%EA%B8%80", "/managers", "/apiary"])("홈페이지 화면은 그대로 둔다: %s", (path) => {
        expect(previewTarget(path)).toBe(path);
    });
    it("만든 주소를 다시 해석하면 원래 경로가 나온다", () => {
        const path = "/works/" + encodeURIComponent("a?b#c 100%");
        const to = new URL(previewHref(path), "https://x.example").searchParams.get("to");
        expect(previewTarget(to)).toBe(path);
    });
});
