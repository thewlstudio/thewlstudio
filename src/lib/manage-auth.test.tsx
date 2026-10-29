import { createHmac } from "node:crypto";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, destroySession, generateSecret, getSessionExpiry, isAuthenticated, isManageConfigured, requireAuth } from "./manage-auth";
import LoginPage from "@/app/manage/login/page";
import { logout } from "@/app/manage/actions";

const { jar, cookieStore, state, navigate } = vi.hoisted(() => ({
    jar: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }, cookieStore: vi.fn(),
    state: { value: undefined as string | undefined }, navigate: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: cookieStore }));
vi.mock("next/navigation", () => ({ redirect: navigate }));

const testSecret = "test-only-session-secret-not-a-production-value";
const testPassword = "test-only-password";
const cookieName = "wls_manage_session";
const duration = 12 * 60 * 60 * 1000;
const clock = Date.parse("2026-10-27T00:00:00.000Z");
const signature = (expiry: number, secret = testSecret) => createHmac("sha256", secret).update(`session:${expiry}`).digest("hex");
const token = (expiry: number) => `${expiry}.${signature(expiry)}`;

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(clock);
    vi.stubEnv("MANAGE_SECRET", testSecret);
    vi.stubEnv("MANAGE_PASSWORD", testPassword);
    vi.stubEnv("NODE_ENV", "test");
    state.value = undefined;
    jar.get.mockImplementation(() => state.value === undefined ? undefined : { name: cookieName, value: state.value });
    jar.set.mockImplementation((_name: string, value: string) => { state.value = value; });
    jar.delete.mockImplementation(() => { state.value = undefined; });
    cookieStore.mockResolvedValue(jar);
    navigate.mockImplementation(() => { throw Object.assign(new Error("test redirect"), { digest: "TEST_REDIRECT" }); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("관리 세션 발급·검증", () => {
    it.each(["test", "production"])("%s 환경에서 기존 12시간 형식과 쿠키 보안 옵션을 유지한다", async (environment) => {
        vi.stubEnv("NODE_ENV", environment);
        expect(await createSession(testPassword)).toBe(true);
        expect(jar.set).toHaveBeenCalledExactlyOnceWith(cookieName, token(clock + duration), {
            httpOnly: true, sameSite: "lax", secure: environment === "production", path: "/", maxAge: 43200,
        });
        expect(await isAuthenticated()).toBe(true);
        expect(await getSessionExpiry()).toBe(clock + duration);
    });
    it.each(["", "short", "test-only-passworD", "test-only-password-extra", "다른 비밀번호"])("잘못된 비밀번호 %s는 기존 지연 후 거부하고 쿠키를 만들지 않는다", async (password) => {
        let settled = false;
        const result = createSession(password).then((ok) => { settled = true; return ok; });
        await vi.advanceTimersByTimeAsync(1499);
        expect(settled).toBe(false);
        expect(jar.set).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(await result).toBe(false);
        expect(cookieStore).not.toHaveBeenCalled();
    });
    it("현재 시각 바로 전까지는 유효하고 만료 시각부터는 거부한다", async () => {
        state.value = token(clock + 1);
        expect(await isAuthenticated()).toBe(true);
        vi.setSystemTime(clock + 1);
        expect(await isAuthenticated()).toBe(false);
        expect(await getSessionExpiry()).toBeNull();
    });
    it("만료 시각은 한 번 읽은 동일 쿠키에서 검증해 반환한다", async () => {
        state.value = token(clock + duration);
        expect(await getSessionExpiry()).toBe(clock + duration);
        expect(cookieStore).toHaveBeenCalledTimes(1);
        expect(jar.get).toHaveBeenCalledExactlyOnceWith(cookieName);
    });
    it.each([
        { name: "추가 구간", make: (expiry: number) => `${token(expiry)}.extra` },
        { name: "추가 구분자", make: (expiry: number) => `${token(expiry)}.` },
        { name: "끝 줄바꿈", make: (expiry: number) => `${token(expiry)}\n` },
        { name: "앞쪽 공백", make: (expiry: number) => ` ${token(expiry)}` },
        { name: "0으로 시작하는 시각", make: (expiry: number) => `0${expiry}.${signature(expiry)}` },
        { name: "부호가 붙은 시각", make: (expiry: number) => `+${expiry}.${signature(expiry)}` },
        { name: "16진수 시각", make: (expiry: number) => `0x${expiry.toString(16)}.${signature(expiry)}` },
        { name: "지수 표기 시각", make: (expiry: number) => `${expiry}e0.${signature(expiry)}` },
    ])("정상 서명 부분이 있어도 $name 형식은 거부한다", async ({ make }) => {
        state.value = make(clock + duration);
        expect(await isAuthenticated()).toBe(false);
        expect(await getSessionExpiry()).toBeNull();
    });
    it.each([Infinity, Number.MAX_SAFE_INTEGER + 1])("서명이 있어도 유효한 정수가 아닌 만료값 %s는 거부한다", async (expiry) => {
        state.value = token(expiry);
        expect(await isAuthenticated()).toBe(false);
    });
    it.each([undefined, "", "no-dot", "0.bad", "-1.bad", "NaN.bad", "123", `${clock + duration}.`, `${clock + duration}.${"0".repeat(64)}`, `${clock + duration}.${"a".repeat(63)}`, `${clock + duration}.${"가".repeat(64)}`, token(clock - 1)])("없거나 잘못된 쿠키 #%#는 인증하지 않고 예외도 내지 않는다", async (value) => {
        state.value = value;
        expect(await isAuthenticated()).toBe(false);
        expect(await getSessionExpiry()).toBeNull();
        await expect(requireAuth()).rejects.toThrow("인증이 필요해요.");
        expect(jar.set).not.toHaveBeenCalled();
        expect(jar.delete).not.toHaveBeenCalled();
    });
    it.each(["MANAGE_SECRET", "MANAGE_PASSWORD"])("%s 설정이 없으면 발급과 기존 세션 모두 허용하지 않는다", async (key) => {
        state.value = token(clock + duration);
        vi.stubEnv(key, "");
        expect(isManageConfigured()).toBe(false);
        expect(await createSession(testPassword)).toBe(false);
        expect(await isAuthenticated()).toBe(false);
        expect(await getSessionExpiry()).toBeNull();
        await expect(requireAuth()).rejects.toThrow("인증이 필요해요.");
        expect(cookieStore).not.toHaveBeenCalled();
    });
    it("서명 시크릿이 바뀌면 이전 서명을 거부한다", async () => {
        state.value = token(clock + duration);
        vi.stubEnv("MANAGE_SECRET", "another-test-only-secret");
        expect(await isAuthenticated()).toBe(false);
    });
    it("인증 검사는 유효한 쿠키를 자동 연장하거나 다시 쓰지 않는다", async () => {
        state.value = token(clock + duration);
        await expect(requireAuth()).resolves.toBeUndefined();
        expect(jar.set).not.toHaveBeenCalled();
        expect(jar.delete).not.toHaveBeenCalled();
    });
    it("시크릿 생성은 32바이트 난수의 16진수 형식이다", () => {
        const first = generateSecret(), second = generateSecret();
        expect(first).toMatch(/^[a-f0-9]{64}$/);
        expect(second).toMatch(/^[a-f0-9]{64}$/);
        expect(second).not.toBe(first);
    });
});

type Props = { children?: ReactNode; action?: unknown; name?: string; type?: string; autoComplete?: string; role?: string };
function elements(node: ReactNode): ReactElement<Props>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
async function loginAction() {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    const action = elements(page).find((child) => child.type === "form")!.props.action;
    expect(action).toBeTypeOf("function");
    return action as (data: FormData) => Promise<never>;
}
describe("실제 로그인 페이지와 로그아웃 액션", () => {
    it("로그인 입력은 비밀번호 자동완성 용도를 선언하고 오류는 알림으로 표시한다", async () => {
        const page = await LoginPage({ searchParams: Promise.resolve({ error: "1" }) });
        expect(elements(page).find((child) => child.type === "input")?.props).toMatchObject({ name: "password", type: "password", autoComplete: "current-password" });
        expect(elements(page).some((child) => child.props.role === "alert")).toBe(true);
    });
    it("로그인 성공은 쿠키를 발급한 뒤 고정 관리 허브로 이동한다", async () => {
        const action = await loginAction();
        const data = new FormData(); data.set("password", testPassword); data.set("next", "https://other.example");
        await expect(action(data)).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/manage");
        expect(jar.set.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
        expect(await isAuthenticated()).toBe(true);
    });
    it("로그인 실패는 쿠키 없이 고정 오류 주소로 이동한다", async () => {
        const action = await loginAction();
        const result = action(new FormData());
        const assertion = expect(result).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
        await vi.advanceTimersByTimeAsync(1500);
        await assertion;
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/manage/login?error=1");
        expect(jar.set).not.toHaveBeenCalled();
    });
    it("이미 인증된 방문자는 로그인 폼 대신 관리 허브로 이동한다", async () => {
        state.value = token(clock + duration);
        await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/manage");
    });
    it("설정되지 않은 상태에서는 로그인 폼을 만들지 않는다", async () => {
        vi.stubEnv("MANAGE_PASSWORD", "");
        const page = await LoginPage({ searchParams: Promise.resolve({}) });
        expect(elements(page).some((child) => child.type === "form")).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
    });
    it("로그아웃은 쿠키를 지운 뒤 로그인 페이지로 이동한다", async () => {
        state.value = token(clock + duration);
        await expect(logout()).rejects.toMatchObject({ digest: "TEST_REDIRECT" });
        expect(jar.delete).toHaveBeenCalledExactlyOnceWith(cookieName);
        expect(navigate).toHaveBeenCalledExactlyOnceWith("/manage/login");
        expect(jar.delete.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
        expect(await isAuthenticated()).toBe(false);
    });
    it("만료된 세션도 로그아웃으로 쿠키를 지울 수 있다", async () => {
        state.value = token(clock - 1);
        await destroySession();
        expect(jar.delete).toHaveBeenCalledExactlyOnceWith(cookieName);
    });
    it("쿠키 삭제 실패를 성공 이동으로 숨기지 않는다", async () => {
        jar.delete.mockImplementation(() => { throw new Error("cookie delete failed"); });
        await expect(logout()).rejects.toThrow("cookie delete failed");
        expect(navigate).not.toHaveBeenCalled();
    });
});
