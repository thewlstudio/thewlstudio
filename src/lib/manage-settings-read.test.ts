import { describe, expect, it } from "vitest";
import { settingsReadState } from "./manage-settings-read";
import { FALLBACK_SETTINGS } from "./site-settings";
import { FALLBACK_INFO } from "./studio-info";

type Raw = Record<string, unknown>;
const contact = (): Raw => ({ _id: "siteSettings", _type: "siteSettings", _rev: "v1", ...structuredClone(FALLBACK_SETTINGS) });
const info = (): Raw => ({ _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...structuredClone(FALLBACK_INFO) });
describe.each([ { type: "siteSettings" as const, source: contact }, { type: "studioInfo" as const, source: info } ])("$type 읽기 상태", ({ type, source }) => {
    it("정상 원본은 대체 안내 없이 열고, 원본은 변경하지 않는다", () => {
        const raw = source(); const before = JSON.stringify(raw);
        expect(settingsReadState(type, raw)).toEqual({ kind: "ready", fields: [] }); expect(JSON.stringify(raw)).toBe(before);
    });
    it("명시적 null만 문서 없음으로 취급한다", () => {
        expect(settingsReadState(type, null)).toEqual({ kind: "new", fields: [] });
        for (const raw of [undefined, 1, [], "", {}, true]) expect(settingsReadState(type, raw).kind).toBe("blocked");
    });
    it.each(["_id", "_type", "_rev"])("식별 정보 %s의 누락·빈 값·잘못된 형식은 차단한다", (field) => {
        for (const value of [undefined, null, "", 1, {}]) {
            const raw = source(); if (value === undefined) delete raw[field]; else raw[field] = value;
            expect(settingsReadState(type, raw).kind).toBe("blocked");
        }
    });
    it("상속 속성만 있는 문서를 정상 조회로 인정하지 않는다", () => {
        expect(settingsReadState(type, Object.create(source())).kind).toBe("blocked");
    });
});
describe("연락처 값의 대체와 오류 구분", () => {
    it.each(Object.keys(FALLBACK_SETTINGS))("%s의 누락·빈 값과 잘못된 자료형을 구분한다", (field) => {
        for (const value of [undefined, null, "", "   "]) {
            const raw = contact(); if (value === undefined) delete raw[field]; else raw[field] = value;
            expect(settingsReadState("siteSettings", raw)).toMatchObject({ kind: "defaults" });
        }
        for (const value of [1, {}, [], false]) expect(settingsReadState("siteSettings", { ...contact(), [field]: value }).kind).toBe("blocked");
    });
    it.each([
        ["phone", "-----"], ["phone", "12\n345"], ["naverMapPlaceUrl", "https://notnaver.com"],
        ["naverReservationUrl", "https://naver.me.evil.example"], ["instagramUrl", "https://other.example"], ["blogUrl", "javascript:alert(1)"],
    ])("%s의 잘못된 저장값을 조용히 기본값으로 편집하지 않는다", (field, value) => {
        expect(settingsReadState("siteSettings", { ...contact(), [field]: value }).kind).toBe("blocked");
    });
});
const textFields = ["membershipNote", "guidelinesIntro", "parkingWarning", "parkingDetail", "parkingFeeLabel", "parkingFee", "cctvTitle", "cctvDetail", "dutyText", "dutyWarning"];
describe("안내 설정 읽기", () => {
    it.each(textFields)("%s의 없음과 명시적 비우기를 구분한다", (field) => {
        for (const value of [undefined, null]) {
            const raw = info(); if (value === undefined) delete raw[field]; else raw[field] = value;
            expect(settingsReadState("studioInfo", raw).kind).toBe("defaults");
        }
        expect(settingsReadState("studioInfo", { ...info(), [field]: "" }).kind).toBe("ready");
        for (const value of [1, {}, []]) expect(settingsReadState("studioInfo", { ...info(), [field]: value }).kind).toBe("blocked");
    });
    it.each(["services", "equipment", "memberships", "amenities"])("%s는 빈 배열을 보존하고 잘못된 배열은 차단한다", (field) => {
        expect(settingsReadState("studioInfo", { ...info(), [field]: [] }).kind).toBe("ready");
        for (const value of [undefined, null]) {
            const raw = info(); if (value === undefined) delete raw[field]; else raw[field] = value;
            expect(settingsReadState("studioInfo", raw).kind).toBe("defaults");
        }
        for (const value of [1, {}, "bad", [null]]) expect(settingsReadState("studioInfo", { ...info(), [field]: value }).kind).toBe("blocked");
    });
    it.each([
        ["services", ["title", "price", "priceUnit"], "points"], ["equipment", ["title"], "items"], ["memberships", ["num", "label", "sub", "price"], null],
    ] as const)("%s의 중첩 값도 조용히 버리지 않는다", (group, fields, nested) => {
        for (const field of fields) {
            const raw = info(); const rows = raw[group] as Raw[]; delete rows[0][field];
            expect(settingsReadState("studioInfo", raw).kind).toBe("defaults");
            rows[0][field] = {}; expect(settingsReadState("studioInfo", raw).kind).toBe("blocked");
        }
        if (nested) {
            const raw = info(); const rows = raw[group] as Raw[]; delete rows[0][nested];
            expect(settingsReadState("studioInfo", raw).kind).toBe("defaults");
            rows[0][nested] = [1]; expect(settingsReadState("studioInfo", raw).kind).toBe("blocked");
        }
    });
    it.each(["services", "equipment", "memberships"])("%s의 잘못된 키 자료형은 차단하되 키 미지정은 기존 발급 정책을 따른다", (group) => {
        const raw = info(); const rows = raw[group] as Raw[];
        rows[0]._key = 1; expect(settingsReadState("studioInfo", raw).kind).toBe("blocked");
        delete rows[0]._key; expect(settingsReadState("studioInfo", raw).kind).toBe("ready");
    });
    it("여러 누락이 같은 묶음에 있어도 항목 이름은 중복 표시하지 않는다", () => {
        const raw = info(); raw.services = [{ title: "서비스" }];
        expect(settingsReadState("studioInfo", raw)).toEqual({ kind: "defaults", fields: ["서비스"] });
    });
});
