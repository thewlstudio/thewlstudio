import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * /studio 페이지의 서비스 가격·장비·멤버십·이용 안내 (문서 하나만 사용: _id "studioInfo").
 * 연습실·로비 카드는 studioSpace 문서가 따로 맡는다. 화면은 app/studio/StudioClient.tsx와 맞춰져 있다.
 * 문자열 안의 줄바꿈은 화면에서 (데스크톱 기준) 줄바꿈으로 표시된다.
 */
export const studioInfoType = defineType({
    name: "studioInfo",
    title: "Studio Info (서비스·장비·멤버십·이용 안내)",
    type: "document",
    fields: [
        defineField({
            name: "services",
            title: "Services",
            type: "array",
            of: [
                defineArrayMember({
                    type: "object",
                    fields: [
                        defineField({ name: "title", title: "Title", type: "string" }),
                        defineField({ name: "price", title: "Price (예: 100,000 KRW)", type: "string" }),
                        defineField({ name: "priceUnit", title: "Price Unit (예: / 2 Hours)", type: "string" }),
                        defineField({ name: "points", title: "Points", type: "array", of: [{ type: "string" }] }),
                    ],
                }),
            ],
        }),
        defineField({
            name: "equipment",
            title: "Equipment",
            type: "array",
            of: [
                defineArrayMember({
                    type: "object",
                    fields: [
                        defineField({ name: "title", title: "Group Title", type: "string" }),
                        defineField({ name: "items", title: "Items", type: "array", of: [{ type: "string" }] }),
                    ],
                }),
            ],
        }),
        defineField({
            name: "memberships",
            title: "Memberships",
            type: "array",
            of: [
                defineArrayMember({
                    type: "object",
                    fields: [
                        defineField({ name: "num", title: "Number (원 안의 숫자)", type: "string" }),
                        defineField({ name: "label", title: "Label (예: 1개월 회원권)", type: "string" }),
                        defineField({ name: "sub", title: "Sub (예: 1 Month Pass)", type: "string" }),
                        defineField({ name: "price", title: "Price (예: 40,000)", type: "string" }),
                    ],
                }),
            ],
        }),
        defineField({ name: "membershipNote", title: "Membership Note", type: "text" }),
        defineField({ name: "guidelinesIntro", title: "Guidelines Intro", type: "text" }),
        defineField({ name: "parkingWarning", title: "Parking Warning", type: "string" }),
        defineField({ name: "parkingDetail", title: "Parking Detail", type: "text" }),
        defineField({ name: "parkingFeeLabel", title: "Parking Fee Label", type: "string" }),
        defineField({ name: "parkingFee", title: "Parking Fee", type: "string" }),
        defineField({ name: "amenities", title: "Amenities", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "cctvTitle", title: "CCTV Title", type: "string" }),
        defineField({ name: "cctvDetail", title: "CCTV Detail", type: "text" }),
        defineField({ name: "dutyText", title: "Duty Text", type: "text" }),
        defineField({ name: "dutyWarning", title: "Duty Warning", type: "string" }),
    ],
    preview: { prepare: () => ({ title: "Studio Info (서비스·장비·멤버십·이용 안내)" }) },
});
