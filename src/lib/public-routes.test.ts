import { describe, expect, it } from "vitest";
import { getRouteMatcher } from "next/dist/shared/lib/router/utils/route-matcher";
import { getRouteRegex } from "next/dist/shared/lib/router/utils/route-regex";
import { getDynamicParam } from "next/dist/shared/lib/router/utils/get-dynamic-param";
import { decodePublicPageSlug, publicDetailPath, publicStaticParams } from "./public-routes";
import { worksPage, worksPageHref, worksQueryString } from "./works-pagination";
import { readFileSync } from "node:fs";
import { PUBLIC_CREW_FILTER, PUBLIC_WORK_FILTER, PUBLIC_INSTRUCTOR_FILTER, PUBLIC_STUDIO_SPACE_FILTER, PUBLIC_VISIBILITY, PUBLIC_VISIBILITY_PARAMS, instructorsQuery, crewsQuery, crewBySlugQuery, worksQuery, workBySlugQuery, crewSitemapQuery, workSitemapQuery } from "@/sanity/lib/queries";

describe("공개 상세 주소의 단일 인코딩", () => {
    it.each(["normal-slug", "folkfolio_2", "With_you_n@di", "한글-제목", "100%-live", "literal%2Fname", "a?b#c", "plus+space value"])("%s는 목록·canonical·사이트맵에서 같은 주소를 만든다", (slug) => {
        const path = publicDetailPath("works", slug)!;
        const match = getRouteMatcher(getRouteRegex("/works/[slug]"));
        expect(match(path)).toEqual({ slug });
        // matcher 결과가 Page에 그대로 전달되는 것은 아니다. 설치된 Next의
        // 실제 동적 세그먼트 변환까지 거쳐 인코딩 규약을 회귀 검사한다.
        const matched = match(path);
        if (!matched) throw new Error("route must match");
        const pageParam = getDynamicParam(matched, "slug", "d", null, null).value;
        expect(pageParam).toBe(encodeURIComponent(slug));
        expect(decodePublicPageSlug(pageParam)).toBe(slug);
        expect(path).toBe("/works/" + encodeURIComponent(slug));
    });
    it.each(["", " ", " trailing ", ".", "..", "a/b", "a\\b", "a\nb", null, undefined, 1, "\ud800"])("잘못된 slug는 주소를 만들지 않는다: %s", (slug) => {
        expect(publicDetailPath("crew", slug)).toBeNull();
    });
    it("정적 경로는 비정상 값과 중복을 제거한다", () => {
        expect(publicStaticParams([{ slug: "one" }, { slug: "one" }, { slug: "../bad" }, { slug: "" }, { slug: undefined }, { slug: "100%" }])).toEqual([{ slug: "one" }, { slug: "100%" }]);
    });
});

describe("Page params의 단일 해석과 경로 검증", () => {
    it.each(["", "%", "%ZZ", "%E0%A4%A", "%C0%AF", "%2F", "a%2Fb", "a%5Cb", "%00", "%0A", "%7F", "%2e", "%2e%2e", "%20name", "name%20", "\ud800", null, undefined, ["one"], 1])("잘못된 Page 값은 거부한다: %s", (value) => {
        expect(decodePublicPageSlug(value)).toBeNull();
    });
    it.each(["literal%2Fname", "literal%5Cname", "literal%00name", "literal%252Fname", "100%", "With_you_n%40di"])("리터럴 퍼센트 %s를 재귀적으로 해석하지 않는다", (slug) => {
        expect(decodePublicPageSlug(encodeURIComponent(slug))).toBe(slug);
        expect(publicDetailPath("works", decodePublicPageSlug(encodeURIComponent(slug)))).toBe('/works/' + encodeURIComponent(slug));
    });
});

