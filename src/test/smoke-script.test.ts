import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = 'http://localhost:3000';
let previousArgv: string[];
let sitemap: string;
let detailStatus: number;
let detailBody: string;
const calls: string[] = [];

beforeEach(() => {
    vi.resetModules();
    previousArgv = process.argv;
    process.argv = ['node', 'scripts/smoke.mjs', base];
    sitemap = '<urlset><url><loc>https://production.example/works/With_you_n%40di</loc></url><url><loc>https://production.example/crew/artist</loc></url></urlset>';
    detailStatus = 200; detailBody = '<main><h1>본문 제목</h1></main>'; calls.length = 0;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('smoke-failed'); });
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
        calls.push(input);
        const url = new URL(input);
        if (url.pathname === '/sitemap.xml') return new Response(sitemap);
        if (/^\/(works|crew)\//.test(url.pathname)) return new Response(detailBody, { status: detailStatus });
        if (url.pathname === '/manage/login') return new Response('<meta name="robots" content="noindex">');
        if (url.pathname.startsWith('/manage')) return new Response('', { status: 307, headers: { location: '/manage/login' } });
        return new Response('<h1>홈페이지</h1>', { headers: { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Security-Policy': "default-src 'self'" } });
    }));
});
afterEach(() => { process.argv = previousArgv; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('실행 가능한 스모크 검사의 상세 페이지 회귀', () => {
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
