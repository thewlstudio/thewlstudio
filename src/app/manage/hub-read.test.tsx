import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Hub from "./page";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("./ManageNav", () => ({ default: () => <nav>관리 허브</nav> }));
vi.mock("./FirstTimeGuide", () => ({ default: () => null }));
vi.mock("./_components/checklist/SetupChecklist", () => ({ default: () => null }));
const validCounts = () => ({ instructors: 7, instructorsHidden: 1, crew: 3, crewHidden: 0, works: 8, rooms: 4, lobbies: 1 });
const record = () => ({ _id: "document", _type: "crew", _updatedAt: "2026-10-28T00:00:00Z", title: "최근 수정 크루" });
let recent: unknown;
let counts: unknown;
beforeEach(() => {
    vi.clearAllMocks(); recent = [record()]; counts = validCounts();
    fetch.mockImplementation(async (query: string) => {
        const result = query.includes('"instructors": count(') ? counts : recent;
        if (result instanceof Error) throw result;
        return result;
    });
});
const html = async () => renderToStaticMarkup(await Hub());
describe("허브 보조 데이터 읽기", () => {
    it("정상 현황과 최근 수정·관리 이동을 유지한다", async () => {
        const result = await html(); expect(result).toContain("7명 · 비공개 1"); expect(result).toContain("최근 수정 크루");
        expect(result).toContain("/manage/crew/document"); expect(result).not.toContain('role="status"');
    });
    it.each([undefined, null, {}, [], { ...validCounts(), instructors: "PRIVATE_DO_NOT_RENDER" }, { ...validCounts(), crewHidden: 4 }, new Error("PRIVATE_DO_NOT_RENDER")])("현황 오류 #%#는 가짜 건수 대신 안내하고 이동은 유지한다", async (value) => {
        counts = value; const result = await html(); expect(result).toContain("등록 현황을 불러오지 못했어요");
        expect(result).not.toContain("PRIVATE_DO_NOT_RENDER"); expect(result).toContain("최근 수정 크루"); expect(result).toContain('href="/manage/crew"');
    });
    it.each([undefined, null, {}, [null], [{ ...record(), title: {} }], [{ ...record(), _updatedAt: "bad-date" }], [{ ...record(), _type: "constructor" }], [record(), record()], new Error("PRIVATE_DO_NOT_RENDER")])("최근 수정 오류 #%#는 허브 전체를 깨뜨리지 않는다", async (value) => {
        recent = value; const result = await html(); expect(result).toContain("최근 수정 목록을 불러오지 못했어요");
        expect(result).toContain("7명 · 비공개 1"); expect(result).not.toContain("PRIVATE_DO_NOT_RENDER"); expect(result).toContain('href="/manage/works"');
    });
    it("실제 빈 최근 수정은 실패로 표시하지 않는다", async () => {
        recent = []; const result = await html(); expect(result).not.toContain("최근 수정 목록을 불러오지 못했어요"); expect(result).not.toContain('data-tour="hub-recent"');
    });
    it("고정 설정 문서는 맞는 ID일 때만 최근 수정 링크로 쓴다", async () => {
        recent = [{ ...record(), _id: "siteSettings", _type: "siteSettings", title: null }]; expect(await html()).toContain("연락처·링크·홈페이지 소개");
        recent = [{ ...record(), _id: "other", _type: "siteSettings" }]; expect(await html()).toContain("최근 수정 목록을 불러오지 못했어요");
    });
});
