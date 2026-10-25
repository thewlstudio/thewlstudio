import { beforeEach, describe, expect, it } from "vitest";

// 브라우저 저장소를 흉내 낸다 (모듈은 localStorage·window만 쓴다)
const store: Record<string, string> = {};
(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
        store[k] = v;
    },
};
(globalThis as Record<string, unknown>).window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };

import { checklist, STEPS } from "./storage";

beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
});

describe("체크리스트 저장 규칙", () => {
    it.each([
        ["/manage/contact", ["intro-save"]],
        ["/manage/works/abc", ["content-save"]],
        ["/manage/crew/abc", ["content-save"]],
        ["/manage/instructors/abc", ["content-save"]],
        ["/manage/studio/studioSpace-room-a", ["content-save"]],
        ["/manage/studio/info", ["content-save"]],
    ])("저장 성공: %s → %j", (p, expected) => {
        checklist.markSave(p);
        expect(checklist.done()).toEqual(expected);
    });

    it.each(["/manage", "/manage/crew", "/manage/works", "/manage/help", "/manage/history/crew/x", "/manage/map"])("저장이 아닌 화면은 체크하지 않는다: %s", (p) => {
        checklist.markSave(p);
        expect(checklist.done()).toEqual([]);
    });

    it("같은 항목을 여러 번 완료해도 한 번만 기록한다", () => {
        checklist.mark("help");
        checklist.mark("help");
        expect(checklist.done()).toEqual(["help"]);
    });

    it("스냅샷은 완료 항목과 숨김 여부를 담는다", () => {
        checklist.mark("help");
        expect(checklist.snapshot()).toBe("help|");
        checklist.setHidden(true);
        expect(checklist.snapshot()).toBe("help|h");
        checklist.reset();
        expect(checklist.snapshot()).toBe("|");
    });

    it("항목은 5개이고 id가 고유하다", () => {
        expect(STEPS).toHaveLength(5);
        expect(new Set(STEPS.map((s) => s.id)).size).toBe(5);
    });

    it("저장소가 깨져 있어도 예외 없이 빈 상태로 동작한다", () => {
        store["wls_checklist_v1"] = "{깨진 JSON";
        expect(checklist.done()).toEqual([]);
    });
});
