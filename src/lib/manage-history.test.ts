import { describe, expect, it } from "vitest";
import { buildRestoredDoc, changedKeys, HISTORY_AREAS, isHistoryArea, summarizeValue } from "./manage-history";

describe("changedKeys — 이력에서 '무엇이 바뀌었나'", () => {
    it("값이 달라진 항목만, 시스템 필드는 제외하고 돌려준다", () => {
        const a = { _id: "x", _rev: "1", _updatedAt: "t1", name: "A", features: ["a"], order: 1 };
        const b = { _id: "x", _rev: "2", _updatedAt: "t2", name: "B", features: ["a"], order: 1 };
        expect(changedKeys(a, b)).toEqual(["name"]);
    });

    it("추가·삭제된 필드도 감지한다", () => {
        expect(changedKeys({ _id: "x", a: 1 }, { _id: "x", a: 1, b: 2 })).toEqual(["b"]);
        expect(changedKeys({ _id: "x", a: 1, b: 2 }, { _id: "x", a: 1 })).toEqual(["b"]);
    });

    it("배열·객체는 내용으로 비교한다", () => {
        expect(changedKeys({ images: [{ k: 1 }] }, { images: [{ k: 1 }] })).toEqual([]);
        expect(changedKeys({ images: [{ k: 1 }] }, { images: [{ k: 2 }] })).toEqual(["images"]);
    });

    it("처음 만들어진 문서(이전 없음)는 모든 항목이 바뀐 것으로 본다", () => {
        expect(changedKeys(null, { _id: "x", name: "A" })).toEqual(["name"]);
    });

    it("undefined와 null은 같은 '비어 있음'으로 본다", () => {
        expect(changedKeys({ a: undefined }, { a: null })).toEqual([]);
    });
});

describe("buildRestoredDoc — 이전 시점으로 되돌릴 문서", () => {
    const old = { _id: "d", _type: "crew", _rev: "OLD", _updatedAt: "t", _createdAt: "c0", name: "옛 이름", trashed: false, order: 1 };

    it("_rev·_updatedAt은 빼고 _createdAt·_id·_type은 유지한다", () => {
        const r = buildRestoredDoc(old, null);
        expect(r._rev).toBeUndefined();
        expect(r._updatedAt).toBeUndefined();
        expect(r._createdAt).toBe("c0");
        expect(r._id).toBe("d");
        expect(r._type).toBe("crew");
    });

    it("휴지통 상태와 순서는 '지금' 값을 유지한다 (되돌리기가 삭제·순서를 바꾸면 안 됨)", () => {
        const r = buildRestoredDoc(old, { _id: "d", trashed: true, order: 9 });
        expect(r.trashed).toBe(true);
        expect(r.order).toBe(9);
        expect(r.name).toBe("옛 이름");
    });

    it("지금 문서에 그 필드가 없으면 되돌린 문서에서도 뺀다", () => {
        const r = buildRestoredDoc(old, { _id: "d" });
        expect("trashed" in r).toBe(false);
        expect("order" in r).toBe(false);
    });
});

describe("summarizeValue", () => {
    it("값 종류별로 한 줄 요약", () => {
        expect(summarizeValue(undefined)).toBe("(비어 있음)");
        expect(summarizeValue("")).toBe("(비어 있음)");
        expect(summarizeValue(true)).toBe("예");
        expect(summarizeValue(false)).toBe("아니요");
        expect(summarizeValue([1, 2, 3])).toBe("3개 항목");
        expect(summarizeValue("가".repeat(100))).toHaveLength(61);
    });
});

describe("HISTORY_AREAS", () => {
    it("영역 키 검사와 고정 문서 ID", () => {
        expect(isHistoryArea("crew")).toBe(true);
        expect(isHistoryArea("nope")).toBe(false);
        expect(HISTORY_AREAS.contact.fixedId).toBe("siteSettings");
        expect(HISTORY_AREAS["studio-info"].fixedId).toBe("studioInfo");
    });

    it("모든 영역은 고유한 문서 종류·갱신 태그와 수정 화면 주소를 가진다", () => {
        const types = Object.values(HISTORY_AREAS).map((a) => a.type);
        expect(new Set(types).size).toBe(types.length);
        for (const a of Object.values(HISTORY_AREAS)) {
            expect(a.tag).toBeTruthy();
            expect(a.back("abc")).toMatch(/^\/manage\//);
        }
    });
});
