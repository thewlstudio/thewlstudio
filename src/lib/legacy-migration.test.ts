import { describe, expect, it } from "vitest";
import { legacyMigrationIssue, legacyPreviewRows, migrateLegacy, toPayload, toState } from "./crew-sections";
import { sanitizeSections } from "./crew-sections-server";

describe.each(["awardsSection", "activitiesSection"])("%s 전환 안전성", (_type) => {
    const legacy = (fields = {}) => ({ _key: "old", _type, items: [{ _key: "item", title: "기록", date: "2020" }], ...fields });
    it("날짜·제목과 옛 문자열 행을 새 형식으로 옮기되 원본은 수정하지 않는다", () => {
        const raw = [legacy({ items: ["문자열 기록", { _key: "item", title: "기록", date: "2020" }] })]; const before = JSON.stringify(raw);
        const result = sanitizeSections(toPayload(migrateLegacy(toState(raw), "old")), raw);
        const target = _type === "awardsSection" ? "awards" : "activities";
        expect(result).toMatchObject({ sections: [{ _type: "awardsAndActivitiesSection", [target]: [{ title: "문자열 기록" }, { title: "기록", date: "2020" }] }] });
        expect(JSON.stringify(raw)).toBe(before);
    });
    it("기존 수상·활동의 반대 목록과 순서를 유지하며 뒤에 추가한다", () => {
        const raw = [{ _key: "current", _type: "awardsAndActivitiesSection", awards: [{ _key: "a", title: "기존 수상", date: "2021" }], activities: [{ _key: "b", title: "기존 활동", date: "2022" }] }, legacy()];
        const result = sanitizeSections(toPayload(migrateLegacy(toState(raw), "old")), raw);
        expect(result).toMatchObject({ sections: [{ _key: "current", awards: [{ title: "기존 수상" }, ...(_type === "awardsSection" ? [{ title: "기록" }] : [])], activities: [{ title: "기존 활동" }, ...(_type === "activitiesSection" ? [{ title: "기록" }] : [])] }] });
    });
    it.each([
        { items: [null] }, { items: [123] }, { items: {} },
        { items: [{ title: {}, date: "2020" }] },
        { items: [{ title: "기록", desc: "상세 설명" }] },
        { items: [{ title: "기록", url: "https://example.com" }] },
        { items: [{ title: " ", date: "2020" }] },
        { items: ["기록"], otherField: "추가 원문" },
    ])("손실 가능성이 있는 내용 #%#은 전환 요청에서도 원본을 유지한다", (fields) => {
        const raw = [legacy(fields)]; const state = toState(raw); const before = JSON.stringify(raw);
        expect(legacyMigrationIssue(raw[0])).not.toBeNull(); expect(migrateLegacy(state, "old")).toBe(state);
        expect(sanitizeSections(toPayload(state), raw)).toEqual({ sections: raw }); expect(JSON.stringify(raw)).toBe(before);
    });
    it("없는 선택 값·빈 설명·빈 목록은 새 제한으로 막지 않는다", () => {
        for (const fields of [{ items: [] }, { items: null }, { items: [{ title: "제목", desc: " ", date: null }] }]) expect(legacyMigrationIssue(legacy(fields))).toBeNull();
    });
});

describe("읽기 전용 옛 내용 표시", () => {
    it("문자열과 객체의 날짜·제목·설명을 안전하게 표시한다", () => expect(legacyPreviewRows({ items: ["옛 기록", { date: "2020", title: "수상", desc: "설명" }] })).toEqual([{ date: "", title: "옛 기록", desc: "" }, { date: "2020", title: "수상", desc: "설명" }]));
    it.each([null, [], { title: [] }, { date: {} }, { desc: 123 }])("잘못된 행 #%#은 문자열로 바꾸지 않는다", (row) => expect(legacyPreviewRows({ items: [row] })).toBeNull());
    it("모르는 형식에는 전환을 제공하지 않는다", () => {
        const state = toState([{ _key: "other", _type: "futureSection", items: [null] }]);
        expect(migrateLegacy(state, "other")).toBe(state); expect(legacyMigrationIssue({ _type: "futureSection" })).not.toBeNull();
    });
});
