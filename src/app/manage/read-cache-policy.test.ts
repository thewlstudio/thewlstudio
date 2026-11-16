import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname);
const source = (name: string) => readFileSync(path.join(root, name), "utf8");
const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((item) => item.isFile() && /\.(ts|tsx)$/.test(item.name) && !/\.test\./.test(item.name))
    .map((item) => path.relative(root, path.join(item.parentPath, item.name)));
const reads = files.filter((name) => name.endsWith("page.tsx") && /(?:client|sanity)\.(?:fetch|getDocument)\s*[<(]|listRevisions\(sanity/.test(source(name)));

describe("관리자 읽기 캐시의 소스 경계", () => {
    it("개별 페이지나 로그인 설정에 의존하지 않고 관리자 전체를 동적으로 렌더링한다", () => {
        expect(source("layout.tsx")).toMatch(/export const dynamic = ["']force-dynamic["']/);
    });
    it("현재 CMS 읽기 페이지 12곳을 검사한다", () => {
        expect(reads.sort()).toEqual([
            "contact/page.tsx", "crew/[id]/page.tsx", "crew/page.tsx", "history/[area]/[id]/page.tsx",
            "instructors/[id]/page.tsx", "instructors/page.tsx", "page.tsx", "studio/[id]/page.tsx",
            "studio/info/page.tsx", "studio/page.tsx", "works/[id]/page.tsx", "works/page.tsx",
        ]);
    });
    it.each(reads)("%s는 인증 확인 뒤에만 CMS를 읽는다", (name) => {
        const text = source(name); const auth = text.indexOf("await isAuthenticated()");
        const read = text.search(/(?:client|sanity)\.(?:fetch|getDocument)\s*[<(]|listRevisions\(sanity/);
        expect(auth).toBeGreaterThanOrEqual(0); expect(read).toBeGreaterThan(auth);
    });
    it("관리자 코드에서 공개 ISR 조회나 영구 데이터 캐시를 사용하지 않는다", () => {
        const bad = files.filter((name) => /\bsanityFetch\s*\(|\bunstable_cache\s*\(|["']use cache(?::[^"']*)?["']|["']force-cache["']|["']force-static["']/.test(source(name)));
        expect(bad).toEqual([]);
    });
});
