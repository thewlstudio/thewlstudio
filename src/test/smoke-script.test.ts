import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = 'http://localhost:3000';
let previousArgv: string[];
let sitemap: string;
let detailStatus: number;
let detailBody: string;
let manageCache: string | null;
let previewCache: string | null;
let exitLocation: string | null;
let exitCookie: string | null;
let externalExitCookies: string[] | undefined;
let extraExitCookies: string[];
let previewLocation: string | null;
let missingStatus: number;
let missingBody: string;
let loginBody: string;
const noindex = '<meta name="robots" content="noindex">';
const password = '<input id="password" name="password" type="password">';
const submit = '<button type="submit">들어가기</button>';
const loginForm = `<form method="POST">${password}${submit}</form>`;
const calls: string[] = [];
const manageReplies = new Map<string, { status: number; location?: string; body?: string }>();
const publicCsp = "default-src 'self'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'self'";
const studioCsp = publicCsp.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    .replace("font-src 'self' data:", "font-src 'self' data: https://design-system-static.sanity.io");
const securityReplies = new Map<string, { status?: number; headers?: Record<string, string> }>();
const expiredAt = 'Thu, 01 Jan 1970 00:00:00 GMT';
const validExitCookie = `__prerender_bypass=; Path=/; Expires=${expiredAt}`;

