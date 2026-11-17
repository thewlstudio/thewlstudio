import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkout = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"; // v7.0.1
const setupNode = "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1"; // v7.1.0
const uploadArtifact = "actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9"; // v7.0.2
const workflow = (name: string) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

describe("GitHub 공식 작업 도구와 백업 호환성", () => {
    it.each(["ci.yml", "backup.yml"])("%s는 확인한 공식 릴리스의 전체 커밋으로 도구를 고정한다", (name) => {
        const source = workflow(name);
        const actions = Array.from(source.matchAll(/^\s+- uses:\s+(\S+)/gm), (match) => match[1]);
        expect(actions).toEqual(name === "ci.yml" ? [checkout, setupNode] : [checkout, setupNode, uploadArtifact]);
        expect(source).toContain("node-version-file: .nvmrc");
        expect(source).toContain("cache: npm");
    });

    it("백업의 일정·이름·보관 기간·ZIP 형식과 누락 파일 실패 정책을 유지한다", () => {
        const source = workflow("backup.yml");
        expect(source).toContain('cron: "0 18 * * 0"');
        expect(source).toContain("name: sanity-backup");
        expect(source).toContain("path: backups/*.tar.gz");
        expect(source).toContain("archive: true");
        expect(source).toContain("retention-days: 35");
        expect(source).toContain("if-no-files-found: error");
    });
});
