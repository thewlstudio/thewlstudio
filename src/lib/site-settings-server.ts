import "server-only";
import { sanityFetch } from "@/sanity/lib/client";
import { FALLBACK_SETTINGS, mergeSettings, type SiteSettings } from "./site-settings";
import { reportError } from "@/lib/error-reporting";

const settingsQuery = `*[_type == "siteSettings" && _id == "siteSettings"][0]{
    phone, addressKo, addressEn, mapQuery, naverMapPlaceUrl, naverReservationUrl, instagramUrl, blogUrl, homeHeadline, homeIntro
}`;

/** 조회에 실패하거나 문서가 없으면 기본값. 비어 있는 항목은 항목별로 기본값을 쓴다. */
export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const raw = await sanityFetch<Record<string, unknown> | null>({ query: settingsQuery, tags: ["siteSettings"] });
        return mergeSettings(raw);
    } catch (err) {
        reportError("siteSettings 조회 실패 — 기본값으로 대체", err);
        return FALLBACK_SETTINGS;
    }
}
