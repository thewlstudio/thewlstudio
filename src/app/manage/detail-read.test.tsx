import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstructorPage from "./instructors/[id]/page";
import CrewPage from "./crew/[id]/page";
import WorkPage from "./works/[id]/page";
import SpacePage from "./studio/[id]/page";

const { fetch, notFound } = vi.hoisted(() => ({ fetch: vi.fn(), notFound: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/writeClient", () => ({ isWriteConfigured: () => true }));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), notFound }));
vi.mock("./ManageNav", () => ({ default: () => <nav>관리 내비게이션</nav> }));
vi.mock("./_components/UpdatedAt", () => ({ default: () => null }));
vi.mock("./instructors/[id]/InstructorForm", () => ({ default: () => <form data-edit-form /> }));
vi.mock("./crew/[id]/CrewForm", () => ({ default: () => <form data-edit-form /> }));
vi.mock("./works/[id]/WorkForm", () => ({ default: () => <form data-edit-form /> }));
vi.mock("./studio/[id]/SpaceForm", () => ({ default: () => <form data-edit-form /> }));
vi.mock("./instructors/[id]/DeleteInstructorButton", () => ({ default: () => <button data-destructive>삭제</button> }));
vi.mock("./instructors/[id]/DuplicateInstructorButton", () => ({ default: () => <button data-destructive>복사</button> }));
vi.mock("./crew/[id]/DeleteCrewButton", () => ({ default: () => <button data-destructive>삭제</button> }));
vi.mock("./works/[id]/DeleteWorkButton", () => ({ default: () => <button data-destructive>삭제</button> }));
vi.mock("./studio/[id]/DeleteSpaceButton", () => ({ default: () => <button data-destructive>삭제</button> }));
vi.mock("./_components/RestoreButton", () => ({ default: () => <button data-destructive>복원</button> }));

type Raw = Record<string, unknown>;
const params = () => ({ params: Promise.resolve({ id: "document" }) });
const cases = [
    { type: "instructor", page: InstructorPage, broken: { about: ["문장", { privateValue: "PRIVATE_DO_NOT_RENDER" }] } },
    { type: "crew", page: CrewPage, broken: { sections: [{ _key: "s", _type: "aboutSection", text: 123 }] } },
    { type: "work", page: WorkPage, broken: { contentBlocks: [{ _key: "b", _type: "descriptionBlock", paragraphs: [1] }] } },
    { type: "studioSpace", page: SpacePage, broken: { images: [{ url: "/photo.jpg" }] } },
];
beforeEach(() => { vi.resetAllMocks(); notFound.mockImplementation(() => { throw new Error("test not found"); }); });
afterEach(() => vi.restoreAllMocks());
describe.each(cases)("$type 상세 원본 읽기", ({ type, page, broken }) => {
    const valid = (): Raw => ({ _id: "document", _type: type, _rev: "v1" });
    it("선택 필드가 없던 예전 정상 문서는 계속 편집한다", async () => {
        fetch.mockResolvedValue(valid()); expect(renderToStaticMarkup(await page(params()))).toContain("data-edit-form");
    });
    it("잘못된 원본은 폼과 변경 버튼을 열지 않고 원본 확인을 안내한다", async () => {
        const raw = { ...valid(), ...broken }; const before = JSON.stringify(raw); fetch.mockResolvedValue(raw);
        const html = renderToStaticMarkup(await page(params()));
        expect(html).not.toContain("data-edit-form"); expect(html).not.toContain("data-destructive");
        expect(html).toContain("안전하게 읽지 못했어요"); expect(html).not.toContain("PRIVATE_DO_NOT_RENDER");
        expect(JSON.stringify(raw)).toBe(before);
    });
    it.each(["_id", "_type", "_rev"])("문서 식별/버전 %s 오류도 폼을 열지 않는다", async (field) => {
        const raw = { ...valid(), [field]: field === "_rev" ? "" : "wrong" }; fetch.mockResolvedValue(raw);
        expect(renderToStaticMarkup(await page(params()))).not.toContain("data-edit-form");
    });
    it("조회 예외를 기본값 폼으로 바꾸지 않는다", async () => {
        const failure = new Error("test read failure"); fetch.mockRejectedValue(failure);
        await expect(page(params())).rejects.toBe(failure);
    });
    it("명시적 null은 기존 404 처리로 전달한다", async () => {
        fetch.mockResolvedValue(null); await expect(page(params())).rejects.toThrow("test not found"); expect(notFound).toHaveBeenCalledTimes(1);
    });
});
