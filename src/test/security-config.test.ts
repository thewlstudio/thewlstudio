import { beforeAll, describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import config from "../../next.config.mjs";

type Rule = { source: string; headers: { key: string; value: string }[] };
let rules: Rule[];
beforeAll(async () => { rules = await config.headers!(); });
function matching(path: string) { return rules.filter((rule) => getPathMatch(rule.source)(path) !== false); }
function headers(path: string) { return new Map(matching(path).flatMap((rule) => rule.headers.map(({ key, value }) => [key.toLowerCase(), value] as const))); }

describe("실제 Next 경로 매처의 보안 헤더 구분", () => {
    it.each(["/", "/works", "/manage/login", "/administrator", "/admin-help", "/administer/a", "/admin%2Fdesk"])("일반 주소 %s에는 공개용 CSP와 공통 보호를 적용한다", (path) => {
        const values = headers(path);
        expect(matching(path)).toHaveLength(1);
        expect(values.get("x-frame-options")).toBe("SAMEORIGIN");
        expect(values.get("x-content-type-options")).toBe("nosniff");
        expect(values.get("content-security-policy")).toContain("default-src 'self'");
        expect(values.get("content-security-policy")).not.toContain("unsafe-eval");
        expect(values.get("content-security-policy")).not.toContain("design-system-static.sanity.io");
        expect(values.get("content-security-policy")).toContain("https://www.youtube.com");
    });
    it.each(["/admin", "/admin/", "/admin/desk"])("실제 Studio %s에만 기존 실행·글꼴 예외를 유지한다", (path) => {
        const policy = headers(path).get("content-security-policy");
        expect(matching(path)).toHaveLength(1);
        expect(policy).toContain("'unsafe-eval'");
        expect(policy).toContain("font-src 'self' data: https://design-system-static.sanity.io");
        expect(policy).not.toContain("core.sanity-cdn.com");
        expect(policy).not.toContain("https://www.youtube.com");
    });
});
