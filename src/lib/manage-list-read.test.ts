import { describe, expect, it } from "vitest";
import { listReadIssue } from "./manage-list-read";
import type { DetailDocumentType } from "./manage-detail-read";

const types: DetailDocumentType[] = ["instructor", "crew", "work", "studioSpace"];
describe.each(types)("%s 목록 원본 검사", (type) => {
    const row = (fields = {}) => ({ _id: "document", _type: type, ...fields });
    const issue = (fields = {}, trash = false) => listReadIssue(type, [row(fields)], 0, trash);
    it("명시적 빈 배열과 정상 예전 문서의 누락 선택 값은 허용한다", () => {
        expect(listReadIssue(type, [], 0, false)).toBeNull(); expect(listReadIssue(type, [], 0, true)).toBeNull(); expect(issue()).toBeNull();
    });
    it.each([undefined, null, false, 1, "not-an-array", {}])("목록이 아닌 응답 #%#을 차단한다", (rows) => expect(listReadIssue(type, rows, 0, false)).not.toBeNull());
    it.each([undefined, null, false, 1, "not-a-row", []])("행이 아닌 값 #%#을 차단한다", (value) => expect(listReadIssue(type, [row(), value], 0, false)).not.toBeNull());
    it.each([undefined, null, "", "drafts.document", "versions.release.document", "bad/path", "bad..id", {}, 1])("잘못된 변경 대상 ID #%#을 차단한다", (_id) => expect(issue({ _id })).not.toBeNull());
    it.each([undefined, null, "wrong", 1])("문서 종류가 잘못된 행 #%#을 차단한다", (_type) => expect(issue({ _type })).not.toBeNull());
    it("중복 ID나 배열의 빈 칸을 필터링해 통과시키지 않는다", () => {
        expect(listReadIssue(type, [row(), row()], 0, false)).not.toBeNull(); expect(listReadIssue(type, Array(1), 0, false)).not.toBeNull();
    });
    it.each([undefined, null, "3", {}, [], -1, 1.5, NaN, Infinity])("잘못된 휴지통 개수 #%#을 출력하지 않는다", (count) => expect(listReadIssue(type, [], count, false)).not.toBeNull());
    it("개수의 0과 양의 정수는 허용한다", () => {
        expect(listReadIssue(type, [row()], 0, false)).toBeNull(); expect(listReadIssue(type, [row()], 3, false)).toBeNull();
    });
    it.each(["false", 0, [], {}])("문자열 등으로 저장된 휴지통 상태 #%#을 해석하지 않는다", (trashed) => expect(issue({ trashed })).not.toBeNull());
    it("두 보기의 실제 휴지통 상태를 구분한다", () => {
        expect(issue({ trashed: true })).not.toBeNull(); expect(issue({ trashed: false }, true)).not.toBeNull(); expect(issue({}, true)).not.toBeNull();
        expect(issue({ trashed: true }, true)).toBeNull(); expect(issue({ trashed: false })).toBeNull(); expect(issue({ trashed: null })).toBeNull();
    });
    it("시각의 잘못된 자료형은 차단하되 날짜 문자열의 의미를 새로 강제하지 않는다", () => {
        expect(issue({ _updatedAt: {} })).not.toBeNull(); expect(issue({ _updatedAt: "not-a-date" })).toBeNull();
    });
    it("잘못된 원본을 수정하거나 안내 값으로 반환하지 않는다", () => {
        const raw = [row({ _id: "PRIVATE_DO_NOT_RENDER", trashed: { secret: "PRIVATE_DO_NOT_RENDER" } })];
        const original = JSON.stringify(raw); const result = listReadIssue(type, raw, -1, false);
        expect(JSON.stringify(raw)).toBe(original); expect(JSON.stringify(result)).not.toContain("PRIVATE_DO_NOT_RENDER");
        expect(new Set(result!.fields).size).toBe(result!.fields.length);
    });
});

describe("목록의 표시 필드와 기존 규칙", () => {
    it.each([
        ["instructor", "instructorName"], ["instructor", "category"],
        ["crew", "name"], ["crew", "koName"], ["crew", "role"],
        ["work", "title"], ["work", "artist"], ["work", "releaseDate"],
        ["studioSpace", "name"], ["studioSpace", "kind"],
    ] as const)("%s %s 객체를 문자열로 강제 변환하지 않는다", (type, field) => {
        for (const value of [{}, 1, [], false]) expect(listReadIssue(type, [{ _id: "document", _type: type, [field]: value }], 0, false)).not.toBeNull();
        for (const value of [null, undefined, "", "새 값"]) expect(listReadIssue(type, [{ _id: "document", _type: type, [field]: value }], 0, false)).toBeNull();
    });
    it.each(["instructor", "crew", "studioSpace"] as const)("%s 공개 상태와 순서 값은 기존 자료형을 따른다", (type) => {
        const row = { _id: "document", _type: type };
        for (const isActive of ["false", 1, {}, []]) expect(listReadIssue(type, [{ ...row, isActive }], 0, false)).not.toBeNull();
        for (const order of ["1", {}, NaN, Infinity]) expect(listReadIssue(type, [{ ...row, order }], 0, false)).not.toBeNull();
        for (const order of [null, undefined, 0, -2, 1.5]) expect(listReadIssue(type, [{ ...row, isActive: false, order }], 0, false)).toBeNull();
    });
    it("작업물에는 사용하지 않는 공개 상태·수동 순서 규칙을 추가하지 않는다", () => {
        expect(listReadIssue("work", [{ _id: "document", _type: "work", order: {}, isActive: {} }], 0, false)).toBeNull();
    });
    it.each([{}, "1", -1, 1.5, NaN, Infinity])("공간 사진 개수 #%#은 숫자로 변환해 표시하지 않는다", (photoCount) => {
        expect(listReadIssue("studioSpace", [{ _id: "document", _type: "studioSpace", photoCount }], 0, false)).not.toBeNull();
    });
    it("사진 없는 예전 공간의 null 개수와 0은 기존 빈 값 표시를 유지한다", () => {
        for (const photoCount of [undefined, null, 0, 3]) expect(listReadIssue("studioSpace", [{ _id: "document", _type: "studioSpace", photoCount }], 0, false)).toBeNull();
    });
    it("사진 원본은 별도 미리보기 경계에서 처리하며 목록 대상을 바꾸지 않는다", () => {
        expect(listReadIssue("instructor", [{ _id: "document", _type: "instructor", image: { invalid: true } }], 0, false)).toBeNull();
    });
});
