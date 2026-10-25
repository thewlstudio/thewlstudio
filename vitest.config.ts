import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    esbuild: { jsx: "automatic" },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            // 서버 전용 표시 패키지는 테스트(Node)에서 그대로 불러올 수 있게 빈 모듈로 대체한다
            "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.{ts,tsx}"],
    },
});
