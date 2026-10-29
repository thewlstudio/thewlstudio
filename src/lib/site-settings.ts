import { NAVER_MAP_PLACE_URL, NAVER_MAP_URL } from "@/lib/constants";
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

/** 5/7단계 이전 시점의 하드코딩 값과 같다 */
export const FALLBACK_SETTINGS: SiteSettings = {
    phone: "0507-1331-7285",
    addressKo: "서울특별시 광진구 능동로 413-1 지하1층",
    addressEn: "B1, 413-1, Neungdong-ro, Gwangjin-gu, Seoul, Republic of Korea",
    mapQuery: "서울특별시 광진구 능동로 413-1",
    naverMapPlaceUrl: NAVER_MAP_PLACE_URL,
    naverReservationUrl: NAVER_MAP_URL,
    instagramUrl: "https://www.instagram.com/wl_musicstudio/",
    blogUrl: "https://blog.naver.com/bkh__official",
    homeHeadline: "당신의 이야기가\n음악이 되는 곳",
    homeIntro:
        "W.L Studio는 단순히 소리를 녹음하는 것을 넘어,\n아티스트가 전하고자 하는 진심과 감정을\n가장 순수한 형태로 담아내는 공간입니다.\n\n최상의 장비와 쾌적한 환경,\n그리고 프로페셔널한 크루들이\n당신만의 특별한 작품을 완성할 수 있도록 함께합니다.",
};

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
