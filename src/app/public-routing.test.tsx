import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import WorkPage, { generateMetadata as workMetadata, generateStaticParams as workParams } from "./works/[slug]/page";
import CrewPage, { generateMetadata as crewMetadata, generateStaticParams as crewParams } from "./crew/[slug]/page";
import sitemap from "./sitemap";
import { crewBySlugQuery, crewSitemapQuery, workBySlugQuery, workSitemapQuery } from "@/sanity/lib/queries";
import { dataset, projectId } from "@/sanity/env";

const { fetchDetail, fetchList } = vi.hoisted(() => ({ fetchDetail: vi.fn(), fetchList: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: fetchDetail, client: { fetch: fetchList } }));
vi.mock("./works/[slug]/WorkDetailClient", () => ({ default: () => null }));
vi.mock("./crew/[slug]/CrewDetailClient", () => ({ default: () => null }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchDetail.mockResolvedValue({ title: "작품", artist: "아티스트", name: "크루", role: "프로듀서", koName: "이름", imageUrl: null });
    fetchList.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe.each([
    { area: "works" as const, page: WorkPage, metadata: workMetadata, params: workParams, query: workBySlugQuery },
    { area: "crew" as const, page: CrewPage, metadata: crewMetadata, params: crewParams, query: crewBySlugQuery },
])("$area 상세 주소 처리", ({ area, page, metadata, params, query }) => {
    it("상세 공유 정보는 정규 주소와 일치하며 공통 OG 필드를 잃지 않는다", async () => {
        const meta = await metadata({ params: Promise.resolve({ slug: "one" }) });
        const title = area === "works" ? "아티스트 - 작품 | WHITE LIGHT STUDIO" : "크루 (프로듀서) | WHITE LIGHT STUDIO";
        expect(meta.title).toEqual({ absolute: title });
        expect(meta.openGraph).toMatchObject({ title, url: `/${area}/one`, siteName: "WHITE LIGHT STUDIO", locale: "ko_KR", type: "website" });
        expect(meta.twitter).toMatchObject({ title, card: "summary", images: ["/images/studio_logo.jpg"] });
    });
    it("공유 메타데이터와 JSON-LD는 원본 대신 크기를 제한한 이미지를 사용한다", async () => {
        const source = `https://cdn.sanity.io/images/${projectId}/${dataset}/abcdef-3000x4000.png`;
        fetchDetail.mockResolvedValue({ title: "작품", artist: "아티스트", name: "크루", role: "프로듀서", koName: "이름", imageUrl: source });
        const props = { params: Promise.resolve({ slug: "one" }) };
        const meta = await metadata(props);
        const shareImage = (meta.openGraph?.images as string[])[0];
        expect(new URL(shareImage).searchParams.get("w")).toBe("1200");
        expect(new URL(shareImage).pathname).toBe(new URL(source).pathname);
        expect((meta.twitter?.images as string[])[0]).toBe(shareImage);
        const result = await page(props) as ReactElement<{ children: ReactNode[] }>;
        const script = result.props.children[0] as ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>;
        expect(JSON.parse(script.props.dangerouslySetInnerHTML.__html).image).toBe(shareImage);
    });
    it.each(["With_you_n@di", "100%-live", "literal%2Fname", "literal%40name", "한글-제목", "a?b#c", "plus+space value"])("Page 인코딩 값과 메타데이터 원문 %s는 같은 문서를 조회한다", async (slug) => {
        const meta = await metadata({ params: Promise.resolve({ slug }) });
        expect(meta.alternates?.canonical).toBe(`/${area}/${encodeURIComponent(slug)}`);
        expect(meta.openGraph).toMatchObject({ url: `/${area}/${encodeURIComponent(slug)}` });
        const result = await page({ params: Promise.resolve({ slug: encodeURIComponent(slug) }) }) as ReactElement<{ children: ReactNode[] }>;
        const script = result.props.children[0] as ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>;
        expect(JSON.parse(script.props.dangerouslySetInnerHTML.__html).url).toContain(`/${area}/${encodeURIComponent(slug)}`);
        expect(fetchDetail).toHaveBeenCalledTimes(2);
        for (const [options] of fetchDetail.mock.calls) expect(options).toMatchObject({ query, params: { slug }, tags: [area === "works" ? "work" : "crew"] });
    });
    it.each(["a/b", "a\\b", "..", "", "bad\nslug", "\ud800"])("잘못된 slug %s는 저장소 조회 전 404로 처리한다", async (slug) => {
        const pageSlug = slug === "\ud800" ? slug : encodeURIComponent(slug);
        await expect(page({ params: Promise.resolve({ slug: pageSlug }) })).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        await expect(metadata({ params: Promise.resolve({ slug }) })).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        expect(fetchDetail).not.toHaveBeenCalled();
    });
    it.each(["%", "%GG", "%E0%A4%A", "%2f", "%5c", "%00", "%0a", "%2E%2E"])("잘못되거나 위험한 Page params %s는 저장소 조회 전에 거부한다", async (slug) => {
        await expect(page({ params: Promise.resolve({ slug }) })).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        expect(fetchDetail).not.toHaveBeenCalled();
    });
    it("존재하지 않거나 공개 대상이 아닌 문서는 본문과 메타데이터 모두 404로 처리한다", async () => {
        fetchDetail.mockResolvedValue(null);
        const props = { params: Promise.resolve({ slug: "missing" }) };
        await expect(page(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        await expect(metadata(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    });
    it("조회 실패를 문서 없음으로 숨기지 않는다", async () => {
        fetchDetail.mockRejectedValue(new Error("Sanity unavailable"));
        await expect(page({ params: Promise.resolve({ slug: "existing" }) })).rejects.toThrow("Sanity unavailable");
    });
    it("정적 경로 생성도 잘못된 주소와 중복을 제외한다", async () => {
        fetchList.mockResolvedValue([{ slug: "one" }, { slug: "one" }, { slug: undefined }, { slug: "a/b" }, { slug: "한글" }]);
        expect(await params()).toEqual([{ slug: "one" }, { slug: "한글" }]);
    });
});

describe("사이트맵 생성 실패 격리와 데이터 정리", () => {
    it.each(["works", "crew"])("%s 조회가 실패해도 다른 영역과 고정 경로는 유지한다", async (failed) => {
        fetchList.mockImplementation(async (query: string) => {
            const area = query === workSitemapQuery ? "works" : "crew";
            if (area === failed) throw new Error("fetch failed");
            return [{ slug: "kept", _updatedAt: "2026-10-26T00:00:00Z" }];
        });
        const result = await sitemap();
        expect(result).toHaveLength(7);
        const paths = result.map((row) => new URL(row.url).pathname);
        expect(paths).toContain(failed === "works" ? "/crew/kept" : "/works/kept");
        expect(paths).toContain("/contact");
        expect(fetchList).toHaveBeenCalledWith(workSitemapQuery);
        expect(fetchList).toHaveBeenCalledWith(crewSitemapQuery);
    });
    it("잘못된 slug·중복은 제외하고 퍼센트·한글은 경로 인코딩한다", async () => {
        fetchList.mockImplementation(async (query: string) => query === workSitemapQuery ? [
            { slug: "100%", _updatedAt: "bad date" }, { slug: "100%", _updatedAt: "2026-10-26" },
            { slug: "한글", _updatedAt: null }, { slug: "a/b" }, { slug: null }, { slug: "" },
        ] : []);
        const result = await sitemap();
        const works = result.filter((row) => row.url.includes("/works/"));
        expect(works).toHaveLength(2);
        expect(works.map((row) => new URL(row.url).pathname)).toEqual(["/works/100%25", "/works/%ED%95%9C%EA%B8%80"]);
        expect(works.every((row) => row.lastModified === undefined)).toBe(true);
    });
    it("유효한 수정 일시는 그대로 유지한다", async () => {
        fetchList.mockResolvedValue([{ slug: "one", _updatedAt: "2026-10-26T10:20:30Z" }]);
        const result = await sitemap();
        expect((result.find((row) => row.url.endsWith("/works/one"))!.lastModified as Date).toISOString()).toBe("2026-10-26T10:20:30.000Z");
    });
});