beforeEach(() => {
    vi.resetModules();
    previousArgv = process.argv;
    process.argv = ['node', 'scripts/smoke.mjs', base];
    sitemap = '<urlset><url><loc>https://production.example/works/With_you_n%40di</loc></url><url><loc>https://production.example/crew/artist</loc></url></urlset>';
    detailStatus = 200; detailBody = '<main><h1>본문 제목</h1></main>'; calls.length = 0;
    missingStatus = 404;
    missingBody = '<meta name="robots" content="noindex"><main><h1 id="page-title" tabindex="-1">Page Not Found</h1><a href="/">홈으로</a></main>';
    manageCache = 'private, no-cache, no-store, max-age=0, must-revalidate';
    previewCache = 'private, no-store'; exitLocation = '/manage'; exitCookie = validExitCookie;
    externalExitCookies = undefined; extraExitCookies = [];
    previewLocation = '/manage/login'; manageReplies.clear();
    loginBody = noindex + loginForm;
    securityReplies.clear();
    vi.stubEnv('SMOKE_DEV_CSP', undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('smoke-failed'); });
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
        calls.push(input);
        const url = new URL(input);
        if (url.pathname === '/sitemap.xml') return new Response(sitemap);
        if (url.pathname === '/__smoke_missing_page__') return new Response(missingBody, { status: missingStatus });
        if (/^\/(works|crew)\//.test(url.pathname)) return new Response(detailBody, { status: detailStatus });
        const previewHeaders: Record<string, string> = previewCache === null ? {} : { 'cache-control': previewCache };
        if (url.pathname === '/api/draft') return new Response('Forbidden', { status: 403, headers: previewHeaders });
        if (url.pathname === '/manage/preview') return new Response(null, { status: 307, headers: { ...(previewLocation === null ? {} : { location: previewLocation }), ...previewHeaders } });
        if (url.pathname === '/api/disable-draft') {
            const external = url.searchParams.get('slug') !== '/manage';
            const headers = new Headers(previewHeaders);
            if (exitLocation !== null) headers.set('location', external ? '/' : exitLocation);
            const fallbackCookies = [...(exitCookie === null ? [] : [exitCookie]), ...extraExitCookies];
            for (const cookie of (external ? externalExitCookies ?? fallbackCookies : fallbackCookies)) headers.append('set-cookie', cookie);
            return new Response(null, { status: 307, headers });
        }
        if (url.pathname === '/manage/login') return new Response(loginBody, { headers: manageCache === null ? {} : { 'cache-control': manageCache } });
        if (url.pathname.startsWith('/manage')) {
            const reply = manageReplies.get(url.pathname) ?? { status: 307, location: '/manage/login' };
            return new Response(reply.body ?? '', { status: reply.status, headers: {
                ...(reply.location === undefined ? {} : { location: reply.location }),
                ...(manageCache === null ? {} : { 'cache-control': manageCache }),
            } });
        }
        const studio = url.pathname === '/admin' || url.pathname === '/admin/desk';
        const security = securityReplies.get(url.pathname);
        return new Response('<h1>페이지</h1>', {
            status: security?.status ?? (url.pathname === '/admin-help' ? 404 : 200),
            headers: security?.headers ?? securityHeaders(studio ? studioCsp : publicCsp),
        });
    }));
});
afterEach(() => { process.argv = previousArgv; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function securityHeaders(csp: string) {
    return { 'X-Frame-Options': 'SAMEORIGIN', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': csp };
}

describe('실제 HTTP 응답의 공개·Studio 헤더 구분', () => {
    it.each([
        ['/', 'CSP 값만 존재', securityHeaders("default-src 'self'")],
        ['/', '프레임 정책 오설정', { ...securityHeaders(publicCsp), 'X-Frame-Options': 'ALLOWALL' }],
        ['/', '공개 스크립트에 eval 허용', securityHeaders(publicCsp.replace("'unsafe-inline'", "'unsafe-inline' 'unsafe-eval'"))],
        ['/admin-help', '비슷한 이름의 404에 CSP 누락', { 'X-Frame-Options': 'SAMEORIGIN', 'X-Content-Type-Options': 'nosniff' }],
        ['/admin-help', 'Studio 정책 적용', securityHeaders(studioCsp)],
        ['/admin', 'Studio 글꼴 누락', securityHeaders(studioCsp.replace(' https://design-system-static.sanity.io', ''))],
        ['/admin/desk', 'Studio에 일반 정책 적용', securityHeaders(publicCsp)],
        ['/admin/desk', 'nosniff 누락', { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Security-Policy': studioCsp }],
        ['/admin/desk', '중복 글꼴 지시자', securityHeaders("font-src 'none'; " + studioCsp)],
        ['/admin/desk', '중복 CSP', securityHeaders(studioCsp + ', ' + studioCsp)],
    ] as const)('%s: %s이면 실패한다', async (path, _, headers) => {
        securityReplies.set(path, { headers });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(`보안 헤더 ${path} —`));
    });

    it('Studio의 오류 응답은 정상 헤더가 있어도 실패한다', async () => {
        securityReplies.set('/admin/desk', { status: 500 });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('보안 헤더 /admin/desk — status 500'));
    });

    it('일반 페이지·유사 경로와 Studio 모두 확인한다', async () => {
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
        expect(calls).toEqual(expect.arrayContaining(['/admin-help', '/admin', '/admin/desk'].map(path => base + path)));
    });

    it('명시한 개발 모드에서는 public eval만 추가로 허용한다', async () => {
        vi.stubEnv('SMOKE_DEV_CSP', '1');
        const devCsp = publicCsp.replace("'unsafe-inline'", "'unsafe-inline' 'unsafe-eval'");
        for (const path of ['/', '/admin-help']) securityReplies.set(path, { headers: securityHeaders(devCsp) });
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
        vi.resetModules();
        securityReplies.set('/', { headers: securityHeaders(studioCsp) });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });

    it('개발 모드 설정은 원격 주소의 공개 정책 기준을 완화하지 않는다', async () => {
        vi.stubEnv('SMOKE_DEV_CSP', '1');
        process.argv[2] = 'https://remote.example';
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
    });
});

describe('관리자 로그인 화면의 준비 상태', () => {
    it.each([
        ['설정 안내', '<main><h1>설정이 필요해요</h1></main>'],
        ['빈 본문', ''],
        ['비밀번호 입력 없음', `<form method="post">${submit}</form>`],
        ['다른 필드 이름', loginForm.replace('name="password"', 'name="other"')],
        ['비밀번호 입력 비활성화', loginForm.replace('<input ', '<input disabled ')],
        ['제출 버튼 없음', `<form method="post">${password}</form>`],
        ['제출 버튼 비활성화', loginForm.replace('<button ', '<button disabled ')],
        ['POST 아님', loginForm.replace('method="POST"', 'method="get"')],
        ['폼 밖 입력', `${password}<form method="post">${submit}</form>`],
        ['서로 다른 폼', `<form method="post">${password}</form><form method="post">${submit}</form>`],
        ['주석 안의 폼', `<!-- ${loginForm} -->`],
        ['비활성 템플릿', `<template>${loginForm}</template>`],
        ['스크립트 안의 폼', `<script>const markup = '${loginForm}';</script>`],
    ])('200과 noindex가 있어도 다음 응답은 실패한다: %s', async (_, body) => {
        loginBody = noindex + body;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('비밀번호 입력·제출 폼 없음'));
    });

    it('실제 POST 폼은 속성 순서·따옴표와 관계없이 통과하며 제출하지 않는다', async () => {
        loginBody = noindex + "<FORM class='login' METHOD='post'><input TYPE='password' NAME='password'><button TYPE='submit'>로그인</button></FORM>";
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
        expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === base + '/manage/login')).toEqual([
            [base + '/manage/login', expect.objectContaining({ redirect: 'manual' })],
        ]);
        expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
    });
});

