/**
 * 백업 파일 점검: npx tsx scripts/verify-backup.ts <백업.tar.gz> [--require type1,type2] [--min 문서수]
 * `sanity dataset export`가 만든 tar.gz 안의 data.ndjson을 읽어 문서 수·종류·깨진 줄을 확인한다. 네트워크·쓰기 없음.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { checkBackup, formatSummary, summarizeNdjson } from "../src/lib/backup-verify";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--require" && args[args.indexOf(a) - 1] !== "--min");
const option = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

if (!file || !existsSync(file)) {
    console.error("사용법: npx tsx scripts/verify-backup.ts <백업.tar.gz> [--require siteSettings,studioInfo] [--min 1]");
    process.exit(2);
}
let text: string;
try {
    // 내보내기 파일은 최상위 폴더 아래에 data.ndjson이 있다 — 경로 패턴으로 찾는다
    const listing = execFileSync("tar", ["-tzf", file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n");
    const entry = listing.find((p) => /(^|\/)data\.ndjson$/.test(p));
    if (!entry) throw new Error("data.ndjson이 없어요. Sanity 내보내기 파일이 맞는지 확인해 주세요.");
    text = execFileSync("tar", ["-xzOf", file, entry], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 });
} catch (e) {
    console.error(`✗ 백업 파일을 열지 못했어요: ${(e as Error).message}`);
    process.exit(1);
}
const summary = summarizeNdjson(text);
const required = option("require")?.split(",").filter(Boolean);
const check = checkBackup(summary, { requireTypes: required, minTotal: option("min") ? Number(option("min")) : undefined });
console.log(`파일: ${file} (${(statSync(file).size / 1024 / 1024).toFixed(1)}MB)`);
console.log(`내용: ${formatSummary(summary)}`);
if (check.ok) console.log("✓ 백업 점검 통과");
else {
    for (const p of check.problems) console.error(`✗ ${p}`);
    process.exit(1);
}
