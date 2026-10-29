import { describe, expect, it } from "vitest";
import { generatePassword, generateSecret, parseEnvText, renderEnvFile, validateEnv, vercelEnvList, type EnvMap } from "./provision-core";
import { DEFAULT_SANITY_PROJECT_ID, DEFAULT_SITE_URL } from "@/config/site";

const good = (): EnvMap => ({
    NEXT_PUBLIC_SANITY_PROJECT_ID: "abcd1234", NEXT_PUBLIC_SANITY_DATASET: "production", NEXT_PUBLIC_SITE_URL: "https://studio.example",
    MANAGE_PASSWORD: generatePassword(), MANAGE_SECRET: generateSecret(), SANITY_API_WRITE_TOKEN: "sk-test",
});
const keys = (env: EnvMap, mode?: "production" | "local") => validateEnv(env, mode).map((i) => `${i.level}:${i.key}`);

describe("비밀번호·시크릿 생성", () => {
    it("비밀번호는 요청한 길이이고 헷갈리는 글자(0 O 1 l I)가 없다", () => {
        for (let i = 0; i < 50; i++) {
            const p = generatePassword(20);
            expect(p).toHaveLength(20);
            expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
        }
    });
    it("매번 다른 값이다", () => {
        expect(new Set(Array.from({ length: 20 }, () => generatePassword())).size).toBe(20);
        expect(new Set(Array.from({ length: 20 }, () => generateSecret())).size).toBe(20);
    });
    it("시크릿은 64자 16진수(32바이트)다", () => expect(generateSecret()).toMatch(/^[0-9a-f]{64}$/));
    it("편향 방지: 한도 이상의 바이트는 건너뛰고 계속 뽑는다", () => {
        let call = 0;
        const bytes = (n: number) => Buffer.from(Array.from({ length: n }, () => (call++ < 3 ? 255 : 7)));
        expect(generatePassword(4, bytes)).toBe("AAAA".replace(/A/g, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"[7]));
    });
});

describe("환경변수 점검", () => {
    it("정상 값이면 문제가 없다", () => expect(validateEnv(good())).toEqual([]));
    it("프로젝트 ID가 비면 오류 — 비워 두면 원래 고객 프로젝트를 읽기 때문", () => {
        const env = { ...good(), NEXT_PUBLIC_SANITY_PROJECT_ID: "" };
        const issue = validateEnv(env).find((i) => i.key === "NEXT_PUBLIC_SANITY_PROJECT_ID")!;
        expect(issue.level).toBe("error");
        expect(issue.message).toContain(DEFAULT_SANITY_PROJECT_ID);
    });
    it.each(["your_project_id", "ABCD1234", "abc", "abcd12345", "ab cd123"])("프로젝트 ID 형식이 틀리면 오류: %s", (id) => {
        expect(keys({ ...good(), NEXT_PUBLIC_SANITY_PROJECT_ID: id })).toContain("error:NEXT_PUBLIC_SANITY_PROJECT_ID");
    });
    it("원래 고객의 프로젝트·주소를 그대로 쓰면 주의", () => {
        expect(keys({ ...good(), NEXT_PUBLIC_SANITY_PROJECT_ID: DEFAULT_SANITY_PROJECT_ID })).toContain("warn:NEXT_PUBLIC_SANITY_PROJECT_ID");
        expect(keys({ ...good(), NEXT_PUBLIC_SITE_URL: DEFAULT_SITE_URL + "/" })).toContain("warn:NEXT_PUBLIC_SITE_URL");
    });
    it.each(["http://studio.example", "studio.example", "ftp://x.example"])("사이트 주소는 https여야 한다: %s", (url) => {
        expect(keys({ ...good(), NEXT_PUBLIC_SITE_URL: url })).toContain("error:NEXT_PUBLIC_SITE_URL");
    });
    it("사이트 주소에 경로가 있으면 주의, 비어 있으면 기본 주소 안내", () => {
        expect(keys({ ...good(), NEXT_PUBLIC_SITE_URL: "https://studio.example/ko" })).toContain("warn:NEXT_PUBLIC_SITE_URL");
        expect(keys({ ...good(), NEXT_PUBLIC_SITE_URL: "" })).toContain("warn:NEXT_PUBLIC_SITE_URL");
    });
    it("비밀번호: 비면 오류, 흔한 값은 운영에서 오류·로컬에서 주의, 짧으면 주의", () => {
        expect(keys({ ...good(), MANAGE_PASSWORD: "" })).toContain("error:MANAGE_PASSWORD");
        expect(keys({ ...good(), MANAGE_PASSWORD: "wls-local-test" })).toContain("error:MANAGE_PASSWORD");
        expect(keys({ ...good(), MANAGE_PASSWORD: "wls-local-test" }, "local")).toContain("warn:MANAGE_PASSWORD");
        expect(keys({ ...good(), MANAGE_PASSWORD: "Abcdefgh234" })).toContain("warn:MANAGE_PASSWORD");
    });
    it("시크릿: 비거나 32자 미만이거나 비밀번호와 같으면 오류", () => {
        expect(keys({ ...good(), MANAGE_SECRET: "" })).toContain("error:MANAGE_SECRET");
        expect(keys({ ...good(), MANAGE_SECRET: "short" })).toContain("error:MANAGE_SECRET");
        const same = "x".repeat(40);
        expect(keys({ ...good(), MANAGE_PASSWORD: same, MANAGE_SECRET: same })).toContain("error:MANAGE_SECRET");
    });
    it("쓰기 토큰: 운영에서는 필수(오류), 로컬에서는 없어도 주의만, 있으면 경고", () => {
        expect(keys({ ...good(), SANITY_API_WRITE_TOKEN: "" })).toContain("error:SANITY_API_WRITE_TOKEN");
        expect(keys({ ...good(), SANITY_API_WRITE_TOKEN: "" }, "local")).toContain("warn:SANITY_API_WRITE_TOKEN");
        expect(keys(good(), "local")).toContain("warn:SANITY_API_WRITE_TOKEN");
    });
    it("점검 결과에는 비밀 값이 들어가지 않는다", () => {
        const env = { ...good(), MANAGE_PASSWORD: "SECRET-PW-VALUE-123", SANITY_API_WRITE_TOKEN: "TOKEN-VALUE-ABC" };
        expect(JSON.stringify(validateEnv({ ...env, MANAGE_SECRET: "short-SECRET-VALUE" }))).not.toMatch(/SECRET-PW-VALUE|TOKEN-VALUE|short-SECRET-VALUE/);
    });
});

describe("env 파일 생성·읽기", () => {
    const values = { projectId: "abcd1234", dataset: "production", siteUrl: "https://studio.example", password: "Pw-abc-234-xyz-777", secret: "f".repeat(64) };
    it("만든 파일을 다시 읽으면 같은 값이고, 쓰기 토큰은 비어 있다", () => {
        const env = parseEnvText(renderEnvFile(values));
        expect(env).toMatchObject({ NEXT_PUBLIC_SANITY_PROJECT_ID: "abcd1234", NEXT_PUBLIC_SITE_URL: "https://studio.example", MANAGE_PASSWORD: values.password, MANAGE_SECRET: values.secret, SANITY_API_WRITE_TOKEN: "" });
    });
    it("Vercel 목록에는 로컬 전용 항목이 없고 쓰기 토큰 자리 안내가 있다", () => {
        const list = vercelEnvList(values);
        expect(list.map(([k]) => k)).toEqual(["NEXT_PUBLIC_SANITY_PROJECT_ID", "NEXT_PUBLIC_SANITY_DATASET", "NEXT_PUBLIC_SANITY_API_VERSION", "NEXT_PUBLIC_SITE_URL", "MANAGE_PASSWORD", "MANAGE_SECRET", "SANITY_API_WRITE_TOKEN"]);
        expect(list.at(-1)![1]).toContain("Editor");
    });
    it("주석·빈 줄·따옴표를 처리한다", () => {
        expect(parseEnvText('# c\n\nA=1\nB="two"\nC=\'three\'\n  D = 4  \nlower=x')).toEqual({ A: "1", B: "two", C: "three", D: "4" });
    });
});
