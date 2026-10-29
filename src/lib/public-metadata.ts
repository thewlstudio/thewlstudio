import type { Metadata } from "next";

import { SECTION_DESCRIPTIONS, SITE_NAME } from "@/config/site";

export const PUBLIC_SITE_NAME = SITE_NAME;
export const PUBLIC_SHARE_IMAGE = {
    url: "/images/studio_logo.jpg", width: 839, height: 839, alt: PUBLIC_SITE_NAME,
};

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
            card: shareImage ? "summary_large_image" : "summary",
            title: fullTitle, description,
            images: [shareImage || PUBLIC_SHARE_IMAGE.url],
        },
    };
}
