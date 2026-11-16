import { describe, expect, it, beforeEach, vi } from "vitest";
import { publicStaticParams } from "@/lib/public-routes";
import { generateStaticParams as workParams } from "./works/[slug]/page";
import { generateStaticParams as crewParams } from "./crew/[slug]/page";
import { worksQuery, crewsQuery } from "@/sanity/lib/queries";

const { read, fetchPage } = vi.hoisted(() => ({ read: vi.fn(), fetchPage: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: read }, sanityFetch: fetchPage }));
vi.mock("./works/[slug]/WorkDetailClient", () => ({ default: () => null }));
vi.mock("./crew/[slug]/CrewDetailClient", () => ({ default: () => null }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
beforeEach(() => { vi.resetAllMocks(); read.mockResolvedValue([]); });

const invalidLists: unknown[] = [null, undefined, 1, "not-a-list", {}, new Set([{ slug: "not-an-array" }]), { map: () => [{ slug: "not-a-list" }] }];
const badRows: unknown[] = [null, undefined, 1, "row", [], {}, Object.assign([], { slug: "array-own-slug" })];
describe("사전 생성 주소의 원본 응답 경계", () => {
    it.each(invalidLists)("비정상 목록 #%#를 정상 빈 목록으로 숨기지 않는다", (value) => {
        expect(() => publicStaticParams(value)).toThrow("Invalid static params response");
    });
    it.each(badRows)("비정상 행 #%#만 제외하고 앞뒤 정상 주소를 유지한다", (bad) => {
        expect(publicStaticParams([{ slug: "before" }, bad, { slug: "after" }])).toEqual([{ slug: "before" }, { slug: "after" }]);
    });
    it("상속된 slug를 주소로 만들지 않는다", () => {
        expect(publicStaticParams([Object.create({ slug: "inherited" }), { slug: "own" }])).toEqual([{ slug: "own" }]);
    });
    it("상속된 배열 슬롯은 주소로 만들지 않는다", () => {
        const rows = new Array(2); rows[1] = { slug: "own" };
        const prototype = Object.create(Array.prototype); prototype[0] = { slug: "inherited-slot" };
        Object.setPrototypeOf(rows, prototype);
        expect(publicStaticParams(rows)).toEqual([{ slug: "own" }]);
    });
    it("빈 슬롯은 건너뛰고 정상 행을 유지한다", () => {
        const rows = new Array(3); rows[0] = { slug: "before" }; rows[2] = { slug: "after" };
        expect(publicStaticParams(rows)).toEqual([{ slug: "before" }, { slug: "after" }]);
    });
    it("프로토타입이 없는 원본 행의 직접 slug는 그대로 받는다", () => {
        expect(publicStaticParams([Object.assign(Object.create(null), { slug: "own" })])).toEqual([{ slug: "own" }]);
    });
    it("정상 빈 배열은 허용하지만 중첩 slug나 비정상 주소는 추측 변환하지 않는다", () => {
        expect(publicStaticParams([])).toEqual([]);
        expect(publicStaticParams([{ slug: { current: "nested" } }, { slug: "../bad" }, { slug: "\ud800" }])).toEqual([]);
    });
    it("원본·순서·리터럴 퍼센트·한글을 유지하고 정확한 중복만 제거한다", () => {
        const slugs = ["literal%2Fname", "한글", "100%", "With_you_n@di", "a?b#c", "literal%2Fname"];
        const rows = Object.freeze(slugs.map((slug) => Object.freeze({ slug })));
        expect(publicStaticParams(rows)).toEqual(slugs.slice(0, -1).map((slug) => ({ slug })));
        expect(rows.map((row) => row.slug)).toEqual(slugs);
    });
});

describe.each([
    { area: "works", generate: workParams, query: worksQuery },
    { area: "crew", generate: crewParams, query: crewsQuery },
])("$area의 실제 generateStaticParams 진입점", ({ generate, query }) => {
    it.each(invalidLists)("비정상 목록 #%#는 명시적인 조회 형식 오류로 중단한다", async (value) => {
        read.mockResolvedValue(value);
        await expect(generate()).rejects.toThrow("Invalid static params response");
        expect(read).toHaveBeenCalledExactlyOnceWith(query, { includeHidden: false });
        expect(fetchPage).not.toHaveBeenCalled();
    });
    it("잘못된 행이 섞여도 실제 생성기는 정상 원문 주소를 전달한다", async () => {
        read.mockResolvedValue([{ slug: "한글%40" }, null, Object.create({ slug: "inherited" }), { slug: "literal%2Fname" }, { slug: "한글%40" }]);
        expect(await generate()).toEqual([{ slug: "한글%40" }, { slug: "literal%2Fname" }]);
        expect(read).toHaveBeenCalledExactlyOnceWith(query, { includeHidden: false });
        expect(fetchPage).not.toHaveBeenCalled();
    });
    it("정상 빈 조회는 요청 시 렌더링할 수 있는 빈 배열을 유지한다", async () => {
        expect(await generate()).toEqual([]);
        expect(read).toHaveBeenCalledExactlyOnceWith(query, { includeHidden: false });
    });
    it("네트워크 실패를 성공이나 빈 목록으로 바꾸지 않는다", async () => {
        const failure = new Error("test-only-network-failure"); read.mockRejectedValue(failure);
        await expect(generate()).rejects.toBe(failure);
        expect(read).toHaveBeenCalledTimes(1);
    });
});
