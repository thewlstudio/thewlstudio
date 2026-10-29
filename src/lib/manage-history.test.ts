import { describe, expect, it, vi } from "vitest";
import { buildHistoryRows, buildRestorePatch, buildRestoredDoc, changedKeys, docAt, HISTORY_AREAS, historyValue, isHistoryArea, isHistoryDocument, isHistoryDocumentId, listRevisions, summarizeValue } from "./manage-history";

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
    it("없는 필드는 객체 기본 속성이 아니라 비어 있는 값으로 비교·표시한다", () => {
        expect(changedKeys({ constructor: null }, {})).toEqual([]);
        expect(historyValue({}, "constructor")).toBeUndefined();
        expect(summarizeValue(historyValue({}, "__proto__"))).toBe("(비어 있음)");
    });
});

describe("이력 비교의 보관 한도·조회 실패", () => {
    const revisions = Array.from({ length: 26 }, (_, i) => ({ id: `r${i}`, timestamp: `2026-10-20T12:00:${String(i).padStart(2, "0")}Z` }));
    const docs = revisions.map((r, i) => ({ _id: "d", _type: "crew", _rev: r.id, name: String(i) }));
    it("25개만 표시하되 26번째 자료로 마지막 표시 항목도 비교한다", () => {
        const rows = buildHistoryRows(revisions, docs);
        expect(rows).toHaveLength(25);
        expect(rows[24]).toMatchObject({ comparison: "available", keys: ["name"], prev: docs[25] });
    });
    it("가장 오래된 조회 결과를 최초 생성으로 단정하지 않는다", () => {
        const rows = buildHistoryRows(revisions.slice(0, 2), docs.slice(0, 2));
        expect(rows[1]).toMatchObject({ comparison: "boundary", keys: [] });
    });
    it("스냅샷이나 이전 기록을 못 읽으면 빈 문서와 비교하지 않는다", () => {
        const rows = buildHistoryRows(revisions.slice(0, 3), [docs[0], null, docs[2]]);
        expect(rows[0]).toMatchObject({ comparison: "unavailable", keys: [] });
        expect(rows[1]).toMatchObject({ comparison: "unavailable", keys: [] });
    });
    it("API가 생성 동작을 명시한 항목만 생성으로 표시한다", () => {
        const rows = buildHistoryRows([{ ...revisions[0], created: true }], [docs[0]]);
        expect(rows[0].comparison).toBe("created");
    });
});

