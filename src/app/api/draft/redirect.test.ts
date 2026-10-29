import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as enableDraft } from "./route";
import { GET as disableDraft } from "../disable-draft/route";

const { enable, disable, redirect } = vi.hoisted(() => ({ enable: vi.fn(), disable: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ enable, disable }) }));
vi.mock("next/navigation", () => ({ redirect }));
beforeEach(() => vi.clearAllMocks());

describe.each([
    { name: "미리보기 켜기", handler: enableDraft, effect: enable },
    { name: "미리보기 끄기", handler: disableDraft, effect: disable },
])("$name의 이동 주소 검증", ({ handler, effect }) => {
    it("복귀 주소가 없으면 홈으로 이동한다", async () => {
        await handler(new Request("https://studio.example/api/draft"));
        expect(redirect).toHaveBeenCalledWith("/");
        expect(effect).toHaveBeenCalledTimes(1);
    });
    it.each([
        "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example",
        "/\r/evil.example", "/a/..//evil.example", "/.//evil.example", "/%2e//evil.example", "javascript:alert(1)", "",
    ])("외부 이동·주소 정규화 우회를 거부한다: %j", async (slug) => {
        const url = new URL("https://studio.example/api/draft");
        url.searchParams.set("slug", slug);
        await handler(new Request(url));
        expect(redirect).toHaveBeenCalledWith("/");
        expect(effect).toHaveBeenCalledTimes(1);
    });

    it.each(["/", "/crew/scon", "/works/앨범?view=preview#credits", "/class?next=https%3A%2F%2Fexample.com"])("정상적인 내부 이동은 유지한다: %s", async (slug) => {
        const url = new URL("https://studio.example/api/draft");
        url.searchParams.set("slug", slug);
        await handler(new Request(url));
        const target = redirect.mock.calls[0][0] as string;
        expect(new URL(target, "https://studio.example").href).toBe(new URL(slug, "https://studio.example").href);
        expect(effect).toHaveBeenCalledTimes(1);
    });
});
