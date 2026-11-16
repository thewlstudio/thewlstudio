import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkPage, { generateMetadata as workMetadata, generateStaticParams as workParams } from "./works/[slug]/page";
import CrewPage, { generateMetadata as crewMetadata, generateStaticParams as crewParams } from "./crew/[slug]/page";
import sitemap from "./sitemap";
import { generateMetadata as rootMetadata } from "./layout";

// 새 런타임 의존성을 추가하지 않고, 설치된 Sanity가 직접 의존하는 GROQ 해석기로 실제 조회식을 평가한다.
const require = createRequire(import.meta.url);
const sanityRequire = createRequire(require.resolve("sanity/package.json"));
const { parse, evaluate } = sanityRequire("groq-js") as {
    parse: (query: string) => unknown;
    evaluate: (node: unknown, options: { dataset: Record<string, unknown>[]; params: Record<string, unknown> }) => Promise<{ get: () => Promise<unknown> }>;
};
const { state, read, jar } = vi.hoisted(() => ({
    state: { draft: false, session: undefined as string | undefined }, read: vi.fn(), jar: { get: vi.fn() },
}));
vi.mock("next-sanity", async (original) => ({
    ...await original<typeof import("next-sanity")>(), createClient: () => ({ fetch: read }),
}));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: state.draft }), cookies: async () => jar }));
vi.mock("./works/[slug]/WorkDetailClient", () => ({ default: () => null }));
vi.mock("./crew/[slug]/CrewDetailClient", () => ({ default: () => null }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-variable", className: "font-class" }) }));

const clock = Date.parse("2026-11-06T00:00:00Z");
const secret = "test-only-public-visibility-secret";
const signed = (expiry: number) => `${expiry}.${createHmac("sha256", secret).update(`session:${expiry}`).digest("hex")}`;
const statuses = ["public", "hidden", "trashed", "legacy"] as const;
const modes = ["ordinary", "preview", "expired", "logged-out"] as const;
const dataset = ["work", "crew"].flatMap((_type) => statuses.map((status) => ({
    _id: `test-${_type}-${status}`, _type, slug: { current: `${status}-entry` },
    title: `fixture-${_type}-${status}`, artist: "fixture artist", name: `fixture-${_type}-${status}`, koName: "가상 이름", role: "가상 역할",
    releaseDate: "2026. 11. 06.", _updatedAt: "2026-11-06T00:00:00Z",
    ...(status === "legacy" ? {} : { isActive: status !== "hidden", trashed: status === "trashed" }),
})));
function setMode(mode: typeof modes[number]) {
    state.draft = mode !== "ordinary";
    state.session = mode === "preview" ? signed(clock + 60000) : mode === "expired" ? signed(clock) : undefined;
}
beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(clock);
    vi.stubEnv("MANAGE_SECRET", secret); vi.stubEnv("MANAGE_PASSWORD", "test-only-password");
    setMode("ordinary");
    jar.get.mockImplementation(() => state.session === undefined ? undefined : { value: state.session });
    read.mockImplementation(async (query: string, params: Record<string, unknown>) => {
        const result = await evaluate(parse(query), { dataset, params });
        return result.get();
    });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("루트 메타데이터의 관리자 미리보기 검색 방지", () => {
    it.each(modes)("%s 요청은 기존 공유 정보를 유지하며 인증된 미리보기만 noindex 처리한다", async (mode) => {
        setMode(mode);
        const meta = await rootMetadata();
        expect(meta.title).toMatchObject({ default: "WHITE LIGHT STUDIO", template: "%s | WHITE LIGHT STUDIO" });
        expect(meta.alternates).toEqual({ canonical: "/" });
        expect(meta.openGraph).toMatchObject({ type: "website", images: [{ url: "/images/og_default.jpg", width: 1200, height: 630 }] });
        expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: ["/images/og_default.jpg"] });
        expect(meta.robots).toEqual(mode === "preview" ? { index: false, follow: false, nocache: true } : undefined);
        expect(read).not.toHaveBeenCalled();
        if (mode === "ordinary") expect(jar.get).not.toHaveBeenCalled();
    });
    it("미리보기에서 추가한 검색 방지가 다음 일반 요청의 기본 메타데이터를 오염시키지 않는다", async () => {
        setMode("preview");
        expect((await rootMetadata()).robots).toMatchObject({ index: false });
        setMode("ordinary");
        expect((await rootMetadata()).robots).toBeUndefined();
    });
});

