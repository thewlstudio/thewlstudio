import type { Metadata } from "next";

export const PUBLIC_SITE_NAME = "WHITE LIGHT STUDIO";
export const PUBLIC_SHARE_IMAGE = {
    url: "/images/studio_logo.jpg", width: 839, height: 839, alt: PUBLIC_SITE_NAME,
};

// 기존 페이지 소개 문구를 그대로 유지한다. Works 페이지 번호별 메타데이터도 같은 문구를 쓴다.
export const PUBLIC_SECTIONS = {
    works: { title: "WORKS", description: "화이트라이트 스튜디오에서 제작된 음악 작업물 포트폴리오", path: "/works" },
    crew: { title: "CREW", description: "화이트라이트 스튜디오의 프로듀서, 엔지니어, 크루 소개", path: "/crew" },
    studio: { title: "STUDIO", description: "화이트라이트 스튜디오 연습실 안내 - A, B, C, D Room 시설 및 가격 정보", path: "/studio" },
    class: { title: "CLASS", description: "화이트라이트 스튜디오 음악 클래스 - 보컬, 기타, 피아노, 작곡, 플룻 레슨", path: "/class" },
    contact: { title: "CONTACT", description: "화이트라이트 스튜디오 위치 안내 - 서울특별시 광진구 능동로 413-1 지하1층, 7호선 중곡역 3번 출구", path: "/contact" },
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
