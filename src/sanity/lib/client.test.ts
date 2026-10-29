import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanityFetch } from "./client";

const { read, draft, configuration } = vi.hoisted(() => ({ read: vi.fn(), draft: vi.fn(), configuration: { value: undefined as unknown } }));
vi.mock("next-sanity", () => ({ createClient: (options: unknown) => { configuration.value = options; return { fetch: read }; } }));
vi.mock("next/headers", () => ({ draftMode: draft }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SANITY_API_READ_TOKEN", "");
    draft.mockResolvedValue({ isEnabled: false });
    read.mockResolvedValue({ value: "응답" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("공개 Sanity 조회 캐시 설정", () => {
    it("Sanity CDN의 별도 지연 캐시를 사용하지 않는다", () => {
        expect(configuration.value).toMatchObject({ useCdn: false });
    });
    it.each(["instructor", "crew", "work", "studioSpace", "studioInfo", "siteSettings"])("%s 태그를 Next 캐시에 전달하고 원본 응답을 유지한다", async (tag) => {
        const response = Object.freeze({ value: "바꾸지 않을 응답" });
        read.mockResolvedValue(response);
        const params = Object.freeze({ slug: "literal%40name" });
        expect(await sanityFetch({ query: "query", params, tags: [tag] })).toBe(response);
        expect(read).toHaveBeenCalledExactlyOnceWith("query", { slug: "literal%40name", includeHidden: false }, { next: { revalidate: 3600, tags: [tag] } });
    });
    it("공개 요청은 읽기 토큰이 설정되어도 토큰·초안 옵션을 붙이지 않고 비공개 항목을 제외한다", async () => {
        vi.stubEnv("SANITY_API_READ_TOKEN", "test-only-token");
        await sanityFetch({ query: "query" });
        expect(read).toHaveBeenCalledExactlyOnceWith("query", { includeHidden: false }, { next: { revalidate: 3600, tags: undefined } });
        expect(read.mock.calls[0][2]).not.toHaveProperty("token");
        expect(read.mock.calls[0][2]).not.toHaveProperty("perspective");
    });
    it("미리보기 요청은 비공개 항목을 포함하되 토큰·초안(drafts.*)을 쓰지 않고 공개 캐시도 재사용하지 않는다", async () => {
        vi.stubEnv("SANITY_API_READ_TOKEN", "test-only-token");
        draft.mockResolvedValue({ isEnabled: true });
        await sanityFetch({ query: "query", params: { slug: "a" }, tags: ["work"] });
        expect(read).toHaveBeenCalledExactlyOnceWith("query", { slug: "a", includeHidden: true }, { next: { revalidate: 0, tags: ["work"] } });
        expect(read.mock.calls[0][2]).not.toHaveProperty("token");
        expect(read.mock.calls[0][2]).not.toHaveProperty("perspective");
    });
    it("호출자가 includeHidden을 직접 넘겨도 미리보기 상태가 우선한다", async () => {
        await sanityFetch({ query: "query", params: { includeHidden: true } });
        expect(read.mock.calls[0][1]).toEqual({ includeHidden: false });
    });
    it("조회 실패를 가짜 성공 데이터로 바꾸지 않는다", async () => {
        read.mockRejectedValue(new Error("read failed"));
        await expect(sanityFetch({ query: "query", tags: ["crew"] })).rejects.toThrow("read failed");
    });
});
