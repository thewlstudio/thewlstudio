import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("next-sanity", () => ({ createClient: create }));
beforeEach(() => { vi.resetModules(); create.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("관리 변경·이력 조회용 클라이언트의 원본 API 정책", () => {
    it("쓰기 설정이 없으면 클라이언트를 만들지 않는다", async () => {
        vi.stubEnv("SANITY_API_WRITE_TOKEN", "");
        const { getWriteClient, isWriteConfigured } = await import("./writeClient");
        expect(isWriteConfigured()).toBe(false); expect(() => getWriteClient()).toThrow(); expect(create).not.toHaveBeenCalled();
    });
    it("변경 대상·현재 버전·이력은 CDN이 꺼진 서버 클라이언트를 사용한다", async () => {
        vi.stubEnv("SANITY_API_WRITE_TOKEN", "test-only-token");
        const { getWriteClient, isWriteConfigured } = await import("./writeClient");
        const sentinel = {}; create.mockReturnValue(sentinel);
        expect(isWriteConfigured()).toBe(true); expect(getWriteClient()).toBe(sentinel);
        expect(create).toHaveBeenCalledTimes(1); expect(create.mock.calls[0][0].useCdn).toBe(false);
        expect(create.mock.calls[0][0].fetch).toBeUndefined();
    });
});
