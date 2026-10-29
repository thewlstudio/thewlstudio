import { describe, expect, it, vi } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";
import { sanitizeSections } from "./crew-sections-server";
import { toPayload as blockPayload, toState as blockState } from "./work-blocks";
import { toPayload as sectionPayload, toState as sectionState } from "./crew-sections";
import { arrayKeyError, managedArrayKey } from "./manage-array-keys";
import { workPayloadFixture, crewPayloadFixture } from "@/test/body-payloads";

const noUpload = async () => null;
const longKeys = [`${"same-prefix-".repeat(4)}first`, `${"same-prefix-".repeat(4)}second`];
const duplicateRows = [{ _key: "duplicate", title: "첫 항목" }, { _key: "duplicate", title: "둘째 항목" }];
const workCases = [
    { label: "최상위 블록", payload: [{ _key: "duplicate", _type: "descriptionBlock", paragraphs: ["첫 문단"] }, { _key: "duplicate", _type: "descriptionBlock", paragraphs: ["둘째 문단"] }] },
    { label: "종류가 다른 블록", payload: [{ _key: "duplicate", _type: "descriptionBlock", paragraphs: ["문단"] }, { _key: "duplicate", _type: "signatureMessageBlock", signature: "서명" }] },
    { label: "트랙", payload: [{ _key: "track", _type: "tracklistBlock", tracks: duplicateRows }] },
    { label: "크레딧 묶음", payload: [{ _key: "credit", _type: "creditGridBlock", sections: duplicateRows }] },
    { label: "크레딧 항목", payload: [{ _key: "credit", _type: "creditGridBlock", sections: [{ _key: "section", items: duplicateRows.map((r) => ({ _key: r._key, role: r.title })) }] }] },
    { label: "임시 사진 키", payload: [{ _key: "new-photo", _type: "imageBlock" }, { _key: "new-photo", _type: "imageBlock" }] },
];
const crewCases = [
    { label: "최상위 섹션", payload: [{ _key: "duplicate", _type: "aboutSection", text: "첫 소개" }, { _key: "duplicate", _type: "aboutSection", text: "둘째 소개" }] },
    { label: "연도 묶음", payload: [{ _key: "disc", _type: "discographySection", years: duplicateRows.map((r) => ({ _key: r._key, year: r.title })) }] },
    { label: "음반 트랙", payload: [{ _key: "disc", _type: "discographySection", years: [{ _key: "year", tracks: duplicateRows }] }] },
    { label: "경력", payload: [{ _key: "career", _type: "careerSection", items: duplicateRows }] },
    { label: "수상", payload: [{ _key: "awards", _type: "awardsAndActivitiesSection", awards: duplicateRows }] },
    { label: "대외활동", payload: [{ _key: "activities", _type: "awardsAndActivitiesSection", activities: duplicateRows }] },
];

describe("같은 배열의 중복 식별 키", () => {
    it.each(workCases)("Works $label — 업로드 전에 중복을 거부한다", async ({ payload }) => {
        const before = JSON.stringify(payload);
        const upload = vi.fn(async () => ({ asset: { _ref: "new-image" } }));
        const result = await sanitizeBlocks(workPayloadFixture(payload), [], upload);
        expect(result).toHaveProperty("error");
        expect("error" in result && result.error).toContain("중복");
        expect(upload).not.toHaveBeenCalled();
        expect(JSON.stringify(payload)).toBe(before);
    });
    it.each(crewCases)("Crew $label — 임의 병합이나 재발급 없이 중복을 거부한다", ({ payload }) => {
        const before = JSON.stringify(payload);
        const result = sanitizeSections(crewPayloadFixture(payload), []);
        expect(result).toHaveProperty("error");
        expect("error" in result && result.error).toContain("중복");
        expect(JSON.stringify(payload)).toBe(before);
    });
});

describe("배열 키 공통 규칙", () => {
    it.each([null, undefined, 1, "same", {}, ["same", "same"], [{}, {}], [{ _key: "" }, { _key: "" }]])("키가 없는 값 #%#를 중복으로 간주하지 않는다", (value) => {
        expect(arrayKeyError(value, "항목")).toBeNull();
    });
    it.each(["__proto__", "constructor", "toString", "new-photo", " 긴 원본 키 "])("키 %s는 프로토타입이나 정규화에 기대지 않고 정확히 비교한다", (key) => {
        expect(arrayKeyError([{ _key: key }, { _key: key }], "목록")).toContain("중복");
        expect(arrayKeyError([{ _key: key }, { _key: `${key}x` }], "목록")).toBeNull();
    });
    it.each([undefined, null, "", "new-photo", 1])("임시·미지정 키 #%#는 서버에서 발급한다", (value) => {
        const key = managedArrayKey(value);
        expect(key).toMatch(/^[0-9a-f-]+$/);
        expect(key).not.toBe(value);
    });
    it.each([longKeys[0], "__proto__", " leading-space", "trailing-space "])("기존 키 %s는 자르거나 공백을 지우지 않는다", (value) => {
        expect(managedArrayKey(value)).toBe(value);
    });
    it("키가 없는 항목도 각각 별도의 키를 받는다", async () => {
        const result = await sanitizeBlocks([{ _type: "descriptionBlock", paragraphs: ["첫 문단"] }, { _type: "descriptionBlock", paragraphs: ["둘째 문단"] }], [], noUpload);
        expect("blocks" in result && new Set(result.blocks.map((b) => (b as { _key: string })._key)).size).toBe(2);
    });
    it("편집하지 않는 원본 블록도 최상위 중복 키는 거부한다", async () => {
        const original = { _key: "same", _type: "freeformTextBlock", content: "서버 원본" };
        const result = await sanitizeBlocks([original, original], [original], noUpload);
        expect(result).toHaveProperty("error");
    });
});

describe("긴 원본 식별 키는 자르지 않는다", () => {
    it("Works 최상위·트랙·크레딧 키의 공통 40자 접두사로 충돌하지 않는다", async () => {
        const original = [
            ...longKeys.map((_key, i) => ({ _key, _type: "descriptionBlock", paragraphs: [`문단 ${i}`] })),
            { _key: "tracks", _type: "tracklistBlock", tracks: longKeys.map((_key, i) => ({ _key, title: `트랙 ${i}` })) },
            { _key: "credit", _type: "creditGridBlock", sections: longKeys.map((_key) => ({ _key, title: "묶음", items: longKeys.map((_key, i) => ({ _key, role: `역할 ${i}` })) })) },
        ];
        expect(await sanitizeBlocks(blockPayload(blockState(original)), original, noUpload)).toEqual({ blocks: original });
    });
    it("Crew 최상위·연도·트랙·경력·수상·활동 키를 모두 유지한다", () => {
        const original = [
            ...longKeys.map((_key, i) => ({ _key, _type: "aboutSection", text: `소개 ${i}` })),
            { _key: "disc", _type: "discographySection", years: longKeys.map((_key) => ({ _key, year: "2026", tracks: longKeys.map((_key, i) => ({ _key, title: `트랙 ${i}` })) })) },
            { _key: "career", _type: "careerSection", items: longKeys.map((_key, i) => ({ _key, title: `경력 ${i}` })) },
            { _key: "awards", _type: "awardsAndActivitiesSection", awards: longKeys.map((_key, i) => ({ _key, title: `수상 ${i}` })), activities: longKeys.map((_key, i) => ({ _key, title: `활동 ${i}` })) },
        ];
        expect(sanitizeSections(sectionPayload(sectionState(original)), original)).toEqual({ sections: original });
    });
});
