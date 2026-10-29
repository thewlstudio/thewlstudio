/**
 * 일회성 이전 스크립트: 홈페이지 소개 문구(제목·본문)를 siteSettings 문서에 채운다.
 * 이미 값이 있는 필드는 건드리지 않는다(setIfMissing). 사용: npx tsx scripts/migrate-home-intro.ts [--apply]
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { scriptClient } from "./lib/sanity-client";
import { FALLBACK_SETTINGS } from "../src/lib/site-settings";

const apply = process.argv.includes("--apply");

async function main() {
    const client = scriptClient();
    const cur = await client.fetch<{ homeHeadline?: string; homeIntro?: string } | null>(`*[_id == "siteSettings"][0]{ homeHeadline, homeIntro }`);
    if (!cur) throw new Error("siteSettings 문서가 없습니다. 먼저 migrate-site-settings를 실행하세요.");
    const missing = { homeHeadline: !cur.homeHeadline, homeIntro: !cur.homeIntro };
    console.log(apply ? "APPLY" : "PLAN ", missing);
    if (!apply || (!missing.homeHeadline && !missing.homeIntro)) return;
    await client
        .patch("siteSettings")
        .setIfMissing({ homeHeadline: FALLBACK_SETTINGS.homeHeadline, homeIntro: FALLBACK_SETTINGS.homeIntro })
        .commit();
    console.log("완료");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
