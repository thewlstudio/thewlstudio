/**
 * 새 고객 설치 도우미 (파일만 다루고, Sanity·Vercel 계정에는 아무것도 만들지 않는다).
 *
 *   npm run provision -- init --project-id <8자> --site-url https://고객도메인 [--dataset production] [--write]
 *       → 로그인 비밀번호·세션 시크릿을 안전하게 만들어 .env 내용과 Vercel 입력 목록을 보여 준다.
 *         --write를 주면 .env.local을 만든다(이미 있으면 덮어쓰지 않고 멈춘다).
 *   npm run provision -- check [--env-file .env.local] [--local]
 *       → 환경변수가 설치 기준(필수 값, 길이, 옛 고객 값이 남았는지)을 만족하는지 점검한다. 값은 출력하지 않는다.
 *
 * 전체 절차: docs/INSTALL_GUIDE.md
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generatePassword, generateSecret, parseEnvText, renderEnvFile, validateEnv, vercelEnvList, type InitValues } from "../src/lib/provision-core";

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => rest.includes(`--${name}`);
const option = (name: string) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
};

function init() {
    const projectId = option("project-id");
    const siteUrl = option("site-url");
    if (!projectId || !siteUrl) {
        console.error("필요한 값: --project-id <Sanity 프로젝트 ID> --site-url https://고객도메인");
        process.exit(2);
    }
    const values: InitValues = { projectId, dataset: option("dataset") ?? "production", siteUrl: siteUrl.replace(/\/+$/, ""), password: generatePassword(), secret: generateSecret() };
    const preIssues = validateEnv({ NEXT_PUBLIC_SANITY_PROJECT_ID: values.projectId, NEXT_PUBLIC_SANITY_DATASET: values.dataset, NEXT_PUBLIC_SITE_URL: values.siteUrl, MANAGE_PASSWORD: values.password, MANAGE_SECRET: values.secret, SANITY_API_WRITE_TOKEN: "x" }).filter((i) => i.level === "error");
    if (preIssues.length > 0) {
        for (const i of preIssues) console.error(`✗ ${i.key}: ${i.message}`);
        process.exit(1);
    }
    const file = resolve(process.cwd(), ".env.local");
    if (flag("write")) {
        if (existsSync(file)) {
            console.error(`✗ ${file} 이(가) 이미 있어요. 덮어쓰지 않아요. 지우거나 이름을 바꾼 뒤 다시 실행하세요.`);
            process.exit(1);
        }
        writeFileSync(file, renderEnvFile(values), { mode: 0o600 });
        console.log(`✓ ${file} 을(를) 만들었어요. (쓰기 토큰은 비어 있어요 — 발급 후 Vercel에만 넣는 것을 권장해요)`);
    } else {
        console.log("--- .env 내용(저장하려면 --write를 붙여 다시 실행) ---\n");
        console.log(renderEnvFile(values));
    }
    console.log("\n--- Vercel → Project → Settings → Environment Variables 에 입력할 값 ---");
    for (const [k, v] of vercelEnvList(values)) console.log(`${k.padEnd(34)} ${v}`);
    console.log("\n※ MANAGE_PASSWORD는 고객 소유자에게 안전한 경로로 전달하세요(채팅·이메일 본문 대신 비밀번호 관리 도구 권장). 이 화면은 다시 보여 주지 않아요.");
}

function check() {
    const file = resolve(process.cwd(), option("env-file") ?? ".env.local");
    if (!existsSync(file)) {
        console.error(`✗ ${file} 이(가) 없어요.`);
        process.exit(2);
    }
    const issues = validateEnv(parseEnvText(readFileSync(file, "utf8")), flag("local") ? "local" : "production");
    for (const i of issues) console.log(`${i.level === "error" ? "✗ 오류" : "△ 주의"}  ${i.key}: ${i.message}`);
    const errors = issues.filter((i) => i.level === "error").length;
    console.log(errors === 0 ? `\n✓ 필수 점검 통과${issues.length ? ` (주의 ${issues.length}건)` : ""}` : `\n✗ 오류 ${errors}건을 고쳐 주세요.`);
    process.exit(errors === 0 ? 0 : 1);
}

if (command === "init") init();
else if (command === "check") check();
else {
    console.error("사용법: npm run provision -- init --project-id <ID> --site-url <https://…> [--dataset production] [--write]\n        npm run provision -- check [--env-file .env.local] [--local]");
    process.exit(2);
}
