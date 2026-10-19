import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * 스튜디오 페이지의 "공간" 카드 — 연습실(A~D룸)과 로비.
 * 화면 표시는 app/studio/page.tsx의 RoomBlock / Lobby 블록과 맞춰져 있다.
 */
export const studioSpaceType = defineType({
    name: "studioSpace",
    title: "Studio Space (Room / Lobby)",
    type: "document",
    fields: [
        defineField({
            name: "kind",
            title: "Kind",
            type: "string",
            options: {
                list: [
                    { title: "Room (연습실)", value: "room" },
                    { title: "Lobby (로비)", value: "lobby" },
                ],
                layout: "radio",
            },
            initialValue: "room",
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: "name",
            title: "Name",
            type: "string",
            description: '연습실은 "W.L Studio [A Room]" 형태로 적어야 제목이 "A ROOM"으로 나뉘어 표시됩니다.',
            validation: (rule) => rule.required(),
        }),
        defineField({ name: "subtitle", title: "Subtitle (로비용 소제목)", type: "string" }),
        defineField({
            name: "prices",
            title: "Prices",
            type: "array",
            of: [
                defineArrayMember({
                    type: "object",
                    fields: [
                        defineField({ name: "label", title: "Label (예: 기본)", type: "string" }),
                        defineField({ name: "value", title: "Value (예: 6,000)", type: "string" }),
                        defineField({ name: "unit", title: "Unit (예: 원 / 1H)", type: "string" }),
                    ],
                }),
            ],
        }),
        defineField({ name: "description", title: "Description (로비용 소개글)", type: "text" }),
        defineField({ name: "features", title: "Features", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "notes", title: "Notes (붉은 안내 문구)", type: "array", of: [{ type: "string" }] }),
        defineField({
            name: "images",
            title: "Photos (캐러셀 순서대로)",
            type: "array",
            of: [defineArrayMember({ type: "image", options: { hotspot: true } })],
        }),
        defineField({
            name: "order",
            title: "Display Order",
            type: "number",
            description: "작을수록 위에 표시됩니다.",
        }),
        // 기존 문서에는 없을 수 있으며, 없으면 "공개"로 취급한다.
        defineField({ name: "isActive", title: "Visible on site", type: "boolean", initialValue: true }),
        // 관리 화면의 휴지통(소프트 삭제) 표시. 없으면 "삭제 안 됨"으로 취급한다.
        defineField({ name: "trashed", title: "(휴지통) 삭제됨", type: "boolean", initialValue: false, hidden: true }),
    ],
    preview: { select: { title: "name", subtitle: "kind", media: "images.0" } },
});
