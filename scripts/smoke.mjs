/**
 * 스모크 점검: 실행 중인 서버(기본 http://localhost:3000)의 핵심 경로가 살아 있는지 확인한다.
 *   node scripts/smoke.mjs [주소]     예) node scripts/smoke.mjs https://whitelightstudio.vercel.app
 * - 공개 페이지는 200, 관리 화면은 로그인 없이 열리지 않고(로그인으로 이동), 관리 화면은 검색엔진에 노출되지 않아야 한다.
 */
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const failures = [];
let checks = 0;
const manageCacheControls = [];
const REQUEST_TIMEOUT_MS = 15_000;

// 연결뿐 아니라 본문 수신 완료까지 같은 제한 시간을 적용한다.
async function request(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let phase = "요청";
    try {
        const response = await fetch(base + path, { redirect: "manual", signal: controller.signal });
        phase = "응답 본문 읽기";
        const text = await response.text();
        return { response, text };
    } catch {
        if (controller.signal.aborted) throw new Error(`요청 제한 시간 ${REQUEST_TIMEOUT_MS / 1000}초 초과: ${path}`);
        throw new Error(`${phase} 실패: ${path}`);
    } finally {
        clearTimeout(timer);
    }
}

function isLoginTarget(value) {
    if (!value) return false;
    try {
        const target = new URL(value, base + "/");
        return target.origin === new URL(base).origin && target.pathname === "/manage/login" && !target.username && !target.password;
    } catch {
        return false;
    }
}

// 알려진 서버 렌더링 형식에서 주석·원시 텍스트·비활성 template 바깥의 태그만 읽는다.
function* activeHtmlTags(html) {
    let templateDepth = 0;
    const tags = html.matchAll(/<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|title|noscript)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)|<(\/?)([a-z][\w:-]*)(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>/gi);
    for (const [, , closing, rawName, attrs] of tags) {
        if (!rawName) continue;
        const name = rawName.toLowerCase();
        if (name === "template") {
            templateDepth = closing ? Math.max(0, templateDepth - 1) : templateDepth + 1;
        } else if (!templateDepth) {
            yield { name, closing: !!closing, attrs };
        }
    }
}

