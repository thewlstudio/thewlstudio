/**
 * 스모크 점검: 실행 중인 서버(기본 http://localhost:3000)의 핵심 경로가 살아 있는지 확인한다.
 *   node scripts/smoke.mjs [주소]     예) node scripts/smoke.mjs https://whitelightstudio.vercel.app
 * - 공개 페이지는 200, 관리 화면은 로그인 없이 열리지 않고(로그인으로 이동), 관리 화면은 검색엔진에 노출되지 않아야 한다.
 */
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const failures = [];
let checks = 0;

async function get(path) {
    const res = await fetch(base + path, { redirect: "manual" });
    return { status: res.status, location: res.headers.get("location") ?? "", text: await res.text().catch(() => "") };
}
function check(name, ok, detail = "") {
    checks++;
    if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

// 1. 공개 페이지
for (const p of ["/", "/works", "/crew", "/studio", "/class", "/contact", "/robots.txt"]) {
    const r = await get(p);
    check(`공개 ${p} → 200`, r.status === 200, `status ${r.status}`);
}
const sm = await get("/sitemap.xml");
check("사이트맵 → 200 + urlset", sm.status === 200 && sm.text.includes("<urlset"), `status ${sm.status}`);

// 목록만 정상이면서 상세 본문은 404인 회귀도 잡는다. 사이트맵의 URL은
// 경로만 사용해, 점검 대상으로 지정한 서버 밖으로 요청하지 않는다.
const detailPaths = new Set();
for (const match of sm.text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    try {
        const url = new URL(match[1].replace(/&amp;/g, "&"));
        if (/^\/(works|crew)\/[^/]+$/.test(url.pathname)) detailPaths.add(url.pathname);
    } catch {
        check("사이트맵 URL 형식", false);
    }
}
for (const path of detailPaths) {
    const r = await get(path);
    check(`상세 ${path} → 200 + 본문 제목`, r.status === 200 && /<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(r.text), `status ${r.status}`);
}

// 2. 관리 화면은 로그인 없이 열리지 않는다 (307 이동, 또는 스트리밍 화면이면 본문에 데이터가 없어야 함)
for (const p of ["/manage", "/manage/crew", "/manage/crew/new", "/manage/works", "/manage/works/new", "/manage/studio", "/manage/studio/info", "/manage/contact", "/manage/help", "/manage/map", "/manage/history/crew/x"]) {
    const r = await get(p);
    const redirected = (r.status === 307 || r.status === 308) && r.location.includes("/manage/login");
    check(`관리 ${p} → 로그인으로 이동`, redirected, `status ${r.status} → ${r.location}`);
}
const inst = await get("/manage/instructors"); // 스트리밍 화면이라 200으로 시작할 수 있다
check(
    "관리 /manage/instructors → 로그인 없이 데이터가 나오지 않음",
    inst.status === 307 || (inst.status === 200 && !/김수안|이윤진|오승환/.test(inst.text)),
    `status ${inst.status}`,
);

// 2-1. 미리보기: 로그인 없이는 켜지지 않고, 예전 무인증 켜기 경로는 막혀 있다
const preview = await fetch(base + "/manage/preview?to=/", { redirect: "manual" });
check("미리보기 /manage/preview → 로그인 없이는 로그인으로 이동", (preview.status === 307 || preview.status === 308) && (preview.headers.get("location") ?? "").includes("/manage/login") && !/__prerender_bypass/.test(preview.headers.get("set-cookie") ?? ""), `status ${preview.status}`);
const legacyDraft = await fetch(base + "/api/draft?slug=/", { redirect: "manual" });
check("예전 /api/draft → 403 (미리보기 모드를 켜지 않음)", legacyDraft.status === 403 && !/__prerender_bypass/.test(legacyDraft.headers.get("set-cookie") ?? ""), `status ${legacyDraft.status}`);

// 3. 로그인 화면과 검색엔진 노출 차단
const login = await get("/manage/login");
check("관리 로그인 → 200", login.status === 200, `status ${login.status}`);
check("관리 화면은 검색엔진 노출 차단(noindex)", /<meta name="robots" content="[^"]*noindex/.test(login.text));

// 4. 보안 헤더
const home = await fetch(base + "/");
check("보안 헤더(X-Frame-Options)", !!home.headers.get("x-frame-options"));
check("보안 헤더(Content-Security-Policy)", !!home.headers.get("content-security-policy"));

console.log(`\n${checks - failures.length}/${checks} 통과`);
if (failures.length) {
    console.error("\n실패:\n- " + failures.join("\n- "));
    process.exit(1);
}