describe("이력 API 응답", () => {
    const fakeClient = (request: ReturnType<typeof vi.fn>) => ({ request }) as unknown as Parameters<typeof listRevisions>[0];
    it("문서에 대한 create만 생성으로 보고, 교체·다른 문서 생성은 구분한다", async () => {
        const request = vi.fn().mockResolvedValue([
            { id: "r1", timestamp: "2026-10-20T12:00:00Z", mutations: [{ create: { _id: "d" } }] },
            { id: "r2", timestamp: "2026-10-20T12:00:01Z", mutations: [{ createOrReplace: { _id: "d" } }] },
            { id: "r3", timestamp: "2026-10-20T12:00:02Z", mutations: [{ create: { _id: "other" } }] },
        ].map((r) => JSON.stringify(r)).join("\n") + "\n");
        const result = await listRevisions(fakeClient(request), "d", 26);
        expect(result.map((r) => r.created)).toEqual([true, false, false]);
        expect(request).toHaveBeenCalledWith(expect.objectContaining({ query: { limit: "26", excludeContent: "true", reverse: "true" }, json: false }));
    });
    it.each(['{"id":"r"}', '{"id":"r","timestamp":"wrong"}', "null", "not json"])("형식이 깨진 응답은 조용히 정상 이력으로 표시하지 않는다: %s", async (response) => {
        await expect(listRevisions(fakeClient(vi.fn().mockResolvedValue(response)), "d")).rejects.toThrow();
    });
    it("지정 시점 조회는 time을 그대로 API에 전달한다", async () => {
        const doc = { _id: "d", _rev: "r1" };
        const request = vi.fn().mockResolvedValue({ documents: [doc] });
        expect(await docAt(fakeClient(request), "d", "2026-10-20T12:00:00Z")).toEqual(doc);
        expect(request).toHaveBeenCalledWith(expect.objectContaining({ query: { time: "2026-10-20T12:00:00Z" } }));
    });
    it.each([[], {}, null, undefined])("NDJSON이 아닌 응답 #%#를 빈 기록처럼 취급하지 않는다", async (response) => {
        await expect(listRevisions(fakeClient(vi.fn().mockResolvedValue(response)), "d")).rejects.toThrow();
    });
    it.each([
        { documents: { 0: { _id: "d", _rev: "r" } } },
        { documents: [{ _id: "d", _rev: "r1" }, { _id: "d", _rev: "r2" }] },
        { documents: "not-an-array" }, {},
    ])("스냅샷 응답 #%#의 첫 값만 골라 복원 후보로 쓰지 않는다", async (response) => {
        await expect(docAt(fakeClient(vi.fn().mockResolvedValue(response)), "d", "2026-10-20T12:00:00Z")).rejects.toThrow();
    });
    it("실제 빈 NDJSON과 빈 스냅샷 배열은 실패로 바꾸지 않는다", async () => {
        expect(await listRevisions(fakeClient(vi.fn().mockResolvedValue("\n  \n")), "d")).toEqual([]);
        expect(await docAt(fakeClient(vi.fn().mockResolvedValue({ documents: [] })), "d", "2026-10-20T12:00:00Z")).toBeNull();
    });
    it.each(["id", "timestamp"])("저장 기록의 %s 중복은 모호하게 선택하지 않는다", async (field) => {
        const first = { id: "r1", timestamp: "2026-10-20T12:00:01Z" };
        const second = { id: "r2", timestamp: "2026-10-20T12:00:00Z", [field]: first[field as keyof typeof first] };
        await expect(listRevisions(fakeClient(vi.fn().mockResolvedValue([first, second].map((row) => JSON.stringify(row)).join("\n"))), "d")).rejects.toThrow();
    });
    it.each([undefined, null, [], 1, { _id: "d", _type: "crew", _rev: " " }])("유효하지 않은 문서 메타데이터 #%#를 복원 후보로 쓰지 않는다", (raw) => {
        expect(isHistoryDocument(raw, "d", "crew")).toBe(false);
    });
});

describe("복원 패치", () => {
    it("시스템 정보는 건드리지 않고 없어져야 할 항목만 unset한다", () => {
        const result = buildRestorePatch({ _id: "d", _type: "crew", _createdAt: "old", name: "A", trashed: false }, { _id: "d", _type: "crew", _rev: "r", _createdAt: "now", name: "B", added: true, trashed: true, order: 9 });
        expect(result).toEqual({ set: { name: "A", trashed: true, order: 9 }, unset: ["added"] });
    });
    it("특수 이름의 필드가 객체 프로토타입을 바꾸지 않는다", () => {
        const old = JSON.parse('{"_id":"d","__proto__":{"polluted":true}}');
        const restored = buildRestoredDoc(old, null);
        expect(Object.getPrototypeOf(restored)).toBe(Object.prototype);
        expect(Object.hasOwn(restored, "__proto__")).toBe(true);
    });
});

describe("이력 문서 ID", () => {
    it.each(["abc", "room_a-1", "studioInfo"])("정상 공개 문서 ID %s", (id) => expect(isHistoryDocumentId(id)).toBe(true));
    it.each(["drafts.abc", "versions.r.abc", "../abc", "bad/id", "%", "abc..def", "x".repeat(129)])("잘못된 ID 또는 초안 ID %s", (id) => expect(isHistoryDocumentId(id)).toBe(false));
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
    it.each(["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"])("객체 기본 속성 %s는 이력 영역이 아니다", (area) => {
        expect(isHistoryArea(area)).toBe(false);
    });
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
