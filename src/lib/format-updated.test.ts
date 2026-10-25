import { describe, expect, it } from "vitest";
import { formatAbsolute, formatUpdated } from "./format-updated";

// 한국 시간 2026-10-20 15:00 (UTC 06:00)
const now = new Date("2026-10-20T06:00:00Z");

describe("formatUpdated — 마지막 수정 문구(한국 시간)", () => {
    it.each([
        ["2026-10-20T05:59:40Z", "방금 수정"],
        ["2026-10-20T05:30:00Z", "30분 전 수정"],
        ["2026-10-20T01:00:00Z", "5시간 전 수정"],
        ["2026-10-19T10:00:00Z", "어제 수정"],
        ["2026-10-10T00:00:00Z", "10월 10일 수정"],
        ["2025-03-02T00:00:00Z", "2025년 3월 2일 수정"],
    ])("%s → %s", (iso, expected) => {
        expect(formatUpdated(iso, now)).toBe(expected);
    });

    it("값이 없거나 잘못되면 null", () => {
        expect(formatUpdated(undefined, now)).toBeNull();
        expect(formatUpdated(null, now)).toBeNull();
        expect(formatUpdated("not-a-date", now)).toBeNull();
    });

    it("날짜 경계는 한국 시간 기준이다 (UTC로는 같은 날, 한국에서는 어제)", () => {
        // 한국 10-19 23:30 = UTC 10-19 14:30. 지금(한국 10-20 00:10)에서 보면 '어제'
        const justAfterMidnightKst = new Date("2026-10-19T15:10:00Z");
        expect(formatUpdated("2026-10-19T14:30:00Z", justAfterMidnightKst)).toBe("40분 전 수정");
        // 한국 10-19 01:00 → 지금(10-20 00:10)에서 보면 어제
        expect(formatUpdated("2026-10-18T16:00:00Z", justAfterMidnightKst)).toBe("어제 수정");
        // 한국 10-18 23:30 → 이틀 전
        expect(formatUpdated("2026-10-18T14:30:00Z", justAfterMidnightKst)).toBe("10월 18일 수정");
    });
});

describe("formatAbsolute", () => {
    it("한국 시간으로 날짜와 시각을 보여 준다", () => {
        expect(formatAbsolute("2026-10-20T01:00:00Z")).toBe("2026년 10월 20일 오전 10:00");
    });
});
