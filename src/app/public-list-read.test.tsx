import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import WorksPage, { generateMetadata as worksMetadata } from "./works/page";
import CrewPage from "./crew/page";
import ClassPage from "./class/page";
import StudioPage from "./studio/page";
import { FALLBACK_ROOMS, FALLBACK_LOBBY } from "@/lib/studio-spaces";
import { FALLBACK_INFO } from "@/lib/studio-info";

const { read, report } = vi.hoisted(() => ({ read: vi.fn(), report: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: read }));
vi.mock("@/lib/error-reporting", () => ({ reportError: report }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("./works/WorksClient", () => ({ default: () => null }));
vi.mock("./crew/CrewClient", () => ({ default: () => null }));
vi.mock("./class/ClassClient", () => ({ default: () => null }));
vi.mock("./studio/StudioClient", () => ({ default: () => null }));
beforeEach(() => { vi.resetAllMocks(); read.mockResolvedValue([]); });
const work = { slug: "one", title: "작품", artist: "아티스트", releaseDate: "2026. 11. 06.", imageUrl: null, lqip: null };
const crew = { slug: "one", name: "CREW", koName: "크루", role: "프로듀서", imageUrl: null, links: [] };
const instructor = { _id: "test-instructor", instructorName: "강사", category: "VOCAL", image: null, bgImage: null, about: [], process: [] };
const space = { kind: "room", name: "테스트 방", prices: [{ label: "1시간", value: "10000", unit: "원" }], images: [], features: [], notes: [] };
function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Record<string, unknown>>(child) ? [child, ...nodes(child.props.children as ReactNode)] : []);
}
function props(node: ReactNode, key: string) { return nodes(node).find((child) => Object.hasOwn(child.props, key))!.props; }
const areas = [
    { area: "Works", run: () => WorksPage({ searchParams: Promise.resolve({}) }), key: "initialWorks", row: work },
    { area: "Crew", run: () => CrewPage(), key: "members", row: crew },
    { area: "Class", run: () => ClassPage(), key: "initialInstructors", row: instructor },
];
describe.each(areas)("$area 공개 목록의 서버 입력 경계", ({ run, key, row }) => {
    it.each([null, undefined, "not-a-list", 1, {}])("비정상 응답 #%#를 클라이언트나 정상 빈 목록으로 넘기지 않는다", async (value) => {
        read.mockResolvedValue(value);
        await expect(run()).rejects.toThrow("Invalid public list response");
    });
    it.each([null, undefined, 1, "row", []])("비정상 행 #%#를 제외해 정상 목록처럼 보이게 하지 않는다", async (value) => {
        read.mockResolvedValue([row, value]);
        await expect(run()).rejects.toThrow("Invalid public list response");
    });
    it("정상 빈 목록은 그대로 전달한다", async () => {
        expect(props(await run(), key)[key]).toEqual([]);
        expect(report).not.toHaveBeenCalled();
    });
    it("정상 원본 행의 값·순서·객체를 보정하지 않는다", async () => {
        const rows = Object.freeze([Object.freeze({ ...row, custom: "원본 추가 정보" })]);
        read.mockResolvedValue(rows);
        const model = props(await run(), key)[key] as unknown[];
        expect(model).toEqual(rows); expect(model[0]).toBe(rows[0]);
    });
    it("조회 실패를 정상 빈 목록으로 바꾸지 않는다", async () => {
        const failure = new Error("test-only-network-failure"); read.mockRejectedValue(failure);
        await expect(run()).rejects.toBe(failure);
    });
    it("빈 배열 슬롯을 정상 행으로 오해하지 않는다", async () => {
        const rows = [row, row]; delete rows[1]; read.mockResolvedValue(rows);
        await expect(run()).rejects.toThrow("Invalid public list response");
    });
});

