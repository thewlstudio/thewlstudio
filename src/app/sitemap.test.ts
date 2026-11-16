import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { workSitemapQuery } from "@/sanity/lib/queries";

const { read, report } = vi.hoisted(() => ({ read: vi.fn(), report: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: read } }));
vi.mock("@/lib/error-reporting", () => ({ reportError: report }));
const goodDate = "2026-11-06T00:00:00Z";
const row = (slug: string, date: unknown = goodDate) => ({ slug, _updatedAt: date });
const paths = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map((entry) => new URL(entry.url).pathname);
beforeEach(() => { vi.resetAllMocks(); read.mockResolvedValue([]); });
afterEach(() => { vi.useRealTimers(); });

describe("사이트맵 수정일의 출처와 달력 검증", () => {
    it("실제 수정일 출처가 없는 고정 경로 6곳에 생성 시각을 넣지 않는다", async () => {
        const entries = await sitemap();
        expect(entries).toHaveLength(6);
        expect(paths(entries)).toEqual(["/", "/works", "/crew", "/class", "/studio", "/contact"]);
        for (const entry of entries) expect(entry).not.toHaveProperty("lastModified");
    });
    it("생성 시각만 달라져도 같은 원본의 URL·수정일은 바뀌지 않는다", async () => {
        vi.useFakeTimers(); vi.setSystemTime("2026-11-06T00:00:00Z");
        read.mockResolvedValue([row("one")]);
        const first = await sitemap();
        vi.setSystemTime("2026-11-07T00:00:00Z");
        expect(await sitemap()).toEqual(first);
    });
    it.each([
        undefined, null, 0, {}, "", "1", "2026", "2026-11", "Nov 6 2026", "2026. 11. 06.",
        "2026-02-30", "2025-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T12:00:00Z",
        "2026-11-06T24:00:00Z", "2026-11-06T12:60:00Z", "2026-11-06T12:00:60Z",
        "2026-11-06T12:00:00", " 2026-11-06T12:00:00Z ", "2026-11-06T12:00:00+24:00",
    ])("수정일 #%#가 없거나 잘못돼도 주소는 유지하고 날짜만 생략한다", async (date) => {
        read.mockImplementation(async (query: string) => query === workSitemapQuery ? [{ slug: "one", _updatedAt: date }] : []);
        const entries = await sitemap();
        expect(paths(entries)).toContain("/works/one");
        expect(entries.find((entry) => new URL(entry.url).pathname === "/works/one")).not.toHaveProperty("lastModified");
    });
    it.each([
        ["2026-11-06", "2026-11-06T00:00:00.000Z"],
        ["2000-02-29T12:00:00Z", "2000-02-29T12:00:00.000Z"],
        ["2024-02-29T12:00:00.123456Z", "2024-02-29T12:00:00.123Z"],
        ["2026-11-06T12:00:00+09:00", "2026-11-06T03:00:00.000Z"],
        ["2026-11-06T12:00:00-04:30", "2026-11-06T16:30:00.000Z"],
    ])("유효한 원본 수정일 %s는 기존 UTC Date 출력 형식을 유지한다", async (date, expected) => {
        read.mockImplementation(async (query: string) => query === workSitemapQuery ? [row("one", date)] : []);
        const entries = await sitemap();
        expect((entries.find((entry) => new URL(entry.url).pathname === "/works/one")!.lastModified as Date).toISOString()).toBe(expected);
    });
});

describe.each(["works", "crew"])("사이트맵 %s 조회 응답의 실패 격리", (area) => {
    const arrange = (value: unknown) => read.mockImplementation(async (query: string) => (query === workSitemapQuery ? "works" : "crew") === area ? value : [row("healthy")]);
    it.each([null, undefined, "not an array", 1, {}, { slug: "not-a-list", sensitive: "test-only-content-must-not-log" }])("성공으로 반환된 비정상 응답 #%#도 다른 영역을 깨뜨리지 않는다", async (value) => {
        arrange(value);
        const entries = await sitemap();
        expect(entries).toHaveLength(7);
        expect(paths(entries)).toContain(area === "works" ? "/crew/healthy" : "/works/healthy");
        expect(report).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(report.mock.calls)).not.toContain("test-only-content-must-not-log");
    });
    it.each([null, undefined, 1, "row", [], ["one"], {}])("목록 중간의 비정상 행 #%#만 제외하고 앞뒤 정상 주소를 유지한다", async (bad) => {
        arrange([row("before"), bad, row("after")]);
        const entries = await sitemap();
        expect(entries).toHaveLength(9);
        expect(paths(entries)).toContain(`/${area}/before`);
        expect(paths(entries)).toContain(`/${area}/after`);
        expect(report).toHaveBeenCalledTimes(1);
    });
    it("상속된 slug를 정상 행의 주소로 사용하지 않는다", async () => {
        arrange([Object.create({ slug: "inherited", _updatedAt: goodDate }), row("kept")]);
        const entries = await sitemap();
        expect(paths(entries)).not.toContain(`/${area}/inherited`);
        expect(paths(entries)).toContain(`/${area}/kept`);
        expect(report).toHaveBeenCalledTimes(1);
    });
    it("빈 슬롯을 건너뛰고 정상 행과 다른 영역을 유지한다", async () => {
        const rows = [row("before"), row("gap"), row("after")]; delete rows[1];
        arrange(rows);
        const entries = await sitemap();
        expect(entries).toHaveLength(9);
        expect(report).toHaveBeenCalledTimes(1);
    });
    it("상속된 수정일은 실제 원본 날짜로 인정하지 않는다", async () => {
        arrange([Object.assign(Object.create({ _updatedAt: goodDate }), { slug: "own" })]);
        const entries = await sitemap();
        expect(entries.find((entry) => new URL(entry.url).pathname === `/${area}/own`)).not.toHaveProperty("lastModified");
    });
});

describe("사이트맵의 정상 없음과 동시 실패 구분", () => {
    it("정상 빈 목록은 조회 실패로 보고하지 않는다", async () => {
        expect(await sitemap()).toHaveLength(6);
        expect(report).not.toHaveBeenCalled();
    });
    it("두 조회가 모두 실패해도 고정 경로를 유지하고 두 오류를 보고한다", async () => {
        read.mockRejectedValue(new Error("test-unavailable"));
        expect(await sitemap()).toHaveLength(6);
        expect(report).toHaveBeenCalledTimes(2);
    });
});
