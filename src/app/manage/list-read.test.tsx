import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InstructorPage from "./instructors/page";
import CrewPage from "./crew/page";
import WorkPage from "./works/page";
import SpacePage from "./studio/page";
import type { ManagedItem } from "./_components/ManagedList";

const { fetch, writable } = vi.hoisted(() => ({ fetch: vi.fn(), writable: { value: true } }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/writeClient", () => ({ isWriteConfigured: () => writable.value }));
vi.mock("./ManageNav", () => ({ default: () => <nav>관리 내비게이션</nav> }));
vi.mock("./_components/ManagedList", () => ({
    default: ({ items, reorder }: { items: ManagedItem[]; reorder?: unknown }) => <ul data-managed-list data-reorder={!!reorder}>{items.map((item) => <li key={item.id} data-status={item.status} data-group={item.group} data-search={item.search}>{item.node}</li>)}</ul>,
    DragHandle: () => <span data-change-control>끌기</span>,
}));
vi.mock("./_components/ReorderButtons", () => ({ default: () => <button data-change-control>순서</button> }));
vi.mock("./_components/RestoreButton", () => ({ default: () => <button data-change-control>복원</button> }));
vi.mock("@/components/CmsImage", () => ({ default: ({ src }: { src: string }) => <span data-thumbnail-src={src} /> }));

const cases = [
    { type: "instructor", path: "instructors", page: InstructorPage, title: "정상 강사", fields: { instructorName: "정상 강사", category: "보컬" }, text: "instructorName", image: "image" },
    { type: "crew", path: "crew", page: CrewPage, title: "정상 크루", fields: { name: "CREW", koName: "정상 크루", role: "프로듀서" }, text: "koName", image: "image" },
    { type: "work", path: "works", page: WorkPage, title: "정상 작업물", fields: { title: "정상 작업물", artist: "아티스트", releaseDate: "2026. 10. 28." }, text: "title", image: "coverImage" },
    { type: "studioSpace", path: "studio", page: SpacePage, title: "정상 공간", fields: { name: "정상 공간", kind: "room", photoCount: 2 }, text: "name", image: "cover" },
];
let rows: unknown;
let count: unknown;
const params = (trash = false) => ({ searchParams: Promise.resolve(trash ? { view: "trash" } : {}) });
beforeEach(() => {
    vi.clearAllMocks(); writable.value = true; rows = []; count = 0;
    fetch.mockImplementation(async (query: string) => query.startsWith("count(") ? count : rows);
});

describe.each(cases)("$type 목록 원본 읽기", ({ type, path, page, title, fields, text, image }) => {
    const row = (trash = false) => ({ _id: "document", _type: type, _updatedAt: "2026-10-28T00:00:00Z", trashed: trash, ...fields });
    const html = async (trash = false) => renderToStaticMarkup(await page(params(trash)));
    const blocked = async (trash = false) => {
        const output = await html(trash);
        expect(output).toContain("목록을 안전하게 읽지 못했어요");
        expect(output).not.toContain("data-managed-list"); expect(output).not.toContain("data-change-control");
        expect(output).not.toContain('data-tour="list-new"'); expect(output).not.toContain("PRIVATE_DO_NOT_RENDER");
    };
    it("정상 목록의 표시·상세 링크를 유지한다", async () => {
        rows = [row()]; const output = await html();
        expect(output).toContain(title); expect(output).toContain(`/manage/${path}/document`);
        expect(output).toContain("data-managed-list"); expect(output).not.toContain('role="alert"');
    });
    it("명시적 빈 목록만 정상 빈 상태로 표시한다", async () => {
        expect(await html()).toContain("아직 등록된");
        expect(await html(true)).toContain("휴지통이 비어 있어요");
    });
    it.each([undefined, null, {}, "not-an-array"])("목록이 아닌 응답 #%#을 빈 목록으로 바꾸지 않는다", async (value) => { rows = value; await blocked(); });
    it("이름 객체가 목록 전체의 렌더 오류가 되지 않는다", async () => {
        rows = [row(), { ...row(), _id: "another", [text]: { privateValue: "PRIVATE_DO_NOT_RENDER" } }]; await blocked();
    });
    it("중복 ID로 행과 변경 대상이 섞이지 않는다", async () => { rows = [row(), row()]; await blocked(); });
    it("ID 없는 행을 필터링해 정상 목록처럼 보이지 않는다", async () => { rows = [{ ...row(), _id: undefined }]; await blocked(); });
    it("다른 종류의 문서를 표시하지 않는다", async () => { rows = [{ ...row(), _type: "wrong" }]; await blocked(); });
    it("잘못된 휴지통 자료형을 공개 상태로 간주하지 않는다", async () => { rows = [{ ...row(), trashed: "false" }]; await blocked(); });
    it("일반 목록에 섞인 휴지통 문서를 정렬 대상으로 보내지 않는다", async () => { rows = [row(true)]; await blocked(); });
    it("휴지통에서 실제 삭제 상태가 아닌 문서를 복원하지 않는다", async () => { rows = [row()]; await blocked(true); });
    it.each(["PRIVATE_DO_NOT_RENDER", {}, -1, 0.5])("잘못된 휴지통 개수 #%#을 그대로 출력하지 않는다", async (value) => { rows = [row()]; count = value; await blocked(); });
    it("실제 휴지통에서는 복원 버튼을 유지하고 개수를 재조회하지 않는다", async () => {
        rows = [row(true)]; const output = await html(true);
        expect(output).toContain("복원"); expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("쓰기 설정이 없으면 정상 목록을 읽되 변경 버튼은 표시하지 않는다", async () => {
        writable.value = false; rows = [row()]; const output = await html();
        expect(output).toContain(title); expect(output).not.toContain("data-change-control"); expect(output).toContain('data-reorder="false"');
    });
    it("손상된 사진 참조 하나가 목록을 막지 않는다", async () => {
        rows = [{ ...row(), [image]: { asset: { _ref: "not-an-image" } } }];
        const output = await html(); expect(output).toContain(title); expect(output).not.toContain('role="alert"'); expect(output).not.toContain("data-thumbnail-src");
    });
    it("정상 사진은 기존 56px 썸네일로 만든다", async () => {
        rows = [{ ...row(), [image]: { _type: "image", asset: { _ref: "image-abcdef-300x400-jpg" } } }];
        const output = decodeURIComponent(await html()); expect(output).toContain("abcdef-300x400.jpg"); expect(output).toContain("w=112"); expect(output).toContain("h=112");
    });
    it("조회 예외를 기본값 목록으로 바꾸지 않는다", async () => {
        const error = new Error("test read failure"); fetch.mockRejectedValue(error); await expect(page(params())).rejects.toBe(error);
    });
    it("원본을 확인할 상태·정렬 필드를 두 보기 모두 조회한다", async () => {
        rows = [row()]; await html();
        expect(fetch.mock.calls[0][0]).toContain("_type"); expect(fetch.mock.calls[0][0]).toContain("trashed");
        fetch.mockClear(); rows = [row(true)]; await html(true);
        const query = fetch.mock.calls[0][0] as string;
        expect(query.split("{").at(-1)).toContain("_type"); expect(query.split("{").at(-1)).toContain("trashed");
        if (type !== "work") { expect(query.split("{").at(-1)).toContain("isActive"); expect(query.split("{").at(-1)).toContain("order"); }
    });
});
