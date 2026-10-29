// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionWatcher from "./SessionWatcher";

const clock = Date.parse("2026-10-27T00:00:00.000Z");
let root: Root | null;
let host: HTMLDivElement;
async function render(expiresAt: number) {
    await act(async () => root!.render(<><input aria-label="작성 내용" defaultValue="보존할 작성 내용" /><SessionWatcher expiresAt={expiresAt} /></>));
}
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers(); vi.setSystemTime(clock);
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    host.remove(); vi.useRealTimers(); vi.restoreAllMocks();
});

describe("만료 안내와 작성 내용 보존", () => {
    it("서버 렌더링에서 잘못된 만료 안내를 먼저 출력하지 않는다", () => {
        expect(renderToStaticMarkup(<SessionWatcher expiresAt={clock + 1000} />)).toBe("");
    });
    it("15분보다 많이 남으면 안내를 표시하지 않는다", async () => {
        await render(clock + 15 * 60000 + 1);
        expect(host.querySelector('[role="status"]')).toBeNull();
    });
    it("15분 경계부터 상태 안내와 안전한 새 탭 로그인 링크를 제공한다", async () => {
        await render(clock + 15 * 60000);
        expect(host.querySelector('[role="status"]')?.getAttribute("aria-live")).toBe("polite");
        expect(host.textContent).toContain("약 15분 뒤에");
        const link = host.querySelector("a")!;
        expect(link.getAttribute("href")).toBe("/manage/login");
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });
    it("남은 분은 올림해 만료 전에 0분으로 표시하지 않는다", async () => {
        await render(clock + 60001);
        expect(host.textContent).toContain("약 2분 뒤에");
        await act(async () => vi.advanceTimersByTimeAsync(30000));
        expect(host.textContent).toContain("약 1분 뒤에");
    });
    it("만료 시점에도 폼을 초기화하거나 같은 탭을 이동하지 않는다", async () => {
        const url = window.location.href;
        await render(clock + 30000);
        const field = host.querySelector("input")!;
        field.value = "만료 전 작성한 내용";
        await act(async () => vi.advanceTimersByTimeAsync(30000));
        expect(host.textContent).toContain("로그인이 만료됐어요.");
        expect(host.textContent).toContain("작성 중인 내용은 이 화면에 그대로 있어요.");
        expect(host.querySelector("input")).toBe(field);
        expect(field.value).toBe("만료 전 작성한 내용");
        expect(window.location.href).toBe(url);
    });
    it("이미 만료된 상태도 음수 분 대신 만료 안내를 표시한다", async () => {
        await render(clock - 60000);
        expect(host.textContent).toContain("로그인이 만료됐어요.");
        expect(host.textContent).not.toContain("약 -");
    });
    it("서버가 새 만료 시각을 주면 안내를 해제하고 입력은 유지한다", async () => {
        await render(clock - 1);
        const field = host.querySelector("input")!;
        field.value = "새 로그인 후에도 보존";
        await render(clock + 12 * 60 * 60000);
        expect(host.querySelector('[role="status"]')).toBeNull();
        expect(host.querySelector("input")).toBe(field);
        expect(field.value).toBe("새 로그인 후에도 보존");
    });
    it("StrictMode 재실행·화면 해제 후 타이머를 남기지 않는다", async () => {
        await act(async () => root!.render(<StrictMode><SessionWatcher expiresAt={clock + 60000} /></StrictMode>));
        expect(vi.getTimerCount()).toBe(1);
        await act(async () => root!.unmount()); root = null;
        expect(vi.getTimerCount()).toBe(0);
    });
});