type Props = { children?: ReactNode; type?: string; dangerouslySetInnerHTML?: { __html: string } };
function elements(node: ReactNode): ReactElement<Props>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
const scenarios = modes.flatMap((mode) => statuses.map((status) => ({ mode, status })));
describe.each([
    { area: "works", page: WorkPage, metadata: workMetadata, params: workParams, type: "work" },
    { area: "crew", page: CrewPage, metadata: crewMetadata, params: crewParams, type: "crew" },
])("$area의 본문·공유 정보·구조화 데이터 노출 경계", ({ area, page, metadata, params, type }) => {
    it.each(scenarios)("$mode 요청의 $status 항목은 모든 상세 출력에서 같은 공개 규칙을 쓴다", async ({ mode, status }) => {
        setMode(mode);
        const props = { params: Promise.resolve({ slug: `${status}-entry` }) };
        const visible = status === "public" || status === "legacy" || (status === "hidden" && mode === "preview");
        if (!visible) {
            await expect(page(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
            await expect(metadata(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        } else {
            const node = await page(props);
            const meta = await metadata(props);
            const text = `fixture-${type}-${status}`;
            expect(JSON.stringify(meta)).toContain(text);
            expect(meta.alternates?.canonical).toBe(`/${area}/${status}-entry`);
            expect(meta.openGraph).toMatchObject({ url: `/${area}/${status}-entry` });
            expect(meta.robots).toBeUndefined(); // 루트의 미리보기 noindex를 상세에서 덮어쓰지 않는다.
            expect(JSON.stringify(meta.twitter)).toContain(text);
            const script = elements(node).find((child) => child.type === "script" && child.props.type === "application/ld+json");
            expect(JSON.parse(script!.props.dangerouslySetInnerHTML!.__html)).toMatchObject({ name: text });
        }
        expect(read).toHaveBeenCalledTimes(2);
        for (const [, queryParams, options] of read.mock.calls) {
            expect(queryParams).toMatchObject({ slug: `${status}-entry`, includeHidden: mode === "preview" });
            expect(options).toMatchObject({ next: { revalidate: mode === "preview" ? 0 : 3600, tags: [type] } });
        }
    });
    it.each(modes)("%s 상태와 관계없이 정적 경로와 사이트맵은 공개·기존 기본값 항목만 포함한다", async (mode) => {
        setMode(mode);
        expect((await params()).map((row) => row.slug).sort()).toEqual(["legacy-entry", "public-entry"]);
        const entries = await sitemap();
        const paths = entries.map((entry) => new URL(entry.url).pathname);
        expect(paths.filter((path) => path.startsWith(`/${area}/`))).toEqual([`/${area}/public-entry`, `/${area}/legacy-entry`]);
        expect(paths.some((path) => /hidden-entry|trashed-entry/.test(path))).toBe(false);
        for (const [, queryParams] of read.mock.calls) expect(queryParams).toEqual({ includeHidden: false });
        expect(jar.get).not.toHaveBeenCalled();
    });
    it("미리보기에서 읽은 숨김 문서를 로그아웃된 다음 호출에 재사용하지 않는다", async () => {
        const props = { params: Promise.resolve({ slug: "hidden-entry" }) };
        setMode("preview");
        await page(props); await metadata(props);
        setMode("logged-out");
        await expect(page(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
        await expect(metadata(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    });
});