function htmlAttributes(attrs) {
    const values = new Map();
    for (const [, rawName, doubleQuoted, singleQuoted, unquoted] of attrs.matchAll(/\s+([^\s=/><"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g)) {
        const name = rawName.toLowerCase();
        if (values.has(name)) return null;
        values.set(name, doubleQuoted ?? singleQuoted ?? unquoted ?? "");
    }
    return values;
}

// Next의 스트리밍 이동은 HTTP 200 + 실제 refresh meta일 수 있다.
function hasStreamingLoginRedirect(html) {
    const refreshes = [];
    for (const tag of activeHtmlTags(html)) {
        if (tag.closing || tag.name !== "meta") continue;
        const attributes = htmlAttributes(tag.attrs);
        if (!attributes) return false;
        if (attributes.get("http-equiv")?.toLowerCase() === "refresh") refreshes.push(attributes);
    }
    if (refreshes.length !== 1 || refreshes[0].get("id") !== "__next-page-redirect") return false;
    const target = /^[01];url=(.+)$/i.exec(refreshes[0].get("content") ?? "");
    return !!target && isLoginTarget(target[1]);
}

function hasLoginForm(html) {
    let form = null;
    for (const tag of activeHtmlTags(html)) {
        if (tag.name === "form") {
            if (tag.closing) {
                if (form?.password && form.submit) return true;
                form = null;
            } else {
                const method = htmlAttributes(tag.attrs)?.get("method");
                form = method?.toLowerCase() === "post" ? { password: false, submit: false } : null;
            }
        } else if (form && !tag.closing && (tag.name === "input" || tag.name === "button")) {
            const attributes = htmlAttributes(tag.attrs);
            if (!attributes || attributes.has("disabled") || attributes.has("form")) continue;
            const type = attributes.get("type")?.toLowerCase();
            if (tag.name === "input" && type === "password" && attributes.get("name") === "password") form.password = true;
            if (tag.name === "button" && type === "submit") form.submit = true;
        }
    }
    return false;
}

function redirectsToLogin(response) {
    if (response.status === 307 || response.status === 308) return isLoginTarget(response.location);
    return response.status === 200 && hasStreamingLoginRedirect(response.text);
}

async function get(path) {
    const { response: res, text } = await request(path);
    if (path.startsWith("/manage")) manageCacheControls.push({ path, value: res.headers.get("cache-control") ?? "" });
    return { status: res.status, location: res.headers.get("location") ?? "", text };
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

const missing = await get("/__smoke_missing_page__");
check("없는 주소 → 404 + 안내 제목·홈 복귀·noindex", missing.status === 404 &&
    /<h1\b[^>]*\bid="page-title"[^>]*>\s*Page Not Found\s*<\/h1>/.test(missing.text) &&
    /<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*noindex/.test(missing.text) &&
    /<a\b[^>]*\bhref="\/"/.test(missing.text), `status ${missing.status}`);

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

// 2. 관리 화면은 같은 출처의 정확한 로그인 경로로 실제 이동해야 한다.
for (const p of ["/manage", "/manage/instructors", "/manage/crew", "/manage/crew/new", "/manage/works", "/manage/works/new", "/manage/studio", "/manage/studio/info", "/manage/contact", "/manage/help", "/manage/map", "/manage/history/crew/x"]) {
    const r = await get(p);
    check(`관리 ${p} → 로그인으로 이동`, redirectsToLogin(r), `status ${r.status} → ${r.location}`);
}

// 2-1. 미리보기: 로그인 없이는 켜지지 않고, 예전 무인증 켜기 경로는 막혀 있다
const { response: preview } = await request("/manage/preview?to=/");
check("미리보기 /manage/preview → 로그인 없이는 로그인으로 이동", (preview.status === 307 || preview.status === 308) && isLoginTarget(preview.headers.get("location")) && !/__prerender_bypass/.test(preview.headers.get("set-cookie") ?? ""), `status ${preview.status}`);
const { response: legacyDraft } = await request("/api/draft?slug=/");
check("예전 /api/draft → 403 (미리보기 모드를 켜지 않음)", legacyDraft.status === 403 && !/__prerender_bypass/.test(legacyDraft.headers.get("set-cookie") ?? ""), `status ${legacyDraft.status}`);
const { response: exitPreview } = await request("/api/disable-draft?slug=%2Fmanage");
check("미리보기 종료 → 관리 허브 이동 + 쿠키 만료", exitPreview.status === 307 && exitPreview.headers.get("location") === "/manage" && /__prerender_bypass=;/.test(exitPreview.headers.get("set-cookie") ?? ""), `status ${exitPreview.status}`);
const { response: exitExternal } = await request("/api/disable-draft?slug=%2F%2Foutside.example");
check("미리보기 종료의 외부 이동 요청 → 홈으로 제한", exitExternal.status === 307 && exitExternal.headers.get("location") === "/", `status ${exitExternal.status}`);
check("미리보기 진입·종료·차단 응답은 private + no-store", [preview, legacyDraft, exitPreview, exitExternal].every((response) => {
    const directives = (response.headers.get("cache-control") ?? "").toLowerCase().split(",").map((part) => part.trim());
    return directives.includes("private") && directives.includes("no-store") && !directives.includes("public");
}));

// 3. 로그인 화면과 검색엔진 노출 차단
const login = await get("/manage/login");
check("관리 로그인 → 200 + 비밀번호 입력·제출 폼", login.status === 200 && hasLoginForm(login.text),
    login.status === 200 ? "비밀번호 입력·제출 폼 없음" : `status ${login.status}`);
check("관리 화면은 검색엔진 노출 차단(noindex)", /<meta name="robots" content="[^"]*noindex/.test(login.text));
const unsafeManageCache = manageCacheControls.filter(({ value }) => {
    const directives = value.toLowerCase().split(",").map((part) => part.trim());
    return !directives.includes("private") || !directives.includes("no-store") || directives.includes("public");
});
check("관리 HTML·로그인 이동 응답은 private + no-store", manageCacheControls.length > 0 && unsafeManageCache.length === 0, unsafeManageCache.map(({ path }) => path).join(", "));

// 4. 보안 헤더
const { response: home } = await request("/");
check("보안 헤더(X-Frame-Options)", !!home.headers.get("x-frame-options"));
check("보안 헤더(Content-Security-Policy)", !!home.headers.get("content-security-policy"));

console.log(`\n${checks - failures.length}/${checks} 통과`);
if (failures.length) {
    console.error("\n실패:\n- " + failures.join("\n- "));
    process.exit(1);
}
