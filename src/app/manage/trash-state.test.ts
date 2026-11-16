import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteInstructor, restoreInstructor } from "./instructors/actions";
import { deleteCrew, restoreCrew } from "./crew/actions";
import { deleteWork, restoreWork } from "./works/actions";
import { deleteSpace, restoreSpace } from "./studio/actions";

type Raw = Record<string, unknown>;
const { client, patch, auth, tag, invalidate } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), commit: vi.fn() },
    auth: vi.fn(), tag: vi.fn(), invalidate: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: tag, revalidatePath: invalidate }));
let source: Raw;
let changes: Raw;
beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue(undefined); changes = {};
    client.getDocument.mockImplementation(async () => source);
    client.patch.mockReturnValue(patch); patch.ifRevisionId.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { changes = fields; return patch; });
    patch.commit.mockImplementation(async () => ({ ...source, ...changes, _rev: "new-revision" }));
});
afterEach(() => vi.restoreAllMocks());

const paths = [
    { type: "instructor", remove: deleteInstructor, restore: restoreInstructor },
    { type: "crew", remove: deleteCrew, restore: restoreCrew },
    { type: "work", remove: deleteWork, restore: restoreWork },
    { type: "studioSpace", remove: deleteSpace, restore: restoreSpace },
].flatMap(({ type, remove, restore }) => [
    { type, action: "삭제", run: remove, trashed: true },
    { type, action: "복원", run: restore, trashed: false },
]);
const inherit = (doc: Raw, key: string) => {
    const own = { ...doc }; delete own[key]; return Object.assign(Object.create({ [key]: doc[key] }), own);
};
describe.each(paths)("$type $action 대상 상태", ({ type, run, trashed }) => {
    beforeEach(() => { source = { _id: "item", _type: type, _rev: "original-revision", trashed: !trashed, isActive: false, order: 7, slug: { current: "slug" }, extra: { preserve: true } }; });
    it.each([
        { name: "공백 버전", make: (doc: Raw) => ({ ...doc, _rev: " \t\n" }) },
        { name: "배열 문서", make: (doc: Raw) => Object.assign([], doc) },
        { name: "상속 ID", make: (doc: Raw) => inherit(doc, "_id") },
        { name: "상속 종류", make: (doc: Raw) => inherit(doc, "_type") },
        { name: "상속 버전", make: (doc: Raw) => inherit(doc, "_rev") },
        { name: "문자열 휴지통 상태", make: (doc: Raw) => ({ ...doc, trashed: "false" }) },
        { name: "객체 휴지통 상태", make: (doc: Raw) => ({ ...doc, trashed: { private: "DO_NOT_ECHO" } }) },
        { name: "상속 휴지통 상태", make: (doc: Raw) => inherit(doc, "trashed") },
    ])("$name 원본은 패치 전에 거부한다", async ({ make }) => {
        client.getDocument.mockResolvedValue(make(source));
        const result = await run("item");
        expect(result).toMatchObject({ ok: false, error: expect.any(String) }); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO");
        expect(client.getDocument).toHaveBeenCalledExactlyOnceWith("item"); expect(client.patch).not.toHaveBeenCalled();
        expect(tag).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
    });
    it.each([undefined, null, false, true])("정상 휴지통 상태 #%#에서 해당 플래그만 수정한다", async (before) => {
        if (before === undefined) delete source.trashed; else source.trashed = before;
        const original = structuredClone(source);
        expect(await run("item")).toEqual({ ok: true });
        expect(source).toEqual(original); expect(changes).toEqual({ trashed });
        expect(patch.ifRevisionId).toHaveBeenCalledExactlyOnceWith("original-revision"); expect(patch.commit).toHaveBeenCalledTimes(1);
        expect(client.getDocument).toHaveBeenCalledTimes(1); expect(tag).toHaveBeenCalledExactlyOnceWith(type);
        // 공개 상태·순서·본문은 패치에 넣지 않으며, 같은 상태로의 반복 요청도 허용한다.
    });
    it("조회 후 다른 요청이 바꾸면 확인한 버전으로 충돌을 받고 재시도하지 않는다", async () => {
        patch.commit.mockRejectedValue({ statusCode: 409 });
        expect(await run("item")).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") });
        expect(patch.ifRevisionId).toHaveBeenCalledExactlyOnceWith("original-revision");
        expect(patch.commit).toHaveBeenCalledTimes(1); expect(client.getDocument).toHaveBeenCalledTimes(1); expect(tag).not.toHaveBeenCalled();
    });
});
