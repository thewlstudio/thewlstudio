import "server-only";
import { cache } from "react";
import { sanityFetch } from "@/sanity/lib/client";
import { worksQuery } from "@/sanity/lib/queries";
import { publicDetailPath } from "@/lib/public-routes";
import type { WorkSummary } from "@/types/sanity";

/** 페이지와 메타데이터는 같은 공개 목록을 사용한다. Sanity의 기존 캐시 정책은 유지한다. */
export const getPublicWorks = cache(async () => {
    const works = await sanityFetch<WorkSummary[]>({ query: worksQuery, tags: ["work"] });
    return works.filter((work) => publicDetailPath("works", work.slug) !== null);
});