describe("공개 카드·모달에서 읽는 중첩 자료형", () => {
    it.each([
        { run: areas[0].run, row: { ...work, title: {} } },
        { run: areas[0].run, row: { ...work, releaseDate: {} } },
        { run: areas[1].run, row: { ...crew, name: {} } },
        { run: areas[1].run, row: { ...crew, links: "bad" } },
        { run: areas[1].run, row: { ...crew, links: [null] } },
        { run: areas[1].run, row: { ...crew, links: [{ url: {} }] } },
        { run: areas[2].run, row: { ...instructor, subtitle: {} } },
        { run: areas[2].run, row: { ...instructor, about: "not-a-list" } },
        { run: areas[2].run, row: { ...instructor, process: [{}] } },
        { run: areas[2].run, row: { ...instructor, image: { asset: { _ref: "invalid-image-ref" } } } },
    ])("잘못된 표시값 #%#를 화면 렌더링 전에 거부한다", async ({ run, row }) => {
        read.mockResolvedValue([row]);
        await expect(run()).rejects.toThrow("Invalid public list response");
    });
    it.each(areas)("$area의 중복 식별값으로 카드·모달 상태가 섞이지 않게 한다", async ({ run, row }) => {
        read.mockResolvedValue([row, { ...row }]);
        await expect(run()).rejects.toThrow("Invalid public list response");
    });
    it("Works 페이지 번호 메타데이터도 비정상 목록을 가짜 정상 canonical로 만들지 않는다", async () => {
        read.mockResolvedValue([work, null]);
        await expect(worksMetadata({ searchParams: Promise.resolve({ page: "3" }) })).rejects.toThrow("Invalid public list response");
    });
    it.each([
        { run: areas[0].run, key: areas[0].key, row: { title: "작품", artist: "아티스트", slug: "one" } },
        { run: areas[1].run, key: areas[1].key, row: { name: "크루", slug: "one" } },
        { run: areas[2].run, key: areas[2].key, row: { _id: "one", instructorName: "강사", category: "VOCAL", about: null, process: null } },
    ])("누락 선택값·예전 null 목록은 기존 빈 표시 정책을 유지한다 #%#", async ({ run, key, row }) => {
        read.mockResolvedValue([row]); expect(props(await run(), key)[key]).toEqual([row]);
    });
});

describe("Studio 목록·안내의 기존 대체 정책과 오류 구분", () => {
    const arrange = (spaces: unknown, ...info: unknown[]) => read.mockImplementation(async ({ tags }: { tags: string[] }) => tags[0] === "studioSpace" ? spaces : info.length ? info[0] : null);
    it("정상 빈 공간 목록에는 예비 방·로비를 되살리지 않는다", async () => {
        arrange([]);
        expect(props(await StudioPage(), "rooms")).toMatchObject({ rooms: [], lobby: null });
        expect(report).not.toHaveBeenCalled();
    });
    it.each([null, {}, "not-a-list", [null], [{ ...space, name: {} }], [{ ...space, prices: [null] }], [{ ...space, prices: [{ value: {} }] }], [{ ...space, images: [null] }], [{ ...space, features: {} }], [{ ...space, kind: "unknown" }]])("잘못된 공간 응답 #%#는 기존 예비 데이터를 사용하되 오류로 보고한다", async (value) => {
        arrange(value);
        const model = props(await StudioPage(), "rooms");
        expect(model.rooms).toBe(FALLBACK_ROOMS); expect(model.lobby).toBe(FALLBACK_LOBBY);
        expect(report).toHaveBeenCalledTimes(1);
    });
    it.each([undefined, 1, "bad", [], { services: [null] }, { services: [{ points: {} }] }, { parkingFee: {} }])("잘못된 안내 응답 #%#를 정상 문서 없음으로 숨기지 않는다", async (value) => {
        arrange([space], value);
        const model = props(await StudioPage(), "rooms");
        expect(model.rooms).toEqual([space]); expect(model.info).toBe(FALLBACK_INFO);
        expect(report).toHaveBeenCalledTimes(1);
    });
    it("명시적인 빈 목록과 빈 문구는 그대로 유지한다", async () => {
        arrange([space], { services: [], equipment: [], memberships: [], amenities: [], membershipNote: "" });
        const model = props(await StudioPage(), "rooms");
        expect(model.rooms).toEqual([space]);
        expect(model.info).toMatchObject({ services: [], equipment: [], memberships: [], amenities: [], membershipNote: "" });
        expect(report).not.toHaveBeenCalled();
    });
    it.each(["studioSpace", "studioInfo"])("%s의 프레임워크 중단 신호를 예비 데이터로 삼키지 않는다", async (tag) => {
        let signal: unknown;
        try { notFound(); } catch (error) { signal = error; }
        read.mockImplementation(async ({ tags }: { tags: string[] }) => { if (tags[0] === tag) throw signal; return []; });
        await expect(StudioPage()).rejects.toBe(signal);
        expect(report).not.toHaveBeenCalled();
    });
});
