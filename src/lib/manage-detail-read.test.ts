import { describe, expect, it } from "vitest";
import { detailReadIssue, type DetailDocumentType } from "./manage-detail-read";

const types: DetailDocumentType[] = ["instructor", "crew", "work", "studioSpace"];
const document = (type: DetailDocumentType, fields = {}) => ({ _id: "document", _type: type, _rev: "v1", ...fields });
const issue = (type: DetailDocumentType, fields = {}) => detailReadIssue(type, "document", document(type, fields));

describe.each(types)("%s 편집 전 원본 검사", (type) => {
    it("없던 선택 필드와 정상 메타데이터는 허용한다", () => expect(issue(type)).toBeNull());
    it.each([undefined, null, false, 1, "wrong", []])("문서가 아닌 응답 #%#은 차단한다", (raw) => expect(detailReadIssue(type, "document", raw)).not.toBeNull());
    it.each([undefined, null, "", " ", 1, {}, []])("버전이 잘못된 문서 #%#은 차단한다", (_rev) => expect(issue(type, { _rev })).not.toBeNull());
    it.each(["_id", "_type"])("%s 불일치는 차단한다", (field) => expect(issue(type, { [field]: "other" })).not.toBeNull());
    it.each(["false", 0, [], {}])("휴지통 상태 자료형 #%#을 변환하지 않는다", (trashed) => expect(issue(type, { trashed })).not.toBeNull());
    it("명시적 빈 휴지통 상태와 문자열 수정 시각은 허용한다", () => expect(issue(type, { trashed: null, _updatedAt: "2026-10-28T00:00:00Z" })).toBeNull());
    it("문제가 있는 원본을 수정하거나 반환하지 않는다", () => {
        const raw = document(type, { trashed: { privateData: "DO_NOT_ECHO" } }); const original = JSON.stringify(raw);
        expect(JSON.stringify(detailReadIssue(type, "document", raw))).not.toContain("DO_NOT_ECHO");
        expect(JSON.stringify(raw)).toBe(original);
    });
});

describe("표시 전에 자료형을 보존한다", () => {
    it.each(["instructorName", "category", "subtitle", "lessonInfo", "portfolioUrl", "portfolioText", "portfolioBtn", "imagePosition", "imageUrl", "modalImageUrl", "bgImageUrl"])("강사 %s 객체를 문자열로 바꾸지 않는다", (field) => expect(issue("instructor", { [field]: {} })).not.toBeNull());
    it.each(["about", "process"])("강사 %s는 문자열 목록이어야 한다", (field) => {
        for (const value of ["text", {}, [null], [1], [{}]]) expect(issue("instructor", { [field]: value })).not.toBeNull();
        for (const value of [null, [], ["text", ""]]) expect(issue("instructor", { [field]: value })).toBeNull();
    });
    it("자유 입력인 강사 분류·사진 위치에 임의의 열거형을 강제하지 않는다", () => expect(issue("instructor", { category: "새 분류", imagePosition: "object-center" })).toBeNull());
    it.each(["crew", "studioSpace"] as const)("%s 공개 상태의 문자열 false를 허용하지 않는다", (type) => expect(issue(type, { isActive: "false" })).not.toBeNull());
    it.each(["crew", "work"] as const)("%s 주소 투영 전 원본 자료형도 확인한다", (type) => {
        for (const sourceSlug of ["slug", [], { current: 123 }]) expect(issue(type, { slug: null, sourceSlug })).not.toBeNull();
        expect(issue(type, { slug: null, sourceSlug: null })).toBeNull();
    });
});

describe("Crew 본문·링크", () => {
    it.each([
        { sections: {} }, { sections: [null] }, { sections: [{}] },
        { sections: [{ _type: "aboutSection", text: 123 }] },
        { sections: [{ _type: "careerSection", items: [null] }] },
        { sections: [{ _type: "careerSection", items: [{ date: [] }] }] },
        { sections: [{ _type: "discographySection", years: [{ year: 2026 }] }] },
        { sections: [{ _type: "discographySection", years: [{ tracks: {} }] }] },
        { sections: [{ _type: "awardsAndActivitiesSection", awards: [{ title: {} }] }] },
        { sections: [{ _type: "educationSection", items: [{ title: "학력", desc: "사라질 정보" }] }] },
        { sections: [{ _key: "s", _type: "awardsSection", items: [null] }] },
        { sections: [{ _type: "unknown" }] },
        { sections: [{ _key: "same", _type: "aboutSection" }, { _key: "same", _type: "careerSection" }] },
        { links: {} }, { links: [null] }, { links: [{ url: "https://example.com" }] },
        { links: [{ _key: "a", url: {} }] }, { links: [{ _key: "a", iconRef: {} }] },
        { links: [{ _key: "same" }, { _key: "same" }] },
        { links: null, sourceLinks: {} },
        { links: [{ _key: "a" }], sourceLinks: [{ _key: "a", iconImage: { asset: {} } }] },
    ])("빈 내용이나 새 키로 조용히 바꾸지 않는다 #%#", (fields) => expect(issue("crew", fields)).not.toBeNull());
    it("지원되는 예전 문자열 경력과 키가 있는 미지원 섹션은 보존한다", () => expect(issue("crew", { sections: [
        { _type: "careerSection", items: ["예전 경력", { title: "현재 경력", date: null }] },
        { _key: "legacy", _type: "unknownSection", opaque: { untouched: true } },
        { _key: "old-awards", _type: "awardsSection", items: ["수상"] },
        { _type: "certificationsSection", items: ["자격증"] },
    ] })).toBeNull());
    it("실제 원본 키의 접두어를 해석하지 않는다", () => {
        for (const _key of ["new-source", "legacy-source", "normal"]) expect(issue("crew", { links: [{ _key, url: "https://example.com", iconRef: null }] })).toBeNull();
    });
});

