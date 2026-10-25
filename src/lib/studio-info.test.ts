import { describe, expect, it } from "vitest";
import { FALLBACK_INFO, mergeInfo } from "./studio-info";

describe("mergeInfo — 스튜디오 안내", () => {
    it("문서가 없으면 기본값", () => {
        expect(mergeInfo(null)).toEqual(FALLBACK_INFO);
    });

    it("필드가 아예 없으면 그 필드만 기본값", () => {
        const m = mergeInfo({ parkingFee: "10분 500원" });
        expect(m.parkingFee).toBe("10분 500원");
        expect(m.services).toEqual(FALLBACK_INFO.services);
        expect(m.cctvTitle).toBe(FALLBACK_INFO.cctvTitle);
    });

    it("일부러 비운 목록은 비어 있는 그대로 둔다 (지운 항목이 되살아나면 안 됨)", () => {
        const m = mergeInfo({ services: [], amenities: [], membershipNote: "" });
        expect(m.services).toEqual([]);
        expect(m.amenities).toEqual([]);
        expect(m.membershipNote).toBe("");
    });

    it("목록 항목의 누락된 하위 값은 빈 값으로 채워 화면이 깨지지 않게 한다", () => {
        const m = mergeInfo({ services: [{ title: "X" }], memberships: [{ label: "1개월" }] });
        expect(m.services[0]).toEqual({ title: "X", price: "", priceUnit: "", points: [] });
        expect(m.memberships[0]).toEqual({ num: "", label: "1개월", sub: "", price: "" });
    });
});
