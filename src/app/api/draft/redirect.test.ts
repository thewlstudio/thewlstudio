import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as enableDraft } from "./route";
import { GET as disableDraft } from "../disable-draft/route";

const { enable, disable } = vi.hoisted(() => ({ enable: vi.fn(), disable: vi.fn() }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ enable, disable }) }));
beforeEach(() => vi.clearAllMocks());

function expectRedirect(response: Response, path: string) {
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(path);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
}

describe("예전 미리보기 켜기 경로(/api/draft)", () => {
    it("어떤 요청에도 아무것도 켜지 않고 403을 반환한다", async () => {
        const response = await enableDraft();
        expect(response.status).toBe(403);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(enable).not.toHaveBeenCalled();
        expect(response.headers.has("location")).toBe(false);
        expect(disable).not.toHaveBeenCalled();
    });
});

describe("미리보기 끄기의 이동 주소 검증", () => {
    it("복귀 주소가 없으면 홈으로 이동한다", async () => {
        expectRedirect(await disableDraft(new Request("https://studio.example/api/disable-draft")), "/");
        expect(disable).toHaveBeenCalledTimes(1);
    });
    it.each([
        "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example",
        "/\r/evil.example", "/a/..//evil.example", "/.//evil.example", "/%2e//evil.example", "javascript:alert(1)", "",
    ])("외부 이동·주소 정규화 우회를 거부한다: %j", async (slug) => {
        const url = new URL("https://studio.example/api/disable-draft");
        url.searchParams.set("slug", slug);
        expectRedirect(await disableDraft(new Request(url)), "/");
        expect(disable).toHaveBeenCalledTimes(1);
    });
    it.each(["/", "/manage", "/crew/scon", "/works/앨범?view=preview#credits", "/class?next=https%3A%2F%2Fexample.com"])("정상적인 내부 이동은 유지한다: %s", async (slug) => {
        const url = new URL("https://studio.example/api/disable-draft");
        url.searchParams.set("slug", slug);
        const response = await disableDraft(new Request(url));
        const expected = new URL(slug, "https://studio.example");
        const target = expected.pathname + expected.search + expected.hash;
        expectRedirect(response, target);
        expect(new URL(target, "https://studio.example").href).toBe(new URL(slug, "https://studio.example").href);
        expect(disable).toHaveBeenCalledTimes(1);
    });
});