describe('미리보기 종료의 실제 쿠키 만료', () => {
    it.each([
        ['빈 값만 있음', '__prerender_bypass=; Path=/'],
        ['미래 만료일', '__prerender_bypass=; Path=/; Expires=Fri, 01 Jan 2100 00:00:00 GMT'],
        ['잘못된 날짜', '__prerender_bypass=; Path=/; Expires=0'],
        ['쿠키 경로 누락', `__prerender_bypass=; Expires=${expiredAt}`],
        ['다른 경로', validExitCookie.replace('Path=/', 'Path=/manage')],
        ['다른 도메인', validExitCookie + '; Domain=elsewhere.example'],
        ['별도 저장 영역의 쿠키', validExitCookie + '; Secure; Partitioned'],
        ['유사 쿠키 이름', 'other_' + validExitCookie],
        ['양수 Max-Age가 과거 Expires보다 우선', validExitCookie + '; Max-Age=60'],
        ['형식이 잘못된 Max-Age만 있음', '__prerender_bypass=; Path=/; Max-Age=0seconds'],
        ['서로 충돌하는 경로', validExitCookie + '; path=/manage'],
    ])('%s이면 종료 점검이 실패한다', async (_, cookie) => {
        exitCookie = cookie;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('쿠키 만료 확인 실패'));
    });

    it('홈으로 돌아가는 종료 응답도 쿠키 만료를 확인한다', async () => {
        externalExitCookies = [];
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('홈으로 제한 + 쿠키 만료'));
    });

    it('만료 쿠키와 다시 발급하는 쿠키가 함께 오면 실패한다', async () => {
        extraExitCookies = ['__prerender_bypass=synthetic; Path=/'];
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });

    it.each([validExitCookie, '__prerender_bypass=; path=/; max-age=0', '__prerender_bypass=; Path=/; Max-Age=-1; Expires=Fri, 01 Jan 2100 00:00:00 GMT'])('정상 만료와 별개 쿠키가 함께 와도 통과한다: %s', async (cookie) => {
        exitCookie = cookie;
        extraExitCookies = [`other=example; Path=/; Expires=${expiredAt}`];
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
    });
});

