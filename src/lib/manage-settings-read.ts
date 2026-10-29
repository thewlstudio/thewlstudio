import "server-only";
import { FALLBACK_SETTINGS, SITE_SETTINGS_LINK_HOSTS, siteSettingsLinkUrl, siteSettingsPhone, type SiteSettings, type SiteSettingsLinkKey } from "./site-settings";

export type SettingsReadState = { kind: "new" | "ready" | "defaults" | "blocked"; fields: string[] };
type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) => value === undefined || value === null;
const CONTACT_LABELS: Record<keyof SiteSettings, string> = {
    phone: "전화번호", addressKo: "한글 주소", addressEn: "영문 주소", mapQuery: "지도 검색어",
    naverMapPlaceUrl: "네이버 지도", naverReservationUrl: "네이버 예약", instagramUrl: "인스타그램", blogUrl: "블로그",
    homeHeadline: "홈페이지 소개 제목", homeIntro: "홈페이지 소개 본문",
};
const INFO_LABELS = {
    membershipNote: "멤버십 안내", guidelinesIntro: "이용 안내 소개", parkingWarning: "주차 강조 문구",
    parkingDetail: "주차 안내", parkingFeeLabel: "주차 요금 라벨", parkingFee: "주차 요금",
    cctvTitle: "CCTV 제목", cctvDetail: "CCTV 설명", dutyText: "이용 수칙", dutyWarning: "강조 수칙",
};

/** 관리 화면 전용 판별. 공개 페이지의 fallback 정책을 바꾸거나 원본 값을 반환하지 않는다. */
export function settingsReadState(type: "siteSettings" | "studioInfo", raw: unknown): SettingsReadState {
    if (raw === null) return { kind: "new", fields: [] };
    if (!object(raw) || !Object.hasOwn(raw, "_id") || !Object.hasOwn(raw, "_type") || !Object.hasOwn(raw, "_rev") || raw._id !== type || raw._type !== type || typeof raw._rev !== "string" || !raw._rev.trim()) {
        return { kind: "blocked", fields: ["설정 문서 정보"] };
    }
    const defaults = new Set<string>(); const invalid = new Set<string>();
    const scalar = (value: unknown, label: string) => {
        if (missing(value)) defaults.add(label); else if (typeof value !== "string") invalid.add(label);
    };
    const strings = (value: unknown, label: string) => {
        if (missing(value)) defaults.add(label);
        else if (!Array.isArray(value) || Array.from(value).some((item) => typeof item !== "string")) invalid.add(label);
    };
    if (type === "siteSettings") {
        for (const field of Object.keys(FALLBACK_SETTINGS) as (keyof SiteSettings)[]) {
            const value = raw[field]; const label = CONTACT_LABELS[field];
            scalar(value, label);
            if (typeof value !== "string") continue;
            if (!value.trim()) { defaults.add(label); continue; }
            if (field === "phone" && !siteSettingsPhone(value)) invalid.add(label);
            if (Object.hasOwn(SITE_SETTINGS_LINK_HOSTS, field) && !siteSettingsLinkUrl(field as SiteSettingsLinkKey, value)) invalid.add(label);
        }
    } else {
        for (const [field, label] of Object.entries(INFO_LABELS)) scalar(raw[field], label);
        strings(raw.amenities, "편의시설");
        for (const [field, label, texts, nested] of [
            ["services", "서비스", ["title", "price", "priceUnit"], "points"],
            ["equipment", "장비", ["title"], "items"],
            ["memberships", "멤버십", ["num", "label", "sub", "price"], null],
        ] as const) {
            const rows = raw[field];
            if (missing(rows)) { defaults.add(label); continue; }
            if (!Array.isArray(rows)) { invalid.add(label); continue; }
            for (const row of rows) {
                if (!object(row)) { invalid.add(label); continue; }
                for (const text of texts) scalar(row[text], label);
                if (nested) strings(row[nested], label);
                // 원본 키가 없는 예전 행의 첫 발급은 별도 기존 정책이며 표시값의 대체가 아니다.
                if (!missing(row._key) && typeof row._key !== "string") invalid.add(label);
            }
        }
    }
    if (invalid.size) return { kind: "blocked", fields: [...invalid] };
    return { kind: defaults.size ? "defaults" : "ready", fields: [...defaults] };
}
