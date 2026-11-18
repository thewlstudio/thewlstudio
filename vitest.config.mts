import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    oxc: { jsx: { runtime: "automatic" } },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            // 서버 전용 표시 패키지는 테스트(Node)에서 그대로 불러올 수 있게 빈 모듈로 대체한다
            "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: [fileURLToPath(new URL("./src/test/setup-browser-storage.ts", import.meta.url))],
    },
});
