// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideAudioPresentation, showAudioPresentation, updateAudioPresentation } from "./audio-presentation";

let reduced: boolean, icon: HTMLLinkElement, audio: HTMLAudioElement, second: HTMLAudioElement;
const listeners = new Set<() => void>();
function prefer(value: boolean) { reduced = value; listeners.forEach((listener) => listener()); }
beforeEach(() => {
    vi.useFakeTimers(); reduced = false; listeners.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ get matches() { return reduced; },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })));
    document.title = "원래 제목";
    icon = document.createElement("link"); icon.rel = "icon"; icon.href = "/favicon.ico"; document.head.append(icon);
    audio = document.createElement("audio"); second = document.createElement("audio");
});
afterEach(() => {
    hideAudioPresentation(audio); hideAudioPresentation(second);
    expect(listeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    icon.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
});
describe("재생 파비콘의 동작 줄이기", () => {
    it("재생 중 설정을 켜면 즉시 정지하고 끄면 다시 움직인다", () => {
        showAudioPresentation(audio, "곡"); const first = icon.href;
        vi.advanceTimersByTime(300); expect(icon.href).not.toBe(first);
        prefer(true); const still = icon.href;
        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(2000); expect(icon.href).toBe(still);
        expect(document.title).toBe("▶ Playing: 곡");
        prefer(false); vi.advanceTimersByTime(300); expect(icon.href).not.toBe(still);
        hideAudioPresentation(audio);
        expect(document.title).toBe("원래 제목"); expect(icon.getAttribute("href")).toBe("/favicon.ico");
    });
    it("처음부터 설정이 켜져 있으면 반복 타이머를 만들지 않는다", () => {
        reduced = true; showAudioPresentation(audio);
        const first = icon.href; vi.advanceTimersByTime(3000);
        expect(icon.href).toBe(first); expect(vi.getTimerCount()).toBe(0);
    });
    it("소유권 변경과 제목 갱신이 이전 구독을 정리하고 늦은 이벤트를 무시한다", () => {
        showAudioPresentation(audio, "이전"); const stale = [...listeners][0];
        showAudioPresentation(second, "새 곡"); expect(listeners.size).toBe(1);
        hideAudioPresentation(audio); stale(); expect(vi.getTimerCount()).toBe(1);
        expect(document.title).toBe("▶ Playing: 새 곡");
        updateAudioPresentation(second, "새 제목"); expect(listeners.size).toBe(1);
        prefer(true); expect(vi.getTimerCount()).toBe(0);
        hideAudioPresentation(second); expect(document.title).toBe("원래 제목");
    });
    it("아이콘이 없으면 구독과 타이머를 남기지 않는다", () => {
        icon.remove(); showAudioPresentation(audio);
        expect(listeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    });
});
