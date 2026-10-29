import { describe, expect, it } from "vitest";
import { sanitizeSections } from "./crew-sections-server";
import { isKnownType, toPayload, toState } from "./crew-sections";

type Raw = Record<string, unknown>;

const existing: Raw[] = [
    { _key: "a1", _type: "aboutSection", text: "소개 글\n둘째 줄" },
    { _key: "c1", _type: "careerSection", items: [{ _key: "r1", date: "2023 ~", title: "경력 한 건", desc: "설명" }] },
    { _key: "d1", _type: "discographySection", years: [{ _key: "y1", year: "2025", tracks: [{ _key: "t1", title: "곡", desc: "싱글" }] }] },
    { _key: "w1", _type: "awardsAndActivitiesSection", awards: [{ _key: "p1", date: "2024", title: "수상" }], activities: [] },
    { _key: "e1", _type: "educationSection", items: ["학교 A"] },
    { _key: "l1", _type: "awardsSection", items: [{ _key: "o1", date: "2020", title: "예전 형식" }] },
];
const canon = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Raw)[k])])) : v;

describe("sanitizeSections — 크루 프로필 섹션 저장 검증", () => {
    it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])("상속된 이름 %s를 알려진 섹션으로 오인하지 않고 보존한다", (type) => {
        expect(isKnownType(type)).toBe(false);
        const original = { _key: "custom", _type: type, items: ["보존할 원본"] };
        expect(sanitizeSections(toPayload(toState([original])), [original])).toEqual({ sections: [original] });
    });
    it("무변경 저장은 무손실이다 (예전 형식 섹션 포함)", () => {
        const payload = JSON.parse(JSON.stringify(toPayload(toState(existing))));
        const r = sanitizeSections(payload, existing);
        expect("sections" in r && canon(r.sections)).toEqual(canon(existing));
    });

    it("예전 형식 섹션은 클라이언트 값을 무시하고 기존 문서에서 그대로 가져온다", () => {
        const r = sanitizeSections([{ _key: "l1", _type: "awardsSection", items: [{ title: "위조" }] }], existing);
        expect("sections" in r && r.sections).toEqual([existing[5]]);
    });

    it("빈 섹션·빈 항목은 저장할 때 빠진다", () => {
        const r = sanitizeSections(
            [
                { _key: "new-1", _type: "aboutSection", text: "   " },
                { _key: "new-2", _type: "careerSection", items: [{ _key: "new-3", title: "", date: "2020", desc: "" }] },
                { _key: "new-4", _type: "educationSection", items: ["", "학교 B"] },
            ],
            [],
        );
        expect("sections" in r && r.sections).toHaveLength(1);
        expect("sections" in r && (r.sections[0] as Raw).items).toEqual(["학교 B"]);
    });

    it("섹션 개수 상한(20)을 넘으면 거부한다", () => {
        const many = Array.from({ length: 21 }, (_, i) => ({ _key: `new-${i}`, _type: "aboutSection", text: "a" }));
        expect("error" in sanitizeSections(many, [])).toBe(true);
    });

    it("배열이 아니면 거부한다", () => {
        expect("error" in sanitizeSections({}, [])).toBe(true);
    });
});
