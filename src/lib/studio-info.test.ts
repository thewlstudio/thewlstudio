import { describe, expect, it } from "vitest";
import { FALLBACK_INFO, mergeInfo, mergeInfoForManage } from "./studio-info";

describe("mergeInfo — 스튜디오 안내", () => {
    it("문서가 없으면 기본값", () => {
        expect(mergeInfo(null)).toEqual(FALLBACK_INFO);
    });

    it("필드가 아예 없으면 그 필드만 기본값", () => {
        const m = mergeInfo({ parkingFee: "10분 500원" });
        expect(m.parkingFee).toBe("10분 500원");
        expect(m.services).toEqual(FALLBACK_INFO.services);
        expect(m.cctvTitle).toBe(FALLBACK_INFO.cctvTitle);
    });

    it("일부러 비운 목록은 비어 있는 그대로 둔다 (지운 항목이 되살아나면 안 됨)", () => {
        const m = mergeInfo({ services: [], amenities: [], membershipNote: "" });
        expect(m.services).toEqual([]);
        expect(m.amenities).toEqual([]);
        expect(m.membershipNote).toBe("");
    });

    it("목록 항목의 누락된 하위 값은 빈 값으로 채워 화면이 깨지지 않게 한다", () => {
        const m = mergeInfo({ services: [{ title: "X" }], memberships: [{ label: "1개월" }] });
        expect(m.services[0]).toEqual({ title: "X", price: "", priceUnit: "", points: [] });
        expect(m.memberships[0]).toEqual({ num: "", label: "1개월", sub: "", price: "" });
    });
});

describe("Studio 관리자 전용 원본 키", () => {
    it.each(["services", "equipment", "memberships"] as const)("%s의 키를 정확히 보존하면서 공개 모델에는 추가하지 않는다", (group) => {
        const raw = { ...FALLBACK_INFO, [group]: FALLBACK_INFO[group].map((row, i) => ({ ...row, _key: `${"long-prefix-".repeat(4)}${i}` })) };
        const before = JSON.stringify(raw);
        expect(mergeInfoForManage(raw)[group].map((row) => row._key)).toEqual(raw[group].map((_row, i) => `${"long-prefix-".repeat(4)}${i}`));
        expect(mergeInfo(raw)[group]).toEqual(FALLBACK_INFO[group]);
        expect(JSON.stringify(raw)).toBe(before);
    });
    it.each([null, undefined, {}])("원본이 없는 경우 #%#에도 기본값과 미지정 키를 유지한다", (raw) => {
        const model = mergeInfoForManage(raw);
        expect(JSON.parse(JSON.stringify(model))).toEqual(FALLBACK_INFO);
        expect(model.services.every((row) => row._key === undefined)).toBe(true);
    });
    it("비어 있는 배열과 문구는 되살리지 않는다", () => {
        expect(mergeInfoForManage({ services: [], equipment: [], memberships: [], membershipNote: "" })).toMatchObject({ services: [], equipment: [], memberships: [], membershipNote: "" });
    });
    it("원본의 null 행을 제외한 뒤에도 내용과 키의 대응을 유지한다", () => {
        const model = mergeInfoForManage({ services: [null, { _key: "source", title: "제목" }] });
        expect(model.services).toEqual([{ _key: "source", title: "제목", price: "", priceUnit: "", points: [] }]);
    });
    it("다른 배열의 같은 키와 특수문자가 있는 키도 임의로 바꾸지 않는다", () => {
        const source = " new-원본 % [key] ";
        const model = mergeInfoForManage({ services: [{ _key: source, title: "서비스" }], equipment: [{ _key: source, title: "장비" }], memberships: [{ _key: source, label: "회원권" }] });
        expect([model.services[0]._key, model.equipment[0]._key, model.memberships[0]._key]).toEqual([source, source, source]);
    });
});
