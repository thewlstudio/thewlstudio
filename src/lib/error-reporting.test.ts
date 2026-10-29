import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { reportError, shouldReport } from "./error-reporting";

const apiError = (statusCode: number) => Object.assign(new Error("Request failed"), { statusCode });
beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); captureException.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("보고할 오류 구분", () => {
    it("Sanity·네트워크 같은 예상 밖 오류는 보낸다", () => {
        expect(shouldReport(apiError(500))).toBe(true);
        expect(shouldReport(apiError(401))).toBe(true);
        expect(shouldReport(new TypeError("fetch failed"))).toBe(true);
        expect(shouldReport("문자열 오류")).toBe(true);
    });
    it("동시 수정 충돌(409)은 안내 문구로 처리되므로 보내지 않는다", () => expect(shouldReport(apiError(409))).toBe(false));
    it("앱이 직접 던지는 한글 안내 문구(사용자 실수)는 보내지 않는다", () => {
        expect(shouldReport(new Error("사진 파일이 비어 있어요. 다른 사진을 골라 주세요."))).toBe(false);
        expect(shouldReport(new Error("이미지 파일만 올릴 수 있어요."))).toBe(false);
    });
    it("상태 코드가 있으면 한글 메시지여도 보낸다(서버가 준 오류)", () => {
        expect(shouldReport(Object.assign(new Error("권한이 없어요"), { statusCode: 403 }))).toBe(true);
    });
});

describe("오류 보고", () => {
    it("항상 콘솔에 [범위]와 함께 남긴다", () => {
        const error = apiError(500);
        reportError("saveCrew", error);
        expect(console.error).toHaveBeenCalledWith("[saveCrew]", error);
    });
    it("DSN이 없으면 Sentry를 부르지 않는다(휴면)", async () => {
        vi.stubEnv("SENTRY_DSN", "");
        reportError("saveCrew", apiError(500));
        await flush();
        expect(captureException).not.toHaveBeenCalled();
    });
    it("DSN이 있고 보낼 오류면 범위 태그와 함께 보낸다", async () => {
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        const error = apiError(500);
        reportError("saveCrew", error);
        await flush();
        expect(captureException).toHaveBeenCalledExactlyOnceWith(error, { tags: { scope: "saveCrew" } });
    });
    it("DSN이 있어도 예상된 오류는 보내지 않는다", async () => {
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        reportError("saveCrew", new Error("사진 파일이 비어 있어요."));
        reportError("saveCrew", apiError(409));
        await flush();
        expect(captureException).not.toHaveBeenCalled();
    });
    it("Sentry 쪽이 실패해도 원래 요청을 깨뜨리지 않는다", async () => {
        vi.stubEnv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
        captureException.mockImplementation(() => { throw new Error("sentry down"); });
        expect(() => reportError("saveCrew", apiError(500))).not.toThrow();
        await flush();
    });
});
