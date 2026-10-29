import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "./[area]/[id]/page";

const { store, request, getDocument, getClient, configured } = vi.hoisted(() => ({
    store: { current: {} as Record<string, unknown>, revisions: [] as { id: string; timestamp: string }[], snapshots: new Map<string, Record<string, unknown>>(), failed: new Set<string>(), malformed: false },
    request: vi.fn(), getDocument: vi.fn(), getClient: vi.fn(), configured: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: getClient, isWriteConfigured: configured }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("LOGIN"); } }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("../ManageNav", () => ({ default: () => <nav>관리 탐색</nav> }));
vi.mock("./RestoreRevisionButton", () => ({ default: ({ expectedRevision }: { expectedRevision: string }) => <button data-restore data-version={expectedRevision}>복원</button> }));
const latest = "2026-10-22T12:00:00Z";
const older = "2026-10-21T12:00:00Z";
async function page(area = "crew", id = "crew-1", at = older) {
    return HistoryPage({ params: Promise.resolve({ area, id }), searchParams: Promise.resolve({ at }) });
}
async function html(at = older) { return renderToStaticMarkup(await page("crew", "crew-1", at)); }

beforeEach(() => {
    vi.resetAllMocks();
    configured.mockReturnValue(true);
    store.current = { _id: "crew-1", _type: "crew", _rev: "r2", name: "현재 이름" };
    store.revisions = [{ id: "r2", timestamp: latest }, { id: "r1", timestamp: older }];
    store.snapshots = new Map([[latest, { ...store.current }], [older, { ...store.current, _rev: "r1", name: "옛 이름" }]]);
    store.failed = new Set();
    store.malformed = false;
    request.mockImplementation(async ({ uri, query }: { uri: string; query: { time?: string } }) => {
        if (uri.includes("/transactions/")) return store.malformed ? "bad response" : store.revisions.map((r) => JSON.stringify(r)).join("\n");
        if (store.failed.has(query.time!)) throw new Error("snapshot unavailable");
        const doc = store.snapshots.get(query.time!);
        return { documents: doc ? [doc] : [] };
    });
    getDocument.mockImplementation(async () => store.current);
    getClient.mockReturnValue({ request, getDocument });
});

describe("이력 화면의 잘못된 경로", () => {
    it.each(["__proto__", "constructor", "toString", "missing"])("잘못된 영역 %s는 404로 처리한다", async (area) => {
        await expect(page(area)).rejects.toThrow("NOT_FOUND");
        expect(getClient).not.toHaveBeenCalled();
    });
    it.each(["%", "drafts.crew-1", "versions.r.crew-1", "../crew-1"])("잘못된 문서 ID %s는 URI 오류 없이 404로 처리한다", async (id) => {
        await expect(page("crew", id)).rejects.toThrow("NOT_FOUND");
        expect(getClient).not.toHaveBeenCalled();
    });
    it("이력 영역과 현재 문서 종류가 다르면 404로 처리한다", async () => {
        store.current._type = "work";
        await expect(page()).rejects.toThrow("NOT_FOUND");
    });
});

describe("이력 화면의 정확한 표시와 복원 안내", () => {
    it("현재 문서의 보관된 이력이 비어 있으면 404 대신 안내한다", async () => {
        store.revisions = []; const result = await html();
        expect(result).toContain("확인할 수 있는 저장 기록이 없어요"); expect(result).not.toContain("data-restore");
    });
    it("보관 범위 밖의 선택 시점에는 목록에서 다시 고르도록 안내한다", async () => {
        const result = await html("2020-01-01T00:00:00Z"); expect(result).toContain("선택한 기록을 찾지 못했어요"); expect(result).not.toContain("data-restore");
    });
    it("중복 저장 시점은 복원 대상을 모호하게 선택하지 않는다", async () => {
        store.revisions[1].timestamp = latest;
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const result = await html(latest); expect(result).toContain("이력을 불러오지 못했어요"); expect(result).not.toContain("data-restore"); error.mockRestore();
    });
    it("조회 결과의 마지막 항목을 최초 생성으로 오인하지 않는다", async () => {
        const result = await html();
        expect(result).toContain("이전 기록이 없어 변경 내용을 비교할 수 없어요.");
        expect(result).not.toContain("처음 만들어");
        expect(result).toContain('data-version="r2"');
        expect(request).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ limit: "26" }) }));
    });
    it("선택한 내용을 못 읽으면 빈 문서로 비교하거나 복원 버튼을 보여주지 않는다", async () => {
        store.failed.add(older);
        const result = await html();
        expect(result).toContain("기록 내용을 읽지 못해");
        expect(result).toContain("되돌리기는 잠시 막아 두었어요");
        expect(result).not.toContain("data-restore");
        expect(result).not.toContain("되돌리면");
    });
    it("최신 이력이라도 실제 현재 버전과 다르면 현재라고 표시하지 않는다", async () => {
        store.current = { ...store.current, _rev: "r3", name: "기록 조회 뒤 바뀐 이름" };
        const result = await html(latest);
        expect(result).toContain("최근 기록");
        expect(result).not.toContain(">현재</span>");
        expect(result).toContain('data-version="r3"');
        expect(result).toContain("data-restore");
    });
    it("실제 현재 버전을 선택하면 복원 버튼을 표시하지 않는다", async () => {
        const result = await html(latest);
        expect(result).toContain("지금 저장된 내용과 같은 기록이에요.");
        expect(result).not.toContain("data-restore");
    });
    it("다른 문서의 스냅샷을 복원 후보로 표시하지 않는다", async () => {
        store.snapshots.set(older, { ...store.snapshots.get(older)!, _id: "another-document" });
        expect(await html()).not.toContain("data-restore");
    });
    it("기본 객체 속성과 이름이 같은 필드도 문자열 라벨로 표시한다", async () => {
        Object.assign(store.current, { _rev: "r3", constructor: "now" });
        Object.assign(store.snapshots.get(latest)!, { constructor: "old" });
        const result = await html(latest);
        expect(result).toContain("constructor");
        expect(result).toContain("data-restore");
    });
    it("이력 API 형식이 깨지면 일반 오류 안내를 보여준다", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        store.malformed = true;
        expect(await html()).toContain("이력을 불러오지 못했어요");
        error.mockRestore();
    });
});
