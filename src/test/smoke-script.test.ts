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
let previewLocation: string | null;
let missingStatus: number;
let missingBody: string;
const calls: string[] = [];
const manageReplies = new Map<string, { status: number; location?: string; body?: string }>();

beforeEach(() => {
    vi.resetModules();
    previousArgv = process.argv;
    process.argv = ['node', 'scripts/smoke.mjs', base];
    sitemap = '<urlset><url><loc>https://production.example/works/With_you_n%40di</loc></url><url><loc>https://production.example/crew/artist</loc></url></urlset>';
    detailStatus = 200; detailBody = '<main><h1>본문 제목</h1></main>'; calls.length = 0;
    missingStatus = 404;
    missingBody = '<meta name="robots" content="noindex"><main><h1 id="page-title" tabindex="-1">Page Not Found</h1><a href="/">홈으로</a></main>';
    manageCache = 'private, no-cache, no-store, max-age=0, must-revalidate';
    previewCache = 'private, no-store'; exitLocation = '/manage'; exitCookie = '__prerender_bypass=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    previewLocation = '/manage/login'; manageReplies.clear();
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
        if (url.pathname === '/api/disable-draft') return new Response(null, { status: 307, headers: {
            ...(exitLocation === null ? {} : { location: url.searchParams.get('slug') === '/manage' ? exitLocation : '/' }),
            ...(exitCookie === null ? {} : { 'set-cookie': exitCookie }), ...previewHeaders,
        } });
        if (url.pathname === '/manage/login') return new Response('<meta name="robots" content="noindex">', { headers: manageCache === null ? {} : { 'cache-control': manageCache } });
        if (url.pathname.startsWith('/manage')) {
            const reply = manageReplies.get(url.pathname) ?? { status: 307, location: '/manage/login' };
            return new Response(reply.body ?? '', { status: reply.status, headers: {
                ...(reply.location === undefined ? {} : { location: reply.location }),
                ...(manageCache === null ? {} : { 'cache-control': manageCache }),
            } });
        }
        return new Response('<h1>홈페이지</h1>', { headers: { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Security-Policy': "default-src 'self'" } });
    }));
});
afterEach(() => { process.argv = previousArgv; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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
