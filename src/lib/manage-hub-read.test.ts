import { describe, expect, it } from "vitest";
import { HUB_RECENT_META, readHubCounts, readHubRecent } from "./manage-hub-read";

const counts = () => ({ instructors: 7, instructorsHidden: 1, crew: 3, crewHidden: 0, works: 8, worksHidden: 0, rooms: 4, lobbies: 1 });
const recent = (fields = {}) => ({ _id: "document", _type: "crew", _updatedAt: "2026-10-28T00:00:00Z", title: "크루", ...fields });
describe("허브 현황", () => {
    it.each([undefined, null, [], "wrong", 1])("객체가 아닌 응답 #%#은 현황으로 표시하지 않는다", (raw) => expect(readHubCounts(raw)).toBeNull());
    it.each(Object.keys(counts()))("%s 누락·문자열·음수·소수는 0으로 대체하지 않는다", (field) => {
        for (const value of [undefined, null, "3", {}, -1, 0.5, Infinity, NaN]) expect(readHubCounts({ ...counts(), [field]: value })).toBeNull();
    });
    it.each(["instructorsHidden", "crewHidden", "worksHidden"])("전체보다 많은 %s는 표시하지 않는다", (field) => expect(readHubCounts({ ...counts(), [field]: 99 })).toBeNull());
    it("실제 모든 0은 정상 현황이다", () => expect(readHubCounts(Object.fromEntries(Object.keys(counts()).map((field) => [field, 0])))).not.toBeNull());
    it("알 수 없는 필드를 화면 데이터에 반환하지 않는다", () => {
        const raw = { ...counts(), privateValue: "PRIVATE" }; const before = JSON.stringify(raw);
        expect(readHubCounts(raw)).toEqual(counts()); expect(JSON.stringify(raw)).toBe(before);
    });
});
describe("허브 최근 수정", () => {
    it.each([undefined, null, {}, "wrong", 1])("목록이 아닌 응답 #%#은 빈 목록과 구분한다", (raw) => expect(readHubRecent(raw)).toBeNull());
    it.each([null, undefined, [], "wrong", 1])("잘못된 행 #%#을 조용히 빼지 않는다", (row) => expect(readHubRecent([recent(), row])).toBeNull());
    it.each([undefined, null, "", "drafts.document", "versions.release.document", "bad/path", "bad..id", {}, 1])("잘못된 ID #%#로 수정 링크를 만들지 않는다", (_id) => expect(readHubRecent([recent({ _id })])).toBeNull());
    it.each([undefined, null, "", "__proto__", "constructor", "toString", "unknown", {}, 1])("지원하지 않는 종류 #%#는 객체 기본 속성으로 해석하지 않는다", (_type) => expect(readHubRecent([recent({ _type })])).toBeNull());
    it.each([undefined, null, "", "bad-time", {}, 1])("잘못된 수정 시각 #%#를 포맷 함수에 넘기지 않는다", (_updatedAt) => expect(readHubRecent([recent({ _updatedAt })])).toBeNull());
    it.each([{}, 1, [], false])("제목 자료형 #%#을 문자열로 바꾸지 않는다", (title) => expect(readHubRecent([recent({ title })])).toBeNull());
    it("실제 빈 목록과 누락 제목은 기존 빈 상태·라벨 대체 규칙을 따른다", () => {
        expect(readHubRecent([])).toEqual([]);
        for (const title of [undefined, null, ""]) expect(readHubRecent([recent({ title })])).not.toBeNull();
    });
    it.each(Object.entries(HUB_RECENT_META))("%s 종류의 정상 ID와 링크는 유지한다", (_type, meta) => {
        const _id = meta.fixedId ?? "document";
        expect(readHubRecent([recent({ _id, _type })])).toHaveLength(1); expect(meta.href(_id)).toMatch(/^\/manage\//);
        if (meta.fixedId) expect(readHubRecent([recent({ _id: "other", _type })])).toBeNull();
    });
    it("중복 ID가 있으면 최근 목록을 부분 표시하지 않는다", () => expect(readHubRecent([recent(), recent()])).toBeNull());
    it("원본을 수정하거나 추가 원본 필드를 반환하지 않는다", () => {
        const raw = [recent({ privateValue: { secret: "PRIVATE" } })]; const before = JSON.stringify(raw);
        expect(readHubRecent(raw)).toEqual([recent()]); expect(JSON.stringify(raw)).toBe(before);
    });
});
