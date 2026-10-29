/**
 * 새 고객 설치용 환경변수 생성·점검의 순수 로직. 파일·네트워크는 건드리지 않는다.
 * (실행은 scripts/provision.ts, 사용법은 docs/INSTALL_GUIDE.md)
 */
import { randomBytes } from "node:crypto";
import { DEFAULT_SANITY_PROJECT_ID, DEFAULT_SITE_URL } from "@/config/site";

export type EnvMap = Record<string, string | undefined>;
export type Issue = { level: "error" | "warn"; key: string; message: string };

/** 헷갈리는 글자(0/O, 1/l/I)를 뺀 영숫자 — 전달·입력하기 쉬운 비밀번호용 */
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 20, bytes: (n: number) => Buffer = randomBytes): string {
    // 편향 없이 고르기 위해 알파벳 길이의 배수 미만 바이트만 사용한다
    const limit = 256 - (256 % PASSWORD_ALPHABET.length);
    let out = "";
    while (out.length < length) {
        for (const b of bytes(length * 2)) {
            if (b < limit && out.length < length) out += PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length];
        }
    }
    return out;
}

export function generateSecret(bytes: (n: number) => Buffer = randomBytes): string {
    return bytes(32).toString("hex");
}

const WEAK_PASSWORDS = new Set(["password", "12345678", "123456789", "qwerty123", "admin1234", "changeme", "wls-local-test"]);
const PLACEHOLDER = /^(your_|<|changeme|todo)/i;

export function validateEnv(env: EnvMap, mode: "production" | "local" = "production"): Issue[] {
    const issues: Issue[] = [];
    const add = (level: Issue["level"], key: string, message: string) => issues.push({ level, key, message });
    const val = (key: string) => (env[key] ?? "").trim();

    const projectId = val("NEXT_PUBLIC_SANITY_PROJECT_ID");
    if (!projectId || PLACEHOLDER.test(projectId)) {
        add("error", "NEXT_PUBLIC_SANITY_PROJECT_ID", `비어 있어요. 비워 두면 이 저장소의 기본 프로젝트(${DEFAULT_SANITY_PROJECT_ID})를 읽어요. 고객의 Sanity 프로젝트 ID를 넣어 주세요.`);
    } else if (!/^[a-z0-9]{8}$/.test(projectId)) {
        add("error", "NEXT_PUBLIC_SANITY_PROJECT_ID", "Sanity 프로젝트 ID는 영문 소문자·숫자 8자예요. sanity.io/manage에서 다시 확인해 주세요.");
    } else if (projectId === DEFAULT_SANITY_PROJECT_ID) {
        add("warn", "NEXT_PUBLIC_SANITY_PROJECT_ID", "이 저장소의 기본(원래 고객) 프로젝트와 같아요. 새 고객이라면 고객 프로젝트의 ID여야 해요.");
    }

    const dataset = val("NEXT_PUBLIC_SANITY_DATASET");
    if (dataset && !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(dataset)) add("error", "NEXT_PUBLIC_SANITY_DATASET", "데이터셋 이름은 영문 소문자·숫자·-·_만 쓸 수 있어요.");

    const siteUrl = val("NEXT_PUBLIC_SITE_URL");
    if (!siteUrl) {
        add("warn", "NEXT_PUBLIC_SITE_URL", `비어 있으면 기본 주소(${DEFAULT_SITE_URL})로 나가요. 고객 사이트 주소를 넣어 주세요.`);
    } else {
        let url: URL | null = null;
        try { url = new URL(siteUrl); } catch { /* 아래에서 처리 */ }
        if (!url || url.protocol !== "https:") add("error", "NEXT_PUBLIC_SITE_URL", "https://로 시작하는 주소여야 해요.");
        else if (url.origin + "/" !== url.href && url.origin !== url.href) add("warn", "NEXT_PUBLIC_SITE_URL", "경로 없이 도메인만 넣어 주세요. (예: https://example.com)");
        else if (siteUrl.replace(/\/+$/, "") === DEFAULT_SITE_URL) add("warn", "NEXT_PUBLIC_SITE_URL", "원래 고객의 주소와 같아요. 새 고객이라면 그 고객 주소여야 해요.");
    }

    const password = val("MANAGE_PASSWORD");
    if (!password) add("error", "MANAGE_PASSWORD", "비어 있으면 관리 화면에 로그인할 수 없어요.");
    else if (WEAK_PASSWORDS.has(password.toLowerCase())) add(mode === "local" ? "warn" : "error", "MANAGE_PASSWORD", "흔한 비밀번호예요. `npm run provision -- init`으로 만든 값을 쓰세요.");
    else if (password.length < 12) add("warn", "MANAGE_PASSWORD", "12자 이상을 권장해요.");

    const secret = val("MANAGE_SECRET");
    if (!secret) add("error", "MANAGE_SECRET", "비어 있으면 관리 화면 로그인이 동작하지 않아요.");
    else if (secret.length < 32) add("error", "MANAGE_SECRET", "32자 이상이어야 해요. `npm run provision -- init`으로 만든 값을 쓰세요.");
    if (secret && password && secret === password) add("error", "MANAGE_SECRET", "비밀번호와 같은 값이에요. 서명용 시크릿은 따로 만들어 주세요.");

    const token = val("SANITY_API_WRITE_TOKEN");
    if (!token || PLACEHOLDER.test(token)) add(mode === "local" ? "warn" : "error", "SANITY_API_WRITE_TOKEN", mode === "local" ? "없으면 관리 화면은 읽기 전용이에요(로컬 기본값)." : "비어 있으면 관리 화면에서 저장할 수 없어요. Sanity에서 Editor 권한 토큰을 발급해 넣어 주세요.");
    if (mode === "local" && token) add("warn", "SANITY_API_WRITE_TOKEN", "로컬에 쓰기 토큰이 있으면 개발 서버의 저장이 실제 데이터셋에 써져요. 시험할 때 주의하세요.");

    return issues;
}

