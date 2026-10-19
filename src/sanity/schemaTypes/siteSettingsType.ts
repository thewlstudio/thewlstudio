import { defineField, defineType } from "sanity";

/**
 * 사이트 공통 연락처·링크 설정 (문서 하나만 사용: _id "siteSettings").
 * 공개 화면에서 쓰는 곳: Contact 페이지, 헤더 인스타그램, 스튜디오/클래스 예약 버튼, 스튜디오 블로그 링크.
 * 지도 iframe 코드는 받지 않는다 — 주소 문자열만 저장하고 임베드 주소는 서버가 만든다.
 */
export const siteSettingsType = defineType({
    name: "siteSettings",
    title: "Site Settings (연락처·링크)",
    type: "document",
    fields: [
        defineField({ name: "phone", title: "Phone", type: "string", description: "예: 0507-1331-7285" }),
        defineField({ name: "addressKo", title: "Address (Korean)", type: "string" }),
        defineField({ name: "addressEn", title: "Address (English)", type: "string" }),
        defineField({
            name: "mapQuery",
            title: "Map Search Text",
            type: "string",
            description: "Contact 페이지의 구글 지도에 표시할 위치 검색어(주소). 지도 iframe 코드는 넣지 마세요.",
        }),
        defineField({ name: "naverMapPlaceUrl", title: "Naver Map Place URL", type: "url", description: "'Open in Naver Map' 버튼" }),
        defineField({ name: "naverReservationUrl", title: "Naver Reservation URL", type: "url", description: "예약·멤버십 버튼" }),
        defineField({ name: "instagramUrl", title: "Instagram URL", type: "url" }),
        defineField({ name: "blogUrl", title: "Blog URL", type: "url" }),
        defineField({ name: "homeHeadline", title: "Home Headline (홈페이지 소개 제목)", type: "string", description: "줄을 나누려면 Enter가 아니라 관리 화면(/manage/contact)에서 입력하세요." }),
        defineField({ name: "homeIntro", title: "Home Intro (홈페이지 소개 본문)", type: "text", description: "빈 줄로 문단을 나눕니다." }),
    ],
    preview: { prepare: () => ({ title: "Site Settings (연락처·링크)" }) },
});
