import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moveInstructorOrder, reorderInstructors } from "./instructors/actions";
import { moveCrewOrder, reorderCrew } from "./crew/actions";
import { moveSpaceOrder, reorderSpaces } from "./studio/actions";

const { client, auth, invalidate, tag } = vi.hoisted(() => ({
    client: { fetch: vi.fn(), getDocument: vi.fn(), transaction: vi.fn() },
    auth: vi.fn(), invalidate: vi.fn(), tag: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: tag, revalidatePath: invalidate }));
const rows = () => ["a", "b", "c"].map((_id, index) => ({ _id, _rev: `r-${_id}`, order: index + 1, group: "room" }));
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue(undefined);
    client.getDocument.mockResolvedValue({ _id: "a", _type: "studioSpace", _rev: "r-a", kind: "room" });
    client.fetch.mockImplementation(async () => rows());
    client.transaction.mockImplementation(() => { throw new Error("검증 실패 뒤 트랜잭션을 만들면 안 됩니다."); });
});
afterEach(() => vi.restoreAllMocks());

const paths = [
    { name: "강사 화살표", run: () => moveInstructorOrder("a", "down") },
    { name: "강사 드래그", run: () => reorderInstructors(["b", "a", "c"]) },
    { name: "Crew 화살표", run: () => moveCrewOrder("a", "down") },
    { name: "Crew 드래그", run: () => reorderCrew(["b", "a", "c"]) },
    { name: "공간 화살표", run: () => moveSpaceOrder("a", "down") },
    { name: "공간 드래그", run: () => reorderSpaces(["b", "a", "c"]) },
];
describe.each(paths)("$name 조회 목록 경계", ({ run }) => {
    it.each([
        { name: "null", make: () => null },
        { name: "빈 슬롯", make: () => [rows()[0], , rows()[2]] },
        { name: "중복 ID", make: () => [rows()[0], rows()[0], rows()[2]] },
        { name: "공백 버전", make: () => [{ ...rows()[0], _rev: " \t" }, ...rows().slice(1)] },
        { name: "문자열 순서", make: () => [{ ...rows()[0], order: "1" }, ...rows().slice(1)] },
        { name: "배열 행", make: () => [Object.assign([], rows()[0]), ...rows().slice(1)] },
    ])("$name 응답은 쓰기·성공·캐시 갱신 없이 거부한다", async ({ make }) => {
        const source = make(); client.fetch.mockResolvedValue(source);
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("목록의 문서 정보") });
        expect(auth).toHaveBeenCalledTimes(1); expect(client.fetch).toHaveBeenCalledTimes(1);
        expect(client.transaction).not.toHaveBeenCalled(); expect(tag).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
    });
});

describe.each([
    { name: "강사", reorder: reorderInstructors }, { name: "Crew", reorder: reorderCrew }, { name: "공간", reorder: reorderSpaces },
])("$name 드래그 입력 경계", ({ reorder }) => {
    it.each([{ value: null }, { value: [, "a", "c"] }, { value: ["a", "a", "c"] }])("잘못된 입력 #%#은 인증 후 조회 전에 거부한다", async ({ value }) => {
        expect(await reorder(value as string[])).toMatchObject({ ok: false, error: expect.any(String) });
        expect(auth).toHaveBeenCalledTimes(1); expect(client.fetch).not.toHaveBeenCalled();
        expect(client.transaction).not.toHaveBeenCalled(); expect(tag).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
    });
});
