import { describe, expect, it } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";
import { sanitizeSections } from "./crew-sections-server";
import { toPayload as workPayload, toState as workState } from "./work-blocks";
import { toPayload as crewPayload, toState as crewState } from "./crew-sections";
import { managedArrayKey } from "./manage-array-keys";

type Raw = Record<string, unknown>;
const noUpload = async () => null;
const works: Raw[] = [
    { _type: "descriptionBlock", paragraphs: ["원본 문단"] },
    { _type: "signatureMessageBlock", paragraphs: ["인사말"], signature: "서명" },
    { _type: "tracklistBlock", tracks: [{ _key: "new-track", title: "곡", description: "설명" }] },
    { _type: "creditGridBlock", sections: [{ _key: "new-section", title: "크레딧", items: [{ _key: "new-credit", role: "역할", value: "내용", linkText: "링크", linkUrl: "https://example.com" }] }] },
    { _type: "imageBlock", image: { _type: "image", asset: { _ref: "image-original" }, hotspot: { x: 0.3 } }, caption: "사진 설명" },
    { _type: "videoEmbedBlock", url: "https://youtu.be/R86SFBXqEdM" },
    { _type: "audioBlock", title: "곡", artist: "가수", audioFile: { asset: { _ref: "file-original" } } },
];
const crews: Raw[] = [
    { _type: "aboutSection", text: "소개" },
    { _type: "discographySection", years: [{ _key: "new-year", year: "2026", tracks: [{ _key: "new-track", title: "곡", desc: "설명" }] }] },
    { _type: "careerSection", items: [{ _key: "new-career", title: "경력", date: "2026", desc: "설명" }] },
    { _type: "awardsAndActivitiesSection", awards: [{ _key: "new-award", title: "수상", date: "2026" }], activities: [{ _key: "new-activity", title: "활동", date: "2025" }] },
    { _type: "educationSection", items: ["학력"] },
    { _type: "certificationsSection", items: ["자격증"] },
];

describe("일반 본문의 new- 원본 키 왕복", () => {
    it.each(works)("Works $_type 저장·재조회·재저장에도 원본 키와 값이 같다", async (fields) => {
        const original = [{ _key: "new-source", ...fields }]; const before = JSON.stringify(original);
        const first = await sanitizeBlocks(workPayload(workState(original)), original, noUpload);
        expect(first).toEqual({ blocks: original });
        if (!("blocks" in first)) throw new Error("test save failed");
        expect(await sanitizeBlocks(workPayload(workState(first.blocks)), first.blocks as Raw[], noUpload)).toEqual(first);
        expect(JSON.stringify(original)).toBe(before);
    });
    it.each(crews)("Crew $_type 저장·재조회·재저장에도 원본 키와 값이 같다", (fields) => {
        const original = [{ _key: "new-source", ...fields }]; const before = JSON.stringify(original);
        const first = sanitizeSections(crewPayload(crewState(original)), original);
        expect(first).toEqual({ sections: original });
        if (!("sections" in first)) throw new Error("test save failed");
        expect(sanitizeSections(crewPayload(crewState(first.sections)), first.sections as Raw[])).toEqual(first);
        expect(JSON.stringify(original)).toBe(before);
    });
    it("Works 중첩 원본 키도 최상위 키와 독립적으로 유지한다", async () => {
        for (const fields of works.filter((row) => row._type === "tracklistBlock" || row._type === "creditGridBlock")) {
            const original = [{ _key: "normal-root", ...fields }];
            expect(await sanitizeBlocks(workPayload(workState(original)), original, noUpload)).toEqual({ blocks: original });
        }
    });
    it("Crew 중첩 원본 키도 최상위 키와 독립적으로 유지한다", () => {
        for (const fields of crews.filter((row) => ["discographySection", "careerSection", "awardsAndActivitiesSection"].includes(row._type as string))) {
            const original = [{ _key: "normal-root", ...fields }];
            expect(sanitizeSections(crewPayload(crewState(original)), original)).toEqual({ sections: original });
        }
    });
});