describe("공개 목록·상세·사이트맵의 노출 조건", () => {
    it.each([crewsQuery, crewBySlugQuery, crewSitemapQuery])("Crew 쿼리는 같은 공개 조건을 사용한다", (query) => {
        expect(query).toContain(PUBLIC_CREW_FILTER);
        expect(query).toContain("!(isActive == false) || $includeHidden == true");
        expect(query).toContain("!(trashed == true)");
        expect(query).toContain("defined(slug.current)");
    });
    it.each([worksQuery, workBySlugQuery, workSitemapQuery])("Works 쿼리는 같은 공개 조건을 사용한다", (query) => {
        expect(query).toContain(PUBLIC_WORK_FILTER);
        expect(query).toContain("!(trashed == true)");
        expect(query).toContain("defined(slug.current)");
    });
});

describe("공개 여부(비공개 항목) 규칙", () => {
    it.each([PUBLIC_WORK_FILTER, PUBLIC_CREW_FILTER, PUBLIC_INSTRUCTOR_FILTER, PUBLIC_STUDIO_SPACE_FILTER])("4개 영역이 같은 공개 조건을 쓴다 #%#", (filter) => {
        expect(filter).toContain(PUBLIC_VISIBILITY);
    });
    it("공개 조건은 공개 여부가 없으면 공개로 보고, 휴지통은 미리보기에서도 제외한다", () => {
        expect(PUBLIC_VISIBILITY).toBe("(!(isActive == false) || $includeHidden == true) && !(trashed == true)");
        expect(PUBLIC_VISIBILITY_PARAMS).toEqual({ includeHidden: false });
    });
    it("강사 쿼리와 Studio 페이지 쿼리도 같은 조건을 쓴다", () => {
        expect(instructorsQuery).toContain(PUBLIC_INSTRUCTOR_FILTER);
        const studio = readFileSync("src/app/studio/page.tsx", "utf8");
        expect(studio).toContain("PUBLIC_STUDIO_SPACE_FILTER");
        expect(studio).not.toMatch(/isActive\s*!=\s*false/);
    });
    it("$includeHidden를 쓰는 조회는 params 없이 client.fetch로 부르지 않는다", () => {
        for (const file of ["src/app/crew/[slug]/page.tsx", "src/app/works/[slug]/page.tsx", "src/app/sitemap.ts"]) {
            for (const call of readFileSync(file, "utf8").match(/client\.fetch<[^>]*>\([^)]*\)/g) ?? []) expect(call, file).toContain("PUBLIC_VISIBILITY_PARAMS");
        }
    });
});

describe("Works 페이지 번호와 링크", () => {
    it.each([undefined, "", "0", "-1", "1.5", "4.5", "1e2", "0x10", "Infinity", "NaN", " 2 ", "9007199254740992", {}, 2])("유효한 양의 정수가 아니면 첫 페이지: %s", (value) => {
        expect(worksPage(value, 120).page).toBe(1);
    });
    it("큰 정수는 마지막 페이지로 보정하고 중복 파라미터는 첫 값을 사용한다", () => {
        expect(worksPage("999", 25)).toEqual({ page: 3, totalPages: 3 });
        expect(worksPage(["2", "3"], 25).page).toBe(2);
        expect(worksPage("2", 0)).toEqual({ page: 1, totalPages: 1 });
        expect(worksPage("0002", 25).page).toBe(2);
    });
    it("다른 쿼리는 보존하고 중복 page는 하나로 정리한다", () => {
        const query = worksQueryString({ page: ["2", "3"], campaign: ["가", "나"], q: "a&b", absent: undefined });
        const href = worksPageHref(query, 4);
        const params = new URL(href, "https://example.com").searchParams;
        expect(params.getAll("page")).toEqual(["4"]);
        expect(params.getAll("campaign")).toEqual(["가", "나"]);
        expect(params.get("q")).toBe("a&b");
        expect(worksPageHref("page=2", 1)).toBe("/works");
        expect(worksPageHref("page=2&q=test", 1)).toBe("/works?q=test");
    });
});