describe("Works 본문", () => {
    it.each([
        {}, null, { _type: "descriptionBlock", paragraphs: [1] },
        { _type: "signatureMessageBlock", signature: {} },
        { _type: "tracklistBlock", tracks: [null] },
        { _type: "tracklistBlock", tracks: [{ description: false }] },
        { _type: "creditGridBlock", sections: [{ items: [{ role: 123 }] }] },
        { _type: "creditGridBlock", sections: [{ items: {} }] },
        { _type: "videoEmbedBlock", url: [] },
        { _type: "imageBlock", imageUrl: null }, { _type: "audioBlock", audioUrl: null },
        { _key: "audio", _type: "audioBlock", title: {} },
        { _type: "freeformTextBlock", body: [] },
    ])("잘못된 블록을 빈 내용으로 바꾸지 않는다 #%#", (block) => expect(issue("work", { contentBlocks: [block] })).not.toBeNull());
    it("배열이 아닌 원본을 투영으로 숨기지 않는다", () => expect(issue("work", { contentBlocks: null, sourceBlocks: {} })).not.toBeNull());
    it("미리보기 URL이 없어도 원본 키가 있으면 미디어·보존 블록을 유지한다", () => expect(issue("work", { contentBlocks: [
        { _key: "photo", _type: "imageBlock", imageUrl: null },
        { _key: "audio", _type: "audioBlock", audioUrl: null },
        { _key: "free", _type: "freeformTextBlock", body: { opaque: true } },
        { _type: "descriptionBlock", paragraphs: null },
    ] })).toBeNull());
    it("중복된 본문·중첩 행 키를 차단한다", () => {
        expect(issue("work", { contentBlocks: [{ _key: "a", _type: "descriptionBlock" }, { _key: "a", _type: "descriptionBlock" }] })).not.toBeNull();
        expect(issue("work", { contentBlocks: [{ _type: "tracklistBlock", tracks: [{ _key: "a" }, { _key: "a" }] }] })).not.toBeNull();
    });
});

describe("Studio 및 투영 일치", () => {
    it.each([
        { features: [null] }, { notes: "text" }, { prices: [null] },
        { prices: [{ label: {}, value: "가격" }] },
        { images: [{ url: null }] }, { images: [{ _key: "photo", url: {} }] },
        { images: [{ _key: "a" }, { _key: "a" }] },
        { images: null, sourceImages: "not an array" },
        { prices: null, sourcePrices: {} },
    ])("잘못된 원본을 기본값으로 바꾸지 않는다 #%#", (fields) => expect(issue("studioSpace", fields)).not.toBeNull());
    it("사진 참조가 있지만 URL이 없는 경우는 차단하지 않는다", () => expect(issue("studioSpace", { images: [{ _key: "photo", url: null }], sourceImages: [{ _key: "photo", asset: { _ref: "image-original" } }] })).toBeNull());
    it.each([
        ["crew", "links", "sourceLinks"], ["work", "contentBlocks", "sourceBlocks"],
        ["studioSpace", "images", "sourceImages"], ["studioSpace", "prices", "sourcePrices"],
    ] as const)("%s %s 투영에서 빠진 행·바뀐 키를 감지한다", (type, field, source) => {
        const row = { _key: "a", _type: "descriptionBlock" };
        expect(issue(type, { [field]: [], [source]: [row] })).not.toBeNull();
        expect(issue(type, { [field]: [{ ...row, _key: "b" }], [source]: [row] })).not.toBeNull();
        expect(issue(type, { [field]: [row], [source]: [row] })).toBeNull();
    });
    it("작업물 블록 종류가 투영에서 바뀌면 차단한다", () => expect(issue("work", { contentBlocks: [{ _key: "a", _type: "descriptionBlock" }], sourceBlocks: [{ _key: "a", _type: "imageBlock" }] })).not.toBeNull());
});