describe("서버 원본 배열 문맥과 새 키 발급", () => {
    it.each(["new-source", `new-${"long-".repeat(15)}`, "new- 원본 키 "])("실제 원본 키 %s는 그대로지만 새로운 임시 키는 발급한다", (value) => {
        expect(managedArrayKey(value, [{ _key: value }])).toBe(value);
        expect(managedArrayKey(value, [{ _key: "other" }])).not.toBe(value);
        expect(managedArrayKey(value)).not.toBe(value);
    });
    it("상속되거나 잘못된 원본 키를 저장된 키로 인정하지 않는다", () => {
        const inherited = Object.create({ _key: "new-source" });
        expect(managedArrayKey("new-source", [null, [], "new-source", inherited])).not.toBe("new-source");
    });
    it("Works 같은 키라도 종류를 바꿨으면 이전 종류의 키 문맥을 재사용하지 않는다", async () => {
        const original = [{ _key: "new-source", _type: "descriptionBlock", paragraphs: ["문단"] }];
        const result = await sanitizeBlocks([{ _key: "new-source", _type: "videoEmbedBlock", url: "https://youtu.be/R86SFBXqEdM" }], original, noUpload);
        expect(result).toMatchObject({ blocks: [{ _type: "videoEmbedBlock" }] });
        if (!("blocks" in result)) throw new Error("test save failed");
        expect((result.blocks[0] as Raw)._key).not.toBe("new-source");
    });
    it("Works 크레딧 항목은 같은 묶음의 키만 원본으로 인정한다", async () => {
        const original = [{ _key: "credit", _type: "creditGridBlock", sections: [{ _key: "first", title: "첫 묶음", items: [] }, { _key: "second", title: "둘째 묶음", items: [{ _key: "new-item", role: "원본 역할" }] }] }];
        const state = workState(original);
        if (state[0].type !== "creditGridBlock") throw new Error("test state failed");
        state[0].sections[0].items.push({ key: "new-item", role: "새 역할", value: "", linkText: "", linkUrl: "" });
        const result = await sanitizeBlocks(workPayload(state), original, noUpload);
        if (!("blocks" in result)) throw new Error("test save failed");
        const sections = (result.blocks[0] as { sections: { items: Raw[] }[] }).sections;
        expect(sections[0].items[0]._key).not.toBe("new-item"); expect(sections[1].items[0]._key).toBe("new-item");
    });
    it("Crew 음반 트랙은 같은 연도 안의 키만 원본으로 인정한다", () => {
        const original = [{ _key: "disc", _type: "discographySection", years: [{ _key: "first", year: "2025", tracks: [] }, { _key: "second", year: "2026", tracks: [{ _key: "new-track", title: "원본 곡" }] }] }];
        const state = crewState(original);
        if (state[0].type !== "discographySection") throw new Error("test state failed");
        state[0].years[0].tracks.push({ key: "new-track", title: "새 곡", date: "", desc: "" });
        const result = sanitizeSections(crewPayload(state), original);
        if (!("sections" in result)) throw new Error("test save failed");
        const years = (result.sections[0] as { years: { tracks: Raw[] }[] }).years;
        expect(years[0].tracks[0]._key).not.toBe("new-track"); expect(years[1].tracks[0]._key).toBe("new-track");
    });
    it("Crew 수상과 활동 사이에서도 서로의 임시 키를 재사용하지 않는다", () => {
        const original = [{ _key: "combined", _type: "awardsAndActivitiesSection", awards: [{ _key: "new-row", title: "수상" }], activities: [] }];
        const state = crewState(original);
        if (state[0].type !== "awardsAndActivitiesSection") throw new Error("test state failed");
        state[0].activities.push({ key: "new-row", title: "새 활동", date: "", desc: "" });
        const result = sanitizeSections(crewPayload(state), original);
        if (!("sections" in result)) throw new Error("test save failed");
        const section = result.sections[0] as { awards: Raw[]; activities: Raw[] };
        expect(section.awards[0]._key).toBe("new-row"); expect(section.activities[0]._key).not.toBe("new-row");
    });
});
