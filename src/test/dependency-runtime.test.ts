import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import testConfig from "../../vitest.config.mjs";

const project = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8"));

describe("설치 런타임과 테스트 설정 정책", () => {
    it("프로젝트와 잠금 파일은 Node 26만 선택하고 Sanity의 최소 버전과 구분한다", () => {
        expect(project.engines.node).toBe("26.x");
        expect(lock.packages[""].engines.node).toBe(project.engines.node);
        expect(lock.packages["node_modules/sanity"].engines.node).toBe(">=22.12");
    });
    it.each(["ci.yml", "backup.yml"])("개발 환경과 %s는 같은 .nvmrc의 Node 26을 사용한다", (workflow) => {
        expect(readFileSync(new URL("../../.nvmrc", import.meta.url), "utf8").trim()).toBe("26");
        expect(readFileSync(new URL(`../../.github/workflows/${workflow}`, import.meta.url), "utf8")).toContain("node-version-file: .nvmrc");
    });
    it("JSX 변환은 Vite 8의 Oxc를 사용하고 선택 의존성인 esbuild에 기대지 않는다", () => {
        expect(testConfig).toMatchObject({ oxc: { jsx: { runtime: "automatic" } } });
        expect(testConfig).not.toHaveProperty("esbuild");
    });
});
