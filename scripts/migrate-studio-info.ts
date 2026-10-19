/**
 * 일회성 이전 스크립트: /studio에 하드코딩돼 있던 서비스·장비·멤버십·이용 안내(FALLBACK_INFO)를
 * Sanity의 studioInfo 문서(_id "studioInfo")로 옮긴다. 이미 있으면 건드리지 않는다.
 * 사용: npx tsx scripts/migrate-studio-info.ts [--apply]
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createClient } from "@sanity/client";
import { FALLBACK_INFO } from "../src/lib/studio-info";

const apply = process.argv.includes("--apply");
const k = (p: string, i: number) => `${p}${String(i + 1).padStart(2, "0")}`;

async function main() {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"));
    const client = createClient({ projectId: "antidcuz", dataset: "production", apiVersion: "2024-01-01", token: cfg.authToken, useCdn: false });
    if (await client.fetch<number>(`count(*[_id == "studioInfo"])`)) {
        console.log("SKIP  studioInfo (이미 있음)");
        return;
    }
    const i = FALLBACK_INFO;
    const doc = {
        _id: "studioInfo",
        _type: "studioInfo",
        ...i,
        services: i.services.map((s, n) => ({ _key: k("svc", n), ...s })),
        equipment: i.equipment.map((e, n) => ({ _key: k("eq", n), ...e })),
        memberships: i.memberships.map((m, n) => ({ _key: k("mem", n), ...m })),
    };
    console.log(`${apply ? "CREATE" : "PLAN  "} studioInfo: 서비스 ${doc.services.length}, 장비그룹 ${doc.equipment.length}, 멤버십 ${doc.memberships.length}`);
    if (apply) await client.createIfNotExists(doc);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
