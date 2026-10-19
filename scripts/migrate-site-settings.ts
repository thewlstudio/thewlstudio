/**
 * 일회성 이전 스크립트: 코드에 고정돼 있던 연락처·링크(FALLBACK_SETTINGS)를
 * Sanity의 siteSettings 문서(_id "siteSettings")로 옮긴다.
 * 이미 문서가 있으면 건드리지 않는다. 사용: npx tsx scripts/migrate-site-settings.ts [--apply]
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createClient } from "@sanity/client";
import { FALLBACK_SETTINGS } from "../src/lib/site-settings";

const apply = process.argv.includes("--apply");

async function main() {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"));
    const client = createClient({ projectId: "antidcuz", dataset: "production", apiVersion: "2024-01-01", token: cfg.authToken, useCdn: false });
    const exists = await client.fetch<number>(`count(*[_id == "siteSettings"])`);
    if (exists) {
        console.log("SKIP  siteSettings (이미 있음)");
        return;
    }
    console.log(`${apply ? "CREATE" : "PLAN  "} siteSettings`, FALLBACK_SETTINGS);
    if (apply) await client.createIfNotExists({ _id: "siteSettings", _type: "siteSettings", ...FALLBACK_SETTINGS });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
