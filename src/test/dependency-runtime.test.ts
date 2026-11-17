import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const project = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8"));

describe("Sanity 6 설치 런타임 정책", () => {
    it("프로젝트와 잠금 파일 모두 Sanity의 최소 Node 22.12를 요구한다", () => {
        expect(project.engines.node).toBe(">=22.12");
        expect(lock.packages[""].engines.node).toBe(project.engines.node);
        expect(lock.packages["node_modules/sanity"].engines.node).toBe(project.engines.node);
    });
    it("개발 환경과 CI는 같은 .nvmrc의 Node 22를 사용한다", () => {
        expect(readFileSync(new URL("../../.nvmrc", import.meta.url), "utf8").trim()).toBe("22");
        expect(readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8")).toContain("node-version-file: .nvmrc");
    });
});
