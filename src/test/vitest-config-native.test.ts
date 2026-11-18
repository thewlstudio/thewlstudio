import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("Node가 설정을 직접 읽어도 실행 위치와 무관하게 기존 경로·JSX·저장소 설정을 유지한다", () => {
    const configUrl = new URL("../../vitest.config.mts", import.meta.url);
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
        const { default: config } = await import(${JSON.stringify(configUrl.href)});
        console.log(JSON.stringify(config));
    `], { cwd: tmpdir(), encoding: "utf8", timeout: 5000 });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain("MODULE_TYPELESS_PACKAGE_JSON");
    const config = JSON.parse(result.stdout);
    expect(config.resolve.alias).toEqual({
        "@": fileURLToPath(new URL("../../src", import.meta.url)),
        "server-only": fileURLToPath(new URL("./server-only-stub.ts", import.meta.url)),
    });
    expect(config.oxc).toEqual({ jsx: { runtime: "automatic" } });
    expect(config.test).toMatchObject({
        environment: "node",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: [fileURLToPath(new URL("./setup-browser-storage.ts", import.meta.url))],
    });
});