describe('스모크 요청의 전송 실패와 수신 기한', () => {
    it.each(['headers', 'body'])('%s 수신이 멈춰도 요청 시작 후 15초에 중단하고 타이머를 정리한다', async (phase) => {
        vi.useFakeTimers();
        let signal: AbortSignal | null | undefined;
        let rejectPending: ((reason: Error) => void) | undefined;
        let started!: () => void;
        const didStart = new Promise<void>((resolve) => { started = resolve; });
        const pending = new Promise<never>((_, reject) => { rejectPending = reject; });
        vi.mocked(fetch).mockImplementationOnce(async (_, options) => {
            signal = options?.signal;
            signal?.addEventListener('abort', () => rejectPending?.(new Error('aborted')), { once: true });
            started();
            if (phase === 'headers') return pending;
            const response = new Response('partial');
            vi.spyOn(response, 'text').mockReturnValue(pending);
            return response;
        });
        let outcome: { ok: boolean; error?: Error } | undefined;
        const completion = import('../../scripts/smoke.mjs').then(
            () => { outcome = { ok: true }; },
            (error) => { outcome = { ok: false, error }; },
        );
        try {
            await didStart;
            await vi.advanceTimersByTimeAsync(14_999);
            expect(outcome).toBeUndefined();
            await vi.advanceTimersByTimeAsync(1);
            expect(signal?.aborted).toBe(true);
            expect(outcome).toMatchObject({ ok: false, error: { message: expect.stringContaining('15초') } });
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            rejectPending?.(new Error('test cleanup'));
            await completion;
        }
    });

    it.each(['/', '/manage/preview'])('%s 본문 수신 실패를 빈 문자열이나 정상 헤더로 숨기지 않는다', async (path) => {
        const original = vi.mocked(fetch).getMockImplementation()!;
        vi.mocked(fetch).mockImplementation(async (input, options) => {
            const response = await original(input, options);
            if (new URL(String(input)).pathname === path) vi.spyOn(response, 'text').mockRejectedValue(new Error('private transport details'));
            return response;
        });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow(`응답 본문 읽기 실패: ${path}`);
    });

    it('마지막 보안 헤더 요청도 본문 수신이 끊기면 실패한다', async () => {
        const original = vi.mocked(fetch).getMockImplementation()!;
        let homeRequests = 0;
        vi.mocked(fetch).mockImplementation(async (input, options) => {
            const response = await original(input, options);
            if (new URL(String(input)).pathname === '/' && ++homeRequests === 2) vi.spyOn(response, 'text').mockRejectedValue(new Error('broken body'));
            return response;
        });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('응답 본문 읽기 실패: /');
    });

    it('연결 실패에는 요청 경로를 안내하고 내부 오류 내용을 그대로 노출하지 않는다', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('private transport details'));
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow(/^요청 실패: \/$/);
    });

    it('정상 실행은 모든 요청의 이동 추적을 막고 수신 타이머를 남기지 않는다', async () => {
        vi.useFakeTimers();
        await import('../../scripts/smoke.mjs');
        expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.redirect === 'manual' && options.signal instanceof AbortSignal && !options.signal.aborted)).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        expect(process.exit).not.toHaveBeenCalled();
    });
});

