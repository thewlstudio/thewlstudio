import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanityFetch } from "@/sanity/lib/client";
import PreviewBanner from "@/components/PreviewBanner";
import { logout } from "@/app/manage/actions";

const { state, read, jar, enable, disable, navigate } = vi.hoisted(() => ({
    state: { draft: true, session: undefined as string | undefined },
    read: vi.fn(), jar: { get: vi.fn(), delete: vi.fn(), set: vi.fn() },
    enable: vi.fn(), disable: vi.fn(), navigate: vi.fn(),
}));
vi.mock("next-sanity", () => ({ createClient: () => ({ fetch: read }) }));
vi.mock("next/headers", () => ({
    draftMode: async () => ({ isEnabled: state.draft, enable, disable }),
    cookies: async () => jar,
}));
vi.mock("next/navigation", () => ({ redirect: navigate }));

const clock = Date.parse("2026-11-06T00:00:00Z");
const secret = "test-only-preview-session-secret";
const token = (expiry: number) => `${expiry}.${createHmac("sha256", secret).update(`session:${expiry}`).digest("hex")}`;
beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(clock);
    vi.stubEnv("MANAGE_SECRET", secret); vi.stubEnv("MANAGE_PASSWORD", "test-only-password");
    state.draft = true; state.session = token(clock + 60000);
    jar.get.mockImplementation(() => state.session === undefined ? undefined : { value: state.session });
    jar.delete.mockImplementation(() => { state.session = undefined; });
    disable.mockImplementation(() => { state.draft = false; });
    navigate.mockImplementation(() => { throw new Error("test-redirect"); });
    read.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

async function expectVisibility(visible: boolean) {
    await sanityFetch({ query: "test-query", params: { includeHidden: true }, tags: ["crew"] });
    expect(read).toHaveBeenLastCalledWith("test-query", { includeHidden: visible }, { next: { revalidate: visible ? 0 : 3600, tags: ["crew"] } });
    if (visible) expect(await PreviewBanner()).not.toBeNull();
    else expect(await PreviewBanner()).toBeNull();
}

describe("미리보기 쿠키와 실제 관리자 세션의 조회 권한", () => {
    it("미리보기와 유효한 세션이 모두 있을 때만 비공개 항목과 안내를 표시한다", async () => {
        await expectVisibility(true);
        expect(jar.set).not.toHaveBeenCalled(); expect(jar.delete).not.toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled(); expect(disable).not.toHaveBeenCalled();
    });
    it.each([true, false])("미리보기 쿠키가 없으면 세션 유무(%s)와 무관하게 공개 조회이며 인증 쿠키도 읽지 않는다", async (hasSession) => {
        state.draft = false; if (!hasSession) state.session = undefined;
        await expectVisibility(false);
        expect(jar.get).not.toHaveBeenCalled();
    });
    it.each([
        { name: "로그아웃된 세션", setup: () => { state.session = undefined; } },
        { name: "이미 만료된 세션", setup: () => { state.session = token(clock - 1); } },
        { name: "정확히 만료된 세션", setup: () => { state.session = token(clock); } },
        { name: "서명 변조", setup: () => { state.session = `${clock + 60000}.${"0".repeat(64)}`; } },
        { name: "서명 뒤 추가 구간", setup: () => { state.session = token(clock + 60000) + ".extra"; } },
        { name: "시크릿 교체", setup: () => { vi.stubEnv("MANAGE_SECRET", "changed-test-only-secret"); } },
        { name: "시크릿 해제", setup: () => { vi.stubEnv("MANAGE_SECRET", ""); } },
        { name: "관리 비밀번호 해제", setup: () => { vi.stubEnv("MANAGE_PASSWORD", ""); } },
    ])("미리보기 쿠키가 남아도 $name이면 비공개 조회와 안내를 허용하지 않는다", async ({ setup }) => {
        setup(); await expectVisibility(false);
        expect(jar.set).not.toHaveBeenCalled(); expect(jar.delete).not.toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled(); expect(disable).not.toHaveBeenCalled();
    });
    it("유효했던 세션도 다음 조회가 만료 시각에 도달하면 권한을 다시 확인한다", async () => {
        await expectVisibility(true);
        vi.setSystemTime(clock + 60000);
        await expectVisibility(false);
    });
    it("인증 쿠키를 읽지 못하면 비공개 조회로 진행하거나 안내를 표시하지 않는다", async () => {
        jar.get.mockImplementation(() => { throw new Error("test-auth-read-failed"); });
        await expect(sanityFetch({ query: "test-query" })).rejects.toThrow("test-auth-read-failed");
        await expect(PreviewBanner()).rejects.toThrow("test-auth-read-failed");
        expect(read).not.toHaveBeenCalled();
    });
    it("로그아웃은 관리자 세션과 미리보기 쿠키를 모두 종료한 뒤 이동한다", async () => {
        await expect(logout()).rejects.toThrow("test-redirect");
        expect(jar.delete).toHaveBeenCalledExactlyOnceWith("wls_manage_session");
        expect(disable).toHaveBeenCalledTimes(1);
        expect(jar.delete.mock.invocationCallOrder[0]).toBeLessThan(disable.mock.invocationCallOrder[0]);
        expect(disable.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
        expect(navigate).toHaveBeenCalledWith("/manage/login");
        await expectVisibility(false);
    });
    it("미리보기 종료가 실패해도 삭제된 세션으로 비공개 항목을 다시 읽지 못하고 성공 이동도 하지 않는다", async () => {
        disable.mockImplementationOnce(() => { throw new Error("test-cookie-failed"); });
        await expect(logout()).rejects.toThrow("test-cookie-failed");
        expect(navigate).not.toHaveBeenCalled();
        expect(state.draft).toBe(true);
        await expectVisibility(false);
    });
});
