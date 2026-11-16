import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { crewSitemapQuery, workSitemapQuery, PUBLIC_VISIBILITY_PARAMS } from "@/sanity/lib/queries";
import { publicDetailPath } from "@/lib/public-routes";
import { getSiteUrl } from "@/config/site";
import { reportError } from "@/lib/error-reporting";
import { jsonLdDate } from "@/lib/json-ld";

export const revalidate = 86400; // Revalidate sitemap daily (24h)

const BASE_URL = getSiteUrl();

/** CMS의 명시적인 날짜/시간만 받으며 Date의 달력 자동 보정이나 지역 시각 추측을 막는다. */
function lastModifiedDate(value: unknown): Date | undefined {
    if (typeof value !== "string") return undefined;
    const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
    if (!match || match[0] !== value || !jsonLdDate(match[1])) return undefined;
    if (match[2] !== undefined && (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59)) return undefined;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 한 영역의 조회 실패가 다른 영역의 정상 URL까지 없애지 않도록 따로 정착시킨다.
    const results = await Promise.allSettled([
        client.fetch<unknown>(workSitemapQuery, PUBLIC_VISIBILITY_PARAMS),
        client.fetch<unknown>(crewSitemapQuery, PUBLIC_VISIBILITY_PARAMS),
    ]);
    const dynamicUrls: MetadataRoute.Sitemap = [];
    results.forEach((result, index) => {
        const area = index === 0 ? "works" : "crew";
        if (result.status === "rejected") {
            reportError(`sitemap ${area} fetch failed`, result.reason);
            return;
        }
        if (!Array.isArray(result.value)) {
            reportError(`sitemap ${area} invalid response`, new Error("Expected sitemap array"));
            return;
        }
        const seen = new Set<string>();
        let invalidRows = 0;
        let invalidDates = 0;
        for (let rowIndex = 0; rowIndex < result.value.length; rowIndex++) {
            const row: unknown = result.value[rowIndex];
            if (!Object.hasOwn(result.value, rowIndex) || !row || typeof row !== "object" || Array.isArray(row) || !Object.hasOwn(row, "slug")) {
                invalidRows++;
                continue;
            }
            const record = row as Record<string, unknown>;
            const path = publicDetailPath(area, record.slug);
            if (!path) { invalidRows++; continue; }
            if (seen.has(path)) continue;
            seen.add(path);
            const rawDate = Object.hasOwn(record, "_updatedAt") ? record._updatedAt : undefined;
            const date = lastModifiedDate(rawDate);
            if (rawDate != null && !date) invalidDates++;
            dynamicUrls.push({
                url: `${BASE_URL}${path}`,
                ...(date ? { lastModified: date } : {}),
                changeFrequency: area === "works" ? "weekly" : "monthly",
                priority: area === "works" ? 0.8 : 0.7,
            });
        }
        if (invalidRows || invalidDates) {
            // 원본 응답·문서 내용 없이 잘못된 항목 수만 보고한다.
            reportError(`sitemap ${area} invalid entries`, new Error(`Invalid sitemap rows: ${invalidRows}; dates: ${invalidDates}`));
        }
    });

    const staticUrls: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${BASE_URL}/works`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/crew`,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/class`,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/studio`,
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/contact`,
            changeFrequency: "yearly",
            priority: 0.7,
        },
    ];

    return [...staticUrls, ...dynamicUrls];
}
