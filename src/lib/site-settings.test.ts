import { describe, expect, it } from "vitest";
import { FALLBACK_SETTINGS, mapEmbedUrl, mergeSettings, siteSettingsLinkUrl, siteSettingsPhone, type SiteSettingsLinkKey } from "./site-settings";

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
    it.each(["https://", "https://user:pass@example.com", "https://example.com/\npath", "https://example.com\\@other.com"])("https 접두사만 있는 비정상 주소도 기본값으로 대체한다: %s", (url) => {
        expect(mergeSettings({ blogUrl: url }).blogUrl).toBe(FALLBACK_SETTINGS.blogUrl);
    });
});

describe("공통 서비스 링크 정책", () => {
    it.each([
        ["naverMapPlaceUrl", "https://map.naver.com/p/entry/place/123?placePath=%2Fhome#info"],
        ["naverMapPlaceUrl", "https://naver.me/ShortLink"],
        ["naverReservationUrl", "https://booking.naver.com/booking/1"],
        ["naverReservationUrl", "https://naver.me/reserve"],
        ["instagramUrl", "https://www.instagram.com/wl_musicstudio/"],
        ["instagramUrl", " HTTPS://INSTAGRAM.COM/studio/ "],
        ["blogUrl", "https://blog.naver.com/studio"],
        ["blogUrl", "https://other-blog.example/posts?a=1&b=%252F#section"],
    ] as const)("%s의 정상 주소는 앞뒤 공백 외 원문을 유지한다", (key, value) => {
        expect(siteSettingsLinkUrl(key, value)).toBe(value.trim());
        expect(mergeSettings({ [key]: value })[key]).toBe(value.trim());
    });
    it.each([
        ["naverMapPlaceUrl", "https://naver.com.evil.example/path"],
        ["naverMapPlaceUrl", "https://notnaver.com/path"],
        ["naverReservationUrl", "https://other.example/naver.com"],
        ["naverReservationUrl", "https://naver.me.evil.example/path"],
        ["instagramUrl", "https://notinstagram.com/profile"],
        ["instagramUrl", "https://instagram.com.evil.example/profile"],
        ["instagramUrl", "https://instagram.com@evil.example/profile"],
        ["blogUrl", "http://blog.example"],
    ] as const)("%s의 허용하지 않는 주소는 공개 조회에서도 기존 기본값으로 돌아간다", (key, value) => {
        expect(siteSettingsLinkUrl(key, value)).toBeNull();
        expect(mergeSettings({ [key]: value })[key]).toBe(FALLBACK_SETTINGS[key]);
    });
    it.each(["naverMapPlaceUrl", "naverReservationUrl", "instagramUrl", "blogUrl"] as const)("%s는 불완전·상대·실행용·자격증명 주소를 거부한다", (key) => {
        for (const value of [null, 1, {}, "", "https://", "//example.com", "/path", "javascript:alert(1)", "data:text/html,hello", "https://user:password@example.com", "https://example.com/\npath", "https://example.com\\@other.example"]) expect(siteSettingsLinkUrl(key, value), String(value)).toBeNull();
    });
    it.each(["__proto__", "constructor", "unknown"])("정의되지 않은 정책 키 %s는 예외 대신 거부한다", (key) => {
        expect(siteSettingsLinkUrl(key as SiteSettingsLinkKey, "https://example.com")).toBeNull();
    });
    it("한 항목의 불일치가 다른 승인된 설정을 지우거나 원본을 바꾸지 않는다", () => {
        const raw = Object.freeze({ instagramUrl: "https://other.example", blogUrl: "https://blog.example/new", homeHeadline: "기존 문구" });
        expect(mergeSettings(raw)).toMatchObject({ instagramUrl: FALLBACK_SETTINGS.instagramUrl, blogUrl: raw.blogUrl, homeHeadline: raw.homeHeadline });
        expect(raw.instagramUrl).toBe("https://other.example");
    });
});

describe("공통 전화번호 서식", () => {
    it.each(["0507-1331-7285", "02-123-4567", "+82 (0)2-1234-5678", "12345", "1".repeat(30), " 0507-1331-7285 "])("%s는 국가번호나 표시 형식을 임의로 바꾸지 않는다", (value) => {
        expect(siteSettingsPhone(value)).toBe(value.trim());
        expect(mergeSettings({ phone: value }).phone).toBe(value.trim());
    });
    it.each(["-----", "+++++", "() ()", "12\n345", "12\r345", "12\t345", "javascript:alert(1)", "123.456", "1234", "1".repeat(31), "", null, 12345])("잘못된 전화 #%#는 공개 기본값을 유지한다", (value) => {
        expect(siteSettingsPhone(value)).toBeNull();
        expect(mergeSettings({ phone: value }).phone).toBe(FALLBACK_SETTINGS.phone);
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
    it.each(["서울 & output=evil #query", '<iframe src="https://evil.example">', "https://other.example/?q=address", "한글 + 주소 / 12?층=1", "주소 😀"])("검색어 %s가 지도 호스트·경로·다른 매개변수를 바꾸지 않는다", (query) => {
        const url = new URL(mapEmbedUrl(query));
        expect(url.origin).toBe("https://maps.google.com");
        expect(url.pathname).toBe("/maps");
        expect(url.searchParams.get("q")).toBe(query);
        expect([...url.searchParams.keys()]).toEqual(["q", "t", "z", "ie", "iwloc", "output"]);
        expect(url.searchParams.get("output")).toBe("embed");
        expect(url.hash).toBe("");
    });
});