export type InitValues = { projectId: string; dataset: string; siteUrl: string; password: string; secret: string };

/** 새 .env 파일 내용. 쓰기 토큰은 발급 후 직접 넣도록 비워 둔다. */
export function renderEnvFile(v: InitValues): string {
    return `# 고객 설치용 환경변수 — 생성: npm run provision -- init
# 이 파일은 git에 올리지 않아요(.env.local). Vercel에는 같은 이름·값으로 직접 입력해요.

NEXT_PUBLIC_SANITY_PROJECT_ID=${v.projectId}
NEXT_PUBLIC_SANITY_DATASET=${v.dataset}
NEXT_PUBLIC_SANITY_API_VERSION=2025-03-01
NEXT_PUBLIC_SITE_URL=${v.siteUrl}

# 관리 화면(/manage) 로그인
MANAGE_PASSWORD=${v.password}
MANAGE_SECRET=${v.secret}

# Sanity Editor 권한 토큰 — sanity.io/manage → 프로젝트 → API → Tokens → Add API token
# (로컬에는 두지 않는 것이 안전해요. 로컬 개발 서버의 저장이 실제 데이터에 써져요.)
SANITY_API_WRITE_TOKEN=

# 선택: Studio 미리보기용 읽기 토큰
SANITY_API_READ_TOKEN=
`;
}

/** Vercel 환경변수 입력용 목록(값에 따옴표 없이 그대로). 로컬 전용 항목은 뺀다. */
export function vercelEnvList(v: InitValues): [string, string][] {
    return [
        ["NEXT_PUBLIC_SANITY_PROJECT_ID", v.projectId],
        ["NEXT_PUBLIC_SANITY_DATASET", v.dataset],
        ["NEXT_PUBLIC_SANITY_API_VERSION", "2025-03-01"],
        ["NEXT_PUBLIC_SITE_URL", v.siteUrl],
        ["MANAGE_PASSWORD", v.password],
        ["MANAGE_SECRET", v.secret],
        ["SANITY_API_WRITE_TOKEN", "(Sanity에서 발급한 Editor 토큰)"],
    ];
}

/** .env 형식 텍스트를 읽어 값 맵으로 만든다(주석·빈 줄 무시, 값의 따옴표 제거). */
export function parseEnvText(text: string): EnvMap {
    const out: EnvMap = {};
    for (const line of text.split("\n")) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    }
    return out;
}
