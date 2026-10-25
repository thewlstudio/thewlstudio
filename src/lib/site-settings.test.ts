import { describe, expect, it } from "vitest";
import { FALLBACK_SETTINGS, mapEmbedUrl, mergeSettings } from "./site-settings";

describe("mergeSettings — 연락처·링크 설정", () => {
    it("문서가 없으면 기본값", () => {
        expect(mergeSettings(null)).toEqual(FALLBACK_SETTINGS);
        expect(mergeSettings(undefined)).toEqual(FALLBACK_SETTINGS);
    });

    it("값이 있는 항목만 덮어쓰고 나머지는 기본값", () => {
        const m = mergeSettings({ phone: "02-123-4567", addressKo: "서울 어딘가" });
        expect(m.phone).toBe("02-123-4567");
        expect(m.addressKo).toBe("서울 어딘가");
        expect(m.blogUrl).toBe(FALLBACK_SETTINGS.blogUrl);
    });

    it("빈 문자열·공백·문자열이 아닌 값은 무시하고 기본값을 쓴다", () => {
        const m = mergeSettings({ phone: "", addressKo: "   ", addressEn: 123 as unknown });
        expect(m.phone).toBe(FALLBACK_SETTINGS.phone);
        expect(m.addressKo).toBe(FALLBACK_SETTINGS.addressKo);
        expect(m.addressEn).toBe(FALLBACK_SETTINGS.addressEn);
    });

    it("https가 아닌 링크(javascript:, http:, 상대경로)는 버린다 — 화면에 위험한 링크가 나가지 않게", () => {
        const m = mergeSettings({
            instagramUrl: "javascript:alert(1)",
            blogUrl: "http://example.com",
            naverReservationUrl: "/relative",
            naverMapPlaceUrl: "https://map.naver.com/ok",
        });
        expect(m.instagramUrl).toBe(FALLBACK_SETTINGS.instagramUrl);
        expect(m.blogUrl).toBe(FALLBACK_SETTINGS.blogUrl);
        expect(m.naverReservationUrl).toBe(FALLBACK_SETTINGS.naverReservationUrl);
        expect(m.naverMapPlaceUrl).toBe("https://map.naver.com/ok");
    });

    it("앞뒤 공백은 지운다", () => {
        expect(mergeSettings({ phone: "  010-1111-2222  " }).phone).toBe("010-1111-2222");
    });
});

describe("mapEmbedUrl", () => {
    it("검색어를 안전하게 인코딩해 구글 지도 임베드 주소를 만든다", () => {
        const u = mapEmbedUrl("서울 광진구 & <script>");
        expect(u.startsWith("https://maps.google.com/maps?q=")).toBe(true);
        expect(u).toContain("output=embed");
        expect(u).not.toContain("<script>");
        expect(u).not.toContain(" ");
        expect(new URL(u).searchParams.get("q")).toBe("서울 광진구 & <script>");
    });
});
