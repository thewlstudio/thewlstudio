import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moveInstructorOrder, reorderInstructors } from "./instructors/actions";
import { moveCrewOrder, reorderCrew } from "./crew/actions";
import { moveSpaceOrder, reorderSpaces } from "./studio/actions";
import { updateTag, revalidatePath } from "next/cache";

const { client, state } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), fetch: vi.fn(), transaction: vi.fn() },
    state: { reply: undefined as unknown, useGood: true, error: undefined as unknown, commits: 0, patches: [] as string[], rows: [] as { _id: string; _rev: string; order: number; group: string }[] },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
const good = (ids = ["b", "a"], operation = "update") => ({ transactionId: "tx-ok", documentIds: ids, results: ids.map((id) => ({ id, operation })) });
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    state.rows = ["a", "b", "c"].map((_id, i) => ({ _id, _rev: `r-${_id}`, order: i + 1, group: "room" })); state.commits = 0; state.patches = []; state.reply = undefined; state.useGood = true; state.error = undefined;
    client.fetch.mockImplementation(async () => structuredClone(state.rows)); client.getDocument.mockResolvedValue({ _id: "a", _type: "studioSpace", _rev: "r-a", kind: "room" });
    client.transaction.mockImplementation(() => {
        const writes: { id: string; order: number }[] = [];
        const tx = {
            patch: (id: string, value: { set: { order: number } }) => { state.patches.push(id); writes.push({ id, order: value.set.order }); return tx; },
            commit: async () => {
                state.commits++; if (state.error) throw state.error;
                for (const write of writes) state.rows.find((row) => row._id === write.id)!.order = write.order;
                return state.useGood ? good(writes.map((write) => write.id)) : state.reply;
            },
        }; return tx;
    });
});
afterEach(() => vi.restoreAllMocks());
const paths = [
    { name: "강사 화살표", run: () => moveInstructorOrder("a", "down") }, { name: "강사 드래그", run: () => reorderInstructors(["b", "a", "c"]) },
    { name: "Crew 화살표", run: () => moveCrewOrder("a", "down") }, { name: "Crew 드래그", run: () => reorderCrew(["b", "a", "c"]) },
    { name: "공간 화살표", run: () => moveSpaceOrder("a", "down") }, { name: "공간 드래그", run: () => reorderSpaces(["b", "a", "c"]) },
];
const invalid = [undefined, null, {}, [], { ...good(), transactionId: "" }, { ...good(), documentIds: ["a"] }, good(["b", "a", "c"]), good(["a", "a"]), { ...good(), results: [] }, { ...good(), results: [{ id: "b", operation: "delete" }, { id: "a", operation: "update" }] }, { ...good(), results: [{ id: "b", operation: "update" }, { id: "x", operation: "update" }] }, { ...good(), documentIds: ["a", "b"] }];
describe.each(paths)("$name 트랜잭션 결과", ({ run }) => {
    it.each(invalid.map((value) => ({ value })))("잘못된 응답 #%#는 성공·캐시 갱신하지 않는다", async ({ value }) => {
        state.useGood = false; state.reply = value;
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("결과") });
        expect(state.commits).toBe(1); expect(updateTag).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
        // 서버가 이미 반영했을 수 있다. 되돌리는 추가 트랜잭션을 보내지 않는다.
        expect(state.rows.find((row) => row._id === "b")!.order).toBe(1);
    });
    it("정상 응답은 변경한 두 항목만 확인하고 성공한다", async () => {
        expect(await run()).toEqual({ ok: true }); expect(state.patches).toEqual(["b", "a"]); expect(state.commits).toBe(1); expect(updateTag).toHaveBeenCalledTimes(1);
    });
    it("none 작업 응답도 식별 목록이 일치하면 허용한다", async () => {
        state.useGood = false; state.reply = good(["b", "a"], "none"); expect(await run()).toEqual({ ok: true });
    });
    it("요청 예외는 원문 대신 결과 확인 안내를 반환하며 재시도하지 않는다", async () => {
        state.error = new Error("DO_NOT_ECHO"); const result = await run();
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("결과") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(state.commits).toBe(1); expect(updateTag).not.toHaveBeenCalled();
    });
    it("저장 뒤 캐시 실패는 순서 변경 완료를 구분한다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); }); const result = await run();
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("순서 변경은 완료") }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(state.commits).toBe(1);
    });
    it("409 충돌 때는 기존 안내와 무변경을 유지한다", async () => {
        const before = structuredClone(state.rows); state.error = { statusCode: 409 };
        expect(await run()).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") }); expect(state.rows).toEqual(before); expect(updateTag).not.toHaveBeenCalled();
    });
});
describe.each([reorderInstructors, reorderCrew, reorderSpaces])("무변경 드래그", (run) => {
    it("실제 쓸 항목이 없으면 트랜잭션 응답을 요구하지 않는다", async () => {
        expect(await run(["a", "b", "c"])).toEqual({ ok: true }); expect(state.commits).toBe(0); expect(state.patches).toEqual([]);
    });
    it("무변경 뒤 갱신 실패를 변경 완료로 안내하지 않는다", async () => {
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        const result = await run(["a", "b", "c"]); expect(result).toMatchObject({ ok: false, error: expect.stringContaining("변경하지 않았지만") }); expect(state.commits).toBe(0);
    });
});
