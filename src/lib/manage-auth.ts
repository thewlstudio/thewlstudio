import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";

/**
 * /manage 관리 화면용 최소 인증.
 *
 * 스튜디오 운영자 1명이 쓰는 화면이므로 계정 시스템 대신
 * 공유 비밀번호 + 서명된 세션 쿠키 방식을 쓴다.
 * - 비밀번호는 서버에서만 비교한다 (타이밍 공격 방지)
 * - 쿠키는 httpOnly + 서명되어 있어 클라이언트가 위조할 수 없다
 */

const COOKIE_NAME = "wls_manage_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12시간

function getSecret(): string | null {
    return process.env.MANAGE_SECRET ?? null;
}

function getPassword(): string | null {
    return process.env.MANAGE_PASSWORD ?? null;
}

/** 관리 화면이 사용 가능하도록 환경변수가 갖춰졌는지 */
export function isManageConfigured(): boolean {
    return Boolean(getSecret() && getPassword());
}

function sign(expiresAt: number, secret: string): string {
    return createHmac("sha256", secret).update(`session:${expiresAt}`).digest("hex");
}

/** 길이가 달라도 안전하게 비교 */
function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // 길이가 다르면 무조건 실패지만, 타이밍을 균일하게 유지하기 위해 비교는 수행
        timingSafeEqual(bufA, bufA);
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

/** 비밀번호 검증 후 세션 쿠키 발급. 성공 여부를 반환한다. */
export async function createSession(inputPassword: string): Promise<boolean> {
    const secret = getSecret();
    const password = getPassword();
    if (!secret || !password) return false;
    if (!safeEqual(inputPassword, password)) return false;

    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const token = `${expiresAt}.${sign(expiresAt, secret)}`;

    (await cookies()).set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000,
    });
    return true;
}

export async function destroySession(): Promise<void> {
    (await cookies()).delete(COOKIE_NAME);
}

/** 현재 요청이 인증된 세션인지 */
export async function isAuthenticated(): Promise<boolean> {
    const secret = getSecret();
    if (!secret) return false;

    const raw = (await cookies()).get(COOKIE_NAME)?.value;
    if (!raw) return false;

    const [expiresRaw, signature] = raw.split(".");
    const expiresAt = Number(expiresRaw);
    if (!expiresAt || !signature) return false;
    if (Date.now() > expiresAt) return false;

    return safeEqual(signature, sign(expiresAt, secret));
}

/** 서버 액션 진입점에서 호출. 인증 안 됐으면 예외를 던진다. */
export async function requireAuth(): Promise<void> {
    if (!(await isAuthenticated())) {
        throw new Error("인증이 필요합니다. 다시 로그인해 주세요.");
    }
}

/** 최초 설정 안내용 — 안전한 랜덤 시크릿 생성 */
export function generateSecret(): string {
    return randomBytes(32).toString("hex");
}
