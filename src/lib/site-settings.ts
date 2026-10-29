import { DEFAULT_SETTINGS } from "@/config/default-content";
import { externalHttpUrl } from "./content-urls";

/** 사이트 공통 연락처·링크. 값은 Sanity(siteSettings)에서 오고, 없거나 조회에 실패하면 FALLBACK을 쓴다. */
export type SiteSettings = {
    phone: string;
    addressKo: string;
    addressEn: string;
    mapQuery: string;
    naverMapPlaceUrl: string;
    naverReservationUrl: string;
    instagramUrl: string;
    blogUrl: string;
    /** 홈페이지 소개 제목 (줄바꿈은 화면 줄바꿈) */
    homeHeadline: string;
    /** 홈페이지 소개 본문: 빈 줄로 문단을 나누고, 문단 안의 줄바꿈은 데스크톱 줄바꿈 */
    homeIntro: string;
};

/** 조회 실패·문서 없음일 때 쓰는 기본값. 값은 고객 고유 내용이라 src/config/default-content.ts에 있다. */
export const FALLBACK_SETTINGS: SiteSettings = DEFAULT_SETTINGS;

type Partial_ = Partial<Record<keyof SiteSettings, unknown>> | null | undefined;

export const SITE_SETTINGS_LINK_HOSTS = {
    naverMapPlaceUrl: ["naver.com", "naver.me"],
    naverReservationUrl: ["naver.com", "naver.me"],
    instagramUrl: ["instagram.com"],
    blogUrl: [],
} as const;
export type SiteSettingsLinkKey = keyof typeof SITE_SETTINGS_LINK_HOSTS;

/** 저장과 공개 조회가 동일한 HTTPS·서비스 호스트 규칙을 사용한다. 블로그는 임의 HTTPS를 허용한다. */
export function siteSettingsLinkUrl(key: SiteSettingsLinkKey, value: unknown): string | null {
    if (!Object.hasOwn(SITE_SETTINGS_LINK_HOSTS, key)) return null;
    const raw = externalHttpUrl(value);
    if (!raw) return null;
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const hosts: readonly string[] = SITE_SETTINGS_LINK_HOSTS[key];
    return hosts.length === 0 || hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? raw : null;
}

/** 번호의 실제 사용 여부는 확인하지 않고 숫자 포함·기본 서식·줄바꿈 여부만 검사한다. */
export function siteSettingsPhone(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    return /^[0-9+() -]{5,30}$/.test(raw) && /[0-9]/.test(raw) ? raw : null;
}

/** 빈 값·잘못된 전화·저장 기준과 다른 서비스 URL은 항목별로 기존 기본값을 사용한다. */
export function mergeSettings(raw: Partial_): SiteSettings {
    const out: SiteSettings = { ...FALLBACK_SETTINGS };
    if (!raw) return out;
    const urlKeys = Object.keys(SITE_SETTINGS_LINK_HOSTS) as SiteSettingsLinkKey[];
    for (const k of Object.keys(FALLBACK_SETTINGS) as (keyof SiteSettings)[]) {
        const v = raw[k];
        if (typeof v !== "string" || !v.trim()) continue;
        if (k === "phone" && !siteSettingsPhone(v)) continue;
        const urlKey = urlKeys.find((key) => key === k);
        if (urlKey && !siteSettingsLinkUrl(urlKey, v)) continue;
        out[k] = v.trim();
    }
    return out;
}

/** Contact 페이지의 지도 임베드 주소 — 검색어만 받아 서버가 직접 만든다 (iframe 코드는 받지 않음) */
export function mapEmbedUrl(mapQuery: string): string {
    return `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}
