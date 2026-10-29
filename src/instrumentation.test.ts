import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { init, captureRequestError, loaded } = vi.hoisted(() => ({ init: vi.fn(), captureRequestError: vi.fn(), loaded: vi.fn() }));
vi.mock("@sentry/nextjs", () => { loaded(); return { init, captureRequestError }; });

const request = { path: "/x", method: "GET", headers: {} };
const context = { routerKind: "App Router", routePath: "/x", routeType: "render", renderSource: "react-server-components", revalidateReason: undefined, renderType: "dynamic" } as const;
beforeEach(() => { vi.resetModules(); init.mockReset(); captureRequestError.mockReset(); loaded.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("서버 오류 감시(instrumentation)", () => {
    it("DSN이 없으면 Sentry를 불러오지도 초기화하지도 않는다(휴면)", async () => {
        vi.stubEnv("NEXT_RUNTIME", "nodejs");
        vi.stubEnv("SENTRY_DSN", "");
        const { register, onRequestError } = await import("./instrumentation");
        await register();
        await onRequestError(new Error("x"), request, context);
        expect(loaded).not.toHaveBeenCalled();
        expect(init).not.toHaveBeenCalled();
        expect(captureRequestError).not.toHaveBeenCalled();
    });
    it("Node 런타임이 아니면 DSN이 있어도 아무것도 하지 않는다", async () => {
        vi.stubEnv("NEXT_RUNTIME", "edge");
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        const { register, onRequestError } = await import("./instrumentation");
        await register();
        await onRequestError(new Error("x"), request, context);
        expect(init).not.toHaveBeenCalled();
        expect(captureRequestError).not.toHaveBeenCalled();
    });
    it("DSN이 있으면 오류만 보내도록, 쿠키·헤더·본문·쿼리·사용자 정보를 끄고 초기화한다", async () => {
        vi.stubEnv("NEXT_RUNTIME", "nodejs");
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        const { register } = await import("./instrumentation");
        await register();
        const options = init.mock.calls[0][0];
        expect(options).toMatchObject({ dsn: "https://key@o0.ingest.sentry.io/1", tracesSampleRate: 0, dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false } });
        // 마지막 방어선: 전송 직전 정리
        const scrubbed = options.beforeSend({ request: { cookies: { s: "1" }, data: "pw" } });
        expect(scrubbed.request).not.toHaveProperty("cookies");
        expect(scrubbed.request).not.toHaveProperty("data");
    });
    it("DSN이 있으면 요청 오류를 Sentry로 넘긴다", async () => {
        vi.stubEnv("NEXT_RUNTIME", "nodejs");
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        const { onRequestError } = await import("./instrumentation");
        const error = new Error("boom");
        await onRequestError(error, request, context);
        expect(captureRequestError).toHaveBeenCalledExactlyOnceWith(error, request, context);
    });
});