describe('실행 가능한 스모크 검사의 상세 페이지 회귀', () => {
    it.each(['', '<main>로딩 중</main>', '<main><h1>강사 관리</h1><p>새 강사와 비공개 정보</p></main>'])('알려진 강사 이름이 없는 일반 200 응답도 로그인 이동으로 오인하지 않는다: #%#', async (body) => {
        manageReplies.set('/manage/instructors', { status: 200, body });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each(['/manage/instructors', '/manage/crew'])('관리 경로 %s의 이동 대상은 문자열 포함이 아닌 같은 출처의 정확한 로그인 경로여야 한다', async (path) => {
        manageReplies.set(path, { status: 307, location: 'https://outside.example/manage/login' });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([undefined, '/', '/elsewhere?next=/manage/login', '/manage/login-extra', '//outside.example/manage/login', 'http://user:pass@localhost:3000/manage/login'])('강사 관리의 잘못된 HTTP 이동 대상 #%#을 실패로 처리한다', async (location) => {
        manageReplies.set('/manage/instructors', { status: 307, location });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([null, '/', 'https://outside.example/manage/login', '/other?next=/manage/login', '/manage/login-extra'])('미리보기 진입도 잘못된 로그인 이동 대상 #%#을 통과시키지 않는다', async (location) => {
        previewLocation = location;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([307, 308])('같은 출처의 절대 로그인 주소와 상태 %s는 통과한다', async (status) => {
        manageReplies.set('/manage/instructors', { status, location: base + '/manage/login?next=%2Fmanage' });
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
    });
    it.each([
        '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
        '<meta content="0;url=http://localhost:3000/manage/login" http-equiv="refresh" id="__next-page-redirect">',
        "<META CONTENT='1;url=/manage/login?next=%2Fmanage' HTTP-EQUIV='Refresh' ID='__next-page-redirect'>",
        '<template><template></template></template><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
    ])('실제 Next 스트리밍 로그인 이동은 200이어도 허용한다: #%#', async (body) => {
        manageReplies.set('/manage/instructors', { status: 200, body });
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
    });
    it.each([
        '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=https://outside.example/manage/login"/>',
        '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/elsewhere?next=/manage/login"/>',
        '<meta data-id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
        '<meta id="__next-page-redirect" content="1;url=/manage/login"/>',
        '<script>const marker = \'<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>\';</script>',
        '<!-- <meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/> -->',
        '<template><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/></template>',
        '<template><template></template><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/></template>',
        '<template><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
        '<textarea><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/></textarea>',
        '<div data-note=\'<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>\'></div>',
        '<meta id="wrong" id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
        '<meta http-equiv="refresh" content="0;url=https://outside.example"><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>',
        '<meta id="__next-page-redirect" http-equiv="refresh" content="2;url=/manage/login"/>',
    ])('스트리밍 이동처럼 보이는 잘못된 응답 #%#도 통과하지 않는다', async (body) => {
        manageReplies.set('/manage/instructors', { status: 200, body });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it('실패 상태에 붙은 로그인 이동 태그로 서버 오류를 숨기지 않는다', async () => {
        manageReplies.set('/manage/instructors', { status: 500, body: '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/manage/login"/>' });
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it('없는 주소의 상태가 정상 페이지로 바뀌면 실패로 종료한다', async () => {
        missingStatus = 200;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([
        ['안내 제목', 'Page Not Found', '일반 페이지'],
        ['실제 h1', '<h1', '<p'],
        ['검색 방지', 'noindex', 'index'],
        ['홈 복귀', 'href="/"', 'href="/elsewhere"'],
    ])('없는 주소에 %s이 빠지면 실패로 종료한다', async (_, from, to) => {
        missingBody = missingBody.replace(from, to);
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([null, 'public, max-age=3600', 'private', 'no-store', 'private, public, no-store'])('미리보기 캐시 정책 누락/충돌 #%#도 실패로 종료한다', async (value) => {
        previewCache = value;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([null, '/', '//outside.example'])('종료 이동 대상이 잘못되면 실패로 종료한다: %s', async (value) => {
        exitLocation = value;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([null, '__prerender_bypass=still-enabled; Path=/'])('종료 쿠키 만료가 없으면 실패로 종료한다: %s', async (value) => {
        exitCookie = value;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it.each([null, 'public, max-age=3600', 'private, max-age=0', 'no-store', 'private, public, no-store'])('관리자 캐시 정책 누락/충돌 #%#도 실패로 종료한다', async (value) => {
        manageCache = value;
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
    });
    it('대소문자가 다른 private/no-store도 안전한 응답으로 인정한다', async () => {
        manageCache = 'PRIVATE, NO-STORE'; await import('../../scripts/smoke.mjs'); expect(process.exit).not.toHaveBeenCalled();
    });
    it('목록뿐 아니라 사이트맵의 실제 인코딩된 Works·Crew 상세를 점검한다', async () => {
        await import('../../scripts/smoke.mjs');
        expect(process.exit).not.toHaveBeenCalled();
        expect(calls).toContain(base + '/works/With_you_n%40di');
        expect(calls).toContain(base + '/crew/artist');
        expect(calls.every((url) => url.startsWith(base + '/'))).toBe(true);
    });
    it.each([[404, '<h1>찾을 수 없음</h1>'], [200, '<main>로딩 중</main>']])('상세 응답 %s 또는 본문 누락은 실패로 종료한다', async (status, body) => {
        detailStatus = Number(status); detailBody = String(body);
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(process.exit).toHaveBeenCalledWith(1);
    });
    it('경로 중복을 제거하고 리터럴 퍼센트를 다시 해석하거나 다른 서버에 요청하지 않는다', async () => {
        sitemap = '<urlset><url><loc>https://other.example/works/literal%252Fname</loc></url><url><loc>https://other.example/works/literal%252Fname</loc></url><url><loc>https://other.example/contact</loc></url></urlset>';
        await import('../../scripts/smoke.mjs');
        expect(calls.filter((url) => url === base + '/works/literal%252Fname')).toHaveLength(1);
        expect(calls.every((url) => url.startsWith(base + '/'))).toBe(true);
        expect(process.exit).not.toHaveBeenCalled();
    });
    it('잘못된 사이트맵 URL도 성공으로 숨기지 않는다', async () => {
        sitemap = '<urlset><url><loc>not an absolute URL</loc></url></urlset>';
        await expect(import('../../scripts/smoke.mjs')).rejects.toThrow('smoke-failed');
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
