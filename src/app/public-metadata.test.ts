import { describe, expect, it, vi } from "vitest";
import { metadata as worksMetadata } from "./works/layout";
import { metadata as crewMetadata } from "./crew/layout";
import { metadata as studioMetadata } from "./studio/layout";
import { metadata as classMetadata } from "./class/layout";
import { metadata as contactMetadata } from "./contact/page";
import { PUBLIC_SECTIONS, PUBLIC_SHARE_IMAGE, PUBLIC_SITE_NAME, publicPageMetadata } from "@/lib/public-metadata";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/lib/site-settings-server", () => ({ getSiteSettings: vi.fn() }));

describe("공개 페이지별 검색·공유 메타데이터", () => {
    it.each([
        { area: "works" as const, metadata: worksMetadata },
        { area: "crew" as const, metadata: crewMetadata },
        { area: "studio" as const, metadata: studioMetadata },
        { area: "class" as const, metadata: classMetadata },
        { area: "contact" as const, metadata: contactMetadata },
    ])("$area는 루트의 홈 정보 대신 자기 제목·설명·주소와 공통 정보를 선언한다", ({ area, metadata }) => {
        const { title, description, path } = PUBLIC_SECTIONS[area];
        const fullTitle = `${title} | ${PUBLIC_SITE_NAME}`;
        expect(metadata).toMatchObject({
            title: { absolute: fullTitle }, description, alternates: { canonical: path },
            openGraph: { title: fullTitle, description, url: path, siteName: PUBLIC_SITE_NAME, locale: "ko_KR", type: "website", images: [PUBLIC_SHARE_IMAGE] },
            twitter: { title: fullTitle, description, card: "summary", images: [PUBLIC_SHARE_IMAGE.url] },
        });
    });
    it("상세 공유는 기존 콘텐츠 이미지·소개와 제목을 유지하며 OG 공통 정보도 포함한다", () => {
        const metadata = publicPageMetadata({ title: "아티스트 - 작품", description: "기존 소개", path: "/works/one", shareImage: "https://cdn.sanity.io/cover.jpg?w=1200" });
        expect(metadata).toMatchObject({
            title: { absolute: "아티스트 - 작품 | WHITE LIGHT STUDIO" }, description: "기존 소개",
            openGraph: { title: "아티스트 - 작품 | WHITE LIGHT STUDIO", description: "기존 소개", url: "/works/one", siteName: PUBLIC_SITE_NAME, locale: "ko_KR", type: "website", images: ["https://cdn.sanity.io/cover.jpg?w=1200"] },
            twitter: { title: "아티스트 - 작품 | WHITE LIGHT STUDIO", card: "summary_large_image", images: ["https://cdn.sanity.io/cover.jpg?w=1200"] },
        });
    });
    it.each([undefined, null, ""])("콘텐츠 이미지가 %s이면 실측 크기의 기존 로고와 정사각형 카드를 쓴다", (shareImage) => {
        const metadata = publicPageMetadata({ title: "작품", description: "소개", path: "/works/one", shareImage });
        expect(metadata.openGraph?.images).toEqual([{ url: "/images/studio_logo.jpg", width: 839, height: 839, alt: PUBLIC_SITE_NAME }]);
        expect(metadata.twitter).toMatchObject({ card: "summary", images: [PUBLIC_SHARE_IMAGE.url] });
    });
    it.each(["/works?page=3", "/works/With_you_n%40di", "/crew/literal%252Fname"])("%s의 정규 주소와 공유 주소를 일치시키며 다시 인코딩하지 않는다", (path) => {
        const metadata = publicPageMetadata({ title: "제목", description: "소개", path });
        expect(metadata.alternates?.canonical).toBe(path);
        expect(metadata.openGraph).toMatchObject({ url: path });
    });
    it("호출마다 공유 이미지 복사본을 만들어 다른 페이지를 오염시키지 않는다", () => {
        const a = publicPageMetadata(PUBLIC_SECTIONS.works);
        const b = publicPageMetadata(PUBLIC_SECTIONS.crew);
        expect(a.openGraph?.images).not.toBe(b.openGraph?.images);
        expect((a.openGraph?.images as object[])[0]).not.toBe((b.openGraph?.images as object[])[0]);
        expect(PUBLIC_SHARE_IMAGE).toEqual({ url: "/images/studio_logo.jpg", width: 839, height: 839, alt: PUBLIC_SITE_NAME });
    });
});
