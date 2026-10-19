import { NAVER_MAP_PLACE_URL, NAVER_MAP_URL } from "@/lib/constants";

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
};

type Partial_ = Partial<Record<keyof SiteSettings, unknown>> | null | undefined;

/** 비어 있거나 http(s)가 아닌 값은 버리고 기본값을 쓴다 (화면에 잘못된 링크가 나가지 않게) */
export function mergeSettings(raw: Partial_): SiteSettings {
    const out: SiteSettings = { ...FALLBACK_SETTINGS };
    if (!raw) return out;
    const urlKeys: (keyof SiteSettings)[] = ["naverMapPlaceUrl", "naverReservationUrl", "instagramUrl", "blogUrl"];
    for (const k of Object.keys(FALLBACK_SETTINGS) as (keyof SiteSettings)[]) {
        const v = raw[k];
        if (typeof v !== "string" || !v.trim()) continue;
        if (urlKeys.includes(k) && !/^https:\/\//i.test(v.trim())) continue;
        out[k] = v.trim();
    }
    return out;
}

/** Contact 페이지의 지도 임베드 주소 — 검색어만 받아 서버가 직접 만든다 (iframe 코드는 받지 않음) */
export function mapEmbedUrl(mapQuery: string): string {
    return `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}
