import { describe, expect, it, vi } from "vitest";
import { docAt, isHistoryDocument, isHistoryTime, listRevisions } from "./manage-history";

const validTimes = ["2026-10-20T12:00:00Z", "2026-10-20T12:00:00.123456Z", "2024-02-29T23:59:59.000001+09:00", "2026-10-20T12:00:00-04:30"];
const invalidTimes = ["1", "2026-10-20", "2026-10-20T12:00:00", "2026-02-30T12:00:00Z", "2025-02-29T12:00:00Z", "2026-10-20T24:00:00Z", "Tue, 20 Oct 2026 12:00:00 GMT", " 2026-10-20T12:00:00Z "];
const fake = (request: ReturnType<typeof vi.fn>) => ({ request }) as unknown as Parameters<typeof docAt>[0];

describe("이력 시점 경계", () => {
    it.each([null, undefined, 1, "2026-13-01T00:00:00Z", "2026-01-00T00:00:00Z", "2026-04-31T00:00:00Z", "2026-01-01T00:60:00Z", "2026-01-01T00:00:60Z", "2026-01-01T00:00:00+24:00", "2026-01-01T00:00:00+09:60", "1900-02-29T00:00:00Z"])("자료형·달력·시간대 경계 #%#를 추측하지 않는다", (value) => {
        expect(isHistoryTime(value)).toBe(false);
    });
    it.each(["2000-02-29T00:00:00Z", "2026-01-01t00:00:00z"])("정상 윤년·날짜시간 표기 %s를 허용한다", (value) => {
        expect(isHistoryTime(value)).toBe(true);
    });
    it.each(invalidTimes)("잘못된 시점 %s를 조회 전에 거부한다", async (time) => {
        const request = vi.fn().mockResolvedValue({ documents: [] });
        await expect(docAt(fake(request), "d", time)).rejects.toThrow(); expect(request).not.toHaveBeenCalled();
    });
    it.each(invalidTimes)("잘못된 기록 시점 %s로 복원 후보를 만들지 않는다", async (timestamp) => {
        const request = vi.fn().mockResolvedValue(JSON.stringify({ id: "r1", timestamp }));
        await expect(listRevisions(fake(request), "d")).rejects.toThrow();
    });
    it.each(validTimes)("정상 시점 %s의 원문을 그대로 전달한다", async (time) => {
        const request = vi.fn().mockResolvedValue({ documents: [{ _id: "d", _type: "crew", _rev: "r1" }] });
        await expect(docAt(fake(request), "d", time)).resolves.toMatchObject({ _id: "d" });
        expect(request).toHaveBeenCalledWith(expect.objectContaining({ query: { time } }));
    });
    it("같은 밀리초 안의 서로 다른 소수 초 기록을 합치지 않는다", async () => {
        const timestamps = ["2026-10-20T12:00:00.123456Z", "2026-10-20T12:00:00.123455Z"];
        const request = vi.fn().mockResolvedValue(timestamps.map((timestamp, index) => JSON.stringify({ id: `r${index}`, timestamp })).join("\n"));
        expect((await listRevisions(fake(request), "d")).map((row) => row.timestamp)).toEqual(timestamps);
    });
});

describe("이력 원본 응답 경계", () => {
    it.each(["_id", "_type", "_rev"])("상속된 %s는 복원 문서의 식별 정보로 인정하지 않는다", (key) => {
        const original: Record<string, unknown> = { _id: "d", _type: "crew", _rev: "r1" };
        const own = { ...original }; delete own[key];
        expect(isHistoryDocument(Object.assign(Object.create({ [key]: original[key] }), own), "d", "crew")).toBe(false);
    });
    it.each([
        { name: "빈 슬롯", make: () => ({ documents: Array(1) }) },
        { name: "상속된 응답 목록", make: () => Object.create({ documents: [{ _id: "d", _type: "crew", _rev: "r1" }] }) },
    ])("$name 응답을 정상 스냅샷이나 없음으로 바꾸지 않는다", async ({ make }) => {
        await expect(docAt(fake(vi.fn().mockResolvedValue(make())), "d", validTimes[0])).rejects.toThrow();
    });
    it.each([{ documents: [] }, { documents: [null] }])("정상 없음 응답 #%#는 유지한다", async ({ documents }) => {
        await expect(docAt(fake(vi.fn().mockResolvedValue({ documents })), "d", validTimes[0])).resolves.toBeNull();
    });
});
