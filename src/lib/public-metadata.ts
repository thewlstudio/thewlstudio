import type { Metadata } from "next";

import { SECTION_DESCRIPTIONS, SITE_NAME } from "@/config/site";

export const PUBLIC_SITE_NAME = SITE_NAME;
/** 링크 공유 미리보기(OG·Twitter) 기본 이미지: 1200x630 가로형. 페이지별 이미지가 없을 때 쓴다. */
export const PUBLIC_SHARE_IMAGE = {
    url: "/images/og_default.jpg", width: 1200, height: 630, alt: PUBLIC_SITE_NAME,
};
/** 구조화 데이터(Organization.logo)에 쓰는 정사각형 로고. 공유 이미지와 다르다. */
export const PUBLIC_LOGO = { url: "/images/studio_logo.jpg", width: 839, height: 839 };

// 기존 페이지 소개 문구를 그대로 유지한다. Works 페이지 번호별 메타데이터도 같은 문구를 쓴다.
export const PUBLIC_SECTIONS = {
    works: { title: "WORKS", description: SECTION_DESCRIPTIONS.works, path: "/works" },
    crew: { title: "CREW", description: SECTION_DESCRIPTIONS.crew, path: "/crew" },
    studio: { title: "STUDIO", description: SECTION_DESCRIPTIONS.studio, path: "/studio" },
    class: { title: "CLASS", description: SECTION_DESCRIPTIONS.class, path: "/class" },
    contact: { title: "CONTACT", description: SECTION_DESCRIPTIONS.contact, path: "/contact" },
};

type PublicMetadataOptions = {
    title: string;
    description: string;
    path: string;
    shareImage?: string | null;
};

/** 중첩 OG/Twitter 필드는 얕게 덮어쓰므로, 각 공개 페이지에 필요한 필드를 함께 선언한다. */
export function publicPageMetadata({ title, description, path, shareImage }: PublicMetadataOptions): Metadata {
    const fullTitle = `${title} | ${PUBLIC_SITE_NAME}`;
    return {
        title: { absolute: fullTitle },
        description,
        alternates: { canonical: path },
        openGraph: {
            type: "website", locale: "ko_KR", siteName: PUBLIC_SITE_NAME,
            url: path, title: fullTitle, description,
            images: shareImage ? [shareImage] : [{ ...PUBLIC_SHARE_IMAGE }],
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle, description,
            images: [shareImage || PUBLIC_SHARE_IMAGE.url],
        },
    };
}
