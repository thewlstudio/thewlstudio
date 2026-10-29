import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Hub from "./page";
import Instructors from "./instructors/page";
import NewInstructor from "./instructors/new/page";
import EditInstructor from "./instructors/[id]/page";
import Crew from "./crew/page";
import NewCrew from "./crew/new/page";
import EditCrew from "./crew/[id]/page";
import Works from "./works/page";
import NewWork from "./works/new/page";
import EditWork from "./works/[id]/page";
import Studio from "./studio/page";
import NewSpace from "./studio/new/page";
import EditSpace from "./studio/[id]/page";
import StudioInfo from "./studio/info/page";
import Contact from "./contact/page";
import History from "./history/[area]/[id]/page";
import Help from "./help/page";
import Map from "./map/page";

const { cookieStore, cookieValue, read, writeClient, navigate } = vi.hoisted(() => ({
    cookieStore: vi.fn(), cookieValue: { value: undefined as string | undefined }, read: vi.fn(), writeClient: vi.fn(), navigate: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: cookieStore }));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), redirect: navigate }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: read }, sanityFetch: read }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: writeClient, isWriteConfigured: () => false }));
const clock = Date.parse("2026-10-27T00:00:00.000Z");
const testSecret = "test-only-boundary-secret";
const signed = (expiry: number) => `${expiry}.${createHmac("sha256", testSecret).update(`session:${expiry}`).digest("hex")}`;
const searchParams = () => Promise.resolve({});
const params = () => Promise.resolve({ id: "test-document" });

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers(); vi.setSystemTime(clock);
    vi.stubEnv("MANAGE_SECRET", testSecret); vi.stubEnv("MANAGE_PASSWORD", "test-only-password");
    cookieValue.value = undefined;
    cookieStore.mockResolvedValue({ get: () => cookieValue.value === undefined ? undefined : { value: cookieValue.value } });
    navigate.mockImplementation(() => { throw Object.assign(new Error("test redirect"), { digest: "TEST_REDIRECT" }); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("실제 관리 서버 페이지의 인증 경계", () => {
    it.each([
        { name: "관리 허브", run: () => Hub() },
        { name: "강사 목록", run: () => Instructors({ searchParams: searchParams() }) },
        { name: "새 강사", run: () => NewInstructor() },
        { name: "강사 편집", run: () => EditInstructor({ params: params() }) },
        { name: "Crew 목록", run: () => Crew({ searchParams: searchParams() }) },
        { name: "새 Crew", run: () => NewCrew() },
        { name: "Crew 편집", run: () => EditCrew({ params: params() }) },
        { name: "Works 목록", run: () => Works({ searchParams: searchParams() }) },
        { name: "새 Works", run: () => NewWork() },
        { name: "Works 편집", run: () => EditWork({ params: params() }) },
        { name: "Studio 목록", run: () => Studio({ searchParams: searchParams() }) },
        { name: "새 공간", run: () => NewSpace() },
        { name: "공간 편집", run: () => EditSpace({ params: params() }) },
        { name: "Studio 안내", run: () => StudioInfo() },
        { name: "연락처", run: () => Contact() },
        { name: "이력", run: () => History({ params: Promise.resolve({ area: "crew", id: "test-document" }), searchParams: searchParams() }) },
        { name: "사용 안내", run: () => Help() },
        { name: "홈페이지 지도", run: () => Map() },
    ])("$name은 유효한 인증 없이 관리 데이터를 조회하거나 출력하지 않는다", async ({ run }) => {
        for (const scenario of [
            { name: "쿠키 없음", cookie: undefined, password: "test-only-password" },
            { name: "서명 변조", cookie: `${clock + 10000}.${"0".repeat(64)}`, password: "test-only-password" },
            { name: "정확히 만료됨", cookie: signed(clock), password: "test-only-password" },
            { name: "설정 해제", cookie: signed(clock + 10000), password: "" },
        ]) {
            navigate.mockClear();
            cookieValue.value = scenario.cookie;
            vi.stubEnv("MANAGE_PASSWORD", scenario.password);
            await expect(run(), scenario.name).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
            expect(navigate, scenario.name).toHaveBeenCalledExactlyOnceWith("/manage/login");
            expect(read, scenario.name).not.toHaveBeenCalled();
            expect(writeClient, scenario.name).not.toHaveBeenCalled();
        }
    });
});
