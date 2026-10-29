// @vitest-environment jsdom
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";
import WorkPage from "./works/[slug]/page";
import CrewPage from "./crew/[slug]/page";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import type { WorkDetail } from "@/types/sanity";

const { getSettings, fetchDetail } = vi.hoisted(() => ({ getSettings: vi.fn(), fetchDetail: vi.fn() }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-variable", className: "font-class" }) }));
vi.mock("@/lib/site-settings-server", () => ({ getSiteSettings: getSettings }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: fetchDetail, client: { fetch: vi.fn() } }));
vi.mock("./works/[slug]/WorkDetailClient", () => ({ default: () => null }));
vi.mock("./crew/[slug]/CrewDetailClient", () => ({ default: () => null }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

type Props = { children?: ReactNode; type?: string; dangerouslySetInnerHTML?: { __html: string }; initialWork?: WorkDetail };
function elements(node: ReactNode): ReactElement<Props>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
function scriptMarkup(node: ReactNode) {
    const scripts = elements(node).filter((child) => child.type === "script" && child.props.type === "application/ld+json");
    expect(scripts).toHaveLength(1);
    return scripts[0].props.dangerouslySetInnerHTML!.__html;
}
const jsonLd = (node: ReactNode) => JSON.parse(scriptMarkup(node));

beforeEach(() => {
    vi.resetAllMocks();
    getSettings.mockResolvedValue(FALLBACK_SETTINGS);
    fetchDetail.mockResolvedValue({ title: "작품", artist: "아티스트", slug: "one", releaseDate: "2026. 10. 27.", imageUrl: null, lqip: null, contentBlocks: [], name: "크루", koName: "이름", role: "프로듀서" });
});
afterEach(() => vi.unstubAllEnvs());

describe("실제 서버 컴포넌트의 구조화 데이터", () => {
    it("스튜디오 주소·전화는 공개 화면과 같은 설정을 사용하며 임의로 지역을 분할하지 않는다", async () => {
        const settings = Object.freeze({ ...FALLBACK_SETTINGS, addressKo: "검증용 변경 주소 12 지하1층", phone: "02-0000-0000" });
        getSettings.mockResolvedValue(settings);
        const data = jsonLd(await RootLayout({ children: null }));
        expect(data).toMatchObject({ "@context": "https://schema.org", "@type": "Organization", name: "WHITE LIGHT STUDIO", address: { "@type": "PostalAddress", streetAddress: settings.addressKo }, telephone: settings.phone });
        expect(data.address).not.toHaveProperty("addressRegion");
        expect(data.address).not.toHaveProperty("addressLocality");
        expect(getSettings).toHaveBeenCalledTimes(1);
        expect(settings.addressKo).toBe("검증용 변경 주소 12 지하1층");
    });
    it("설정 기본값도 같은 구조로 전달한다", async () => {
        const data = jsonLd(await RootLayout({ children: null }));
        expect(data.address).toEqual({ "@type": "PostalAddress", streetAddress: FALLBACK_SETTINGS.addressKo });
        expect(data.telephone).toBe(FALLBACK_SETTINGS.phone);
        expect(data.description).toBe("서울 광진구 중곡동의 음악 스튜디오. 보컬·악기 연습실, 음악 레슨, 녹음 및 음악 제작 서비스를 제공합니다.");
    });
    it("설정에 태그 문자열이 있어도 script를 닫지 않고 원문으로 복원된다", async () => {
        const text = '</script><script>alert("test")</script>';
        getSettings.mockResolvedValue({ ...FALLBACK_SETTINGS, addressKo: text, phone: text });
        const markup = scriptMarkup(await RootLayout({ children: null }));
        const host = document.createElement("div");
        host.innerHTML = `<script type="application/ld+json">${markup}</script>`;
        expect(host.children).toHaveLength(1);
        expect(markup).not.toContain("<");
        expect(JSON.parse(host.firstElementChild!.textContent!)).toMatchObject({ address: { "@type": "PostalAddress", streetAddress: text }, telephone: text });
    });
    it.each(["https://studio.example", "https://studio.example/", "https://studio.example///", "https://studio.example/site///"])("%s의 끝 슬래시가 로고·상세 주소에 중복되지 않는다", async (base) => {
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", base);
        const expected = base.replace(/\/+$/, "");
        const organization = jsonLd(await RootLayout({ children: null }));
        expect(organization.url).toBe(expected);
        expect(organization.logo).toBe(`${expected}/images/studio_logo.jpg`);
        for (const [area, page] of [["works", WorkPage], ["crew", CrewPage]] as const) {
            const data = jsonLd(await page({ params: Promise.resolve({ slug: "With_you_n%40di" }) }));
            expect(data.url).toBe(`${expected}/${area}/With_you_n%40di`);
            if (area === "crew") expect(data.worksFor.url).toBe(expected);
        }
    });
    it.each(["2026. 10. 27.", "2026-10-27"])("작품의 %s는 구조화 데이터에서만 ISO 날짜로 변환한다", async (releaseDate) => {
        const work = Object.freeze({ title: "작품", artist: "아티스트", slug: "one", releaseDate, imageUrl: null, lqip: null, contentBlocks: [] });
        fetchDetail.mockResolvedValue(work);
        const node = await WorkPage({ params: Promise.resolve({ slug: "one" }) });
        const data = jsonLd(node);
        expect(data).toMatchObject({ name: "작품", byArtist: { "@type": "Person", name: "아티스트" }, datePublished: "2026-10-27" });
        expect(data).not.toHaveProperty("recordedAt");
        expect(data).not.toHaveProperty("locationCreated");
        expect(elements(node).find((child) => child.props.initialWork)?.props.initialWork).toBe(work);
        expect(work.releaseDate).toBe(releaseDate);
    });
    it.each([undefined, "2026. 02. 30.", "bad"])("잘못된 발매일 %s는 임의 보정하거나 생성일로 대체하지 않는다", async (releaseDate) => {
        fetchDetail.mockResolvedValue({ title: "작품", artist: "아티스트", releaseDate, imageUrl: null });
        const data = jsonLd(await WorkPage({ params: Promise.resolve({ slug: "one" }) }));
        expect(data).not.toHaveProperty("datePublished");
        expect(data.name).toBe("작품");
    });
});
