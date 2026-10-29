/**
 * 일회성·설치용 스크립트가 같이 쓰는 Sanity 클라이언트.
 *
 * 프로젝트·데이터셋은 앱과 같은 환경변수(NEXT_PUBLIC_SANITY_PROJECT_ID / _DATASET)에서 읽고(.env.local 포함),
 * 토큰은 SANITY_API_WRITE_TOKEN이 있으면 그것을, 없으면 `sanity login`으로 저장된 CLI 토큰을 쓴다.
 * 다른 고객 프로젝트에서 같은 스크립트를 쓰려면 환경변수만 바꾸면 된다.
 */
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createClient } from "@sanity/client";

function loadDotEnvLocal() {
    const file = join(process.cwd(), ".env.local");
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
}

export function scriptClient() {
    loadDotEnvLocal();
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
    if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID가 없어요. .env.local을 확인해 주세요.");
    const token = process.env.SANITY_API_WRITE_TOKEN || JSON.parse(readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8")).authToken;
    console.log(`대상: ${projectId} / ${dataset}`);
    return createClient({ projectId, dataset, apiVersion: "2024-01-01", token, useCdn: false });
}
