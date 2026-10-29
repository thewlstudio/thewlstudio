// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkRichText from './WorkRichText';
import WorkDetailClient from '@/app/works/[slug]/WorkDetailClient';
import type { PortableTextBlock } from '@portabletext/types';

vi.mock('./Header', () => ({ default: () => null }));
vi.mock('./Footer', () => ({ default: () => null }));

function block(text: string, style = 'normal', extra: Record<string, unknown> = {}): PortableTextBlock {
    return { _type: 'block', _key: text, style, children: [{ _type: 'span', _key: 's', text, marks: [] }], markDefs: [], ...extra };
}
function linked(href: unknown, text = '문구', marks = ['link']): PortableTextBlock {
    return block(text, 'normal', { markDefs: [{ _type: 'link', _key: 'link', href }], children: [{ _type: 'span', _key: 's', text, marks }] });
}
function render(value: unknown) {
    const html = renderToStaticMarkup(<WorkRichText value={value} />);
    const host = document.createElement('div'); host.innerHTML = html;
    return { host, html };
}
beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { expect(console.warn).not.toHaveBeenCalled(); expect(console.error).not.toHaveBeenCalled(); vi.restoreAllMocks(); });

describe('실제 Portable Text로 렌더링한 공개 작품 서식', () => {
    it('다양한 강조·줄바꿈·인용문과 텍스트를 유지한다', () => {
        const { host } = render([
            block('강조\n다음 줄', 'normal', { children: [{ _type: 'span', _key: 's', text: '강조\n다음 줄', marks: ['strong', 'em', 'underline', 'strike-through', 'code'] }] }),
            block('인용문', 'blockquote'),
        ]);
        for (const tag of ['strong', 'em', 'del', 'code', 'br', 'blockquote']) expect(host.querySelector(tag)).not.toBeNull();
        expect(host.textContent).toContain('강조다음 줄인용문');
        expect(host.querySelector('span[style]')?.getAttribute('style')).toContain('underline');
    });
    it('정상 링크는 밑줄과 키보드 포커스 표시를 제공하고 새 창 동작을 임의로 추가하지 않는다', () => {
        const { host } = render(linked('https://example.com', '안내', ['link', 'strong']));
        const link = host.querySelector('a')!;
        expect(link.getAttribute('href')).toBe('https://example.com');
        expect(link.classList.contains('underline')).toBe(true);
        expect(link.classList.contains('focus-visible:outline-2')).toBe(true);
        expect(link.querySelector('strong')?.textContent).toBe('안내');
        expect(link.hasAttribute('target')).toBe(false);
    });
    it.each(['data:text/html,hello', 'javascript:alert(1)', '//example.com', { href: 'https://example.com' }])('잘못된 주소 %s는 링크만 제거하고 강조·문구는 남긴다', (href) => {
        const { host } = render(linked(href, '남길 문구', ['link', 'strong']));
        expect(host.querySelector('a')).toBeNull();
        expect(host.querySelector('strong')?.textContent).toBe('남길 문구');
    });
    it('공백뿐인 링크와 겹친 링크가 빈 탭 정지점·중첩 a를 만들지 않는다', () => {
        expect(render(linked('https://example.com', '  ', ['link', 'strong'])).host.querySelector('a')).toBeNull();
        const { html, host } = render(block('중첩 문구', 'normal', { markDefs: [{ _type: 'link', _key: 'one', href: 'https://one.example' }, { _type: 'link', _key: 'two', href: 'https://two.example' }], children: [{ _type: 'span', _key: 's', text: '중첩 문구', marks: ['one', 'two'] }] }));
        expect((html.match(/<a\b/g) || []).length).toBe(1);
        expect(host.querySelector('a')?.textContent).toBe('중첩 문구');
    });
    it('글머리표·번호·중첩 목록을 실제 ul/ol/li와 보이는 표식으로 구성한다', () => {
        const { host } = render([block('첫 항목', 'normal', { listItem: 'bullet', level: 1 }), block('하위 하나', 'normal', { listItem: 'number', level: 2 }), block('하위 둘', 'normal', { listItem: 'number', level: 2 }), block('둘째 항목', 'normal', { listItem: 'bullet', level: 1 })]);
        expect(host.querySelector('ul')?.classList.contains('list-disc')).toBe(true);
        expect(host.querySelector('ol')?.classList.contains('list-decimal')).toBe(true);
        expect(host.querySelector('ul > ol,ol > ul')).toBeNull();
        expect(host.querySelectorAll('ul > li > ol > li')).toHaveLength(2);
    });
    it('텍스트를 HTML로 실행하지 않고 지원하지 않는 객체·서식도 페이지를 중단시키지 않는다', () => {
        const { host, html } = render([null, { _type: 'image', src: 'https://example.com' }, block('<script>alert(1)</script>', 'constructor'), { ...block('정상 문구'), children: [null, { _type: 'span', text: '정상 문구', marks: {} }] }]);
        expect(host.querySelector('script,img,iframe')).toBeNull();
        expect(html).toContain('&lt;script&gt;');
        expect(host.textContent).toContain('<script>alert(1)</script>정상 문구');
    });
    it('작품 상세에서도 페이지 h1은 하나이고 실제 자유 서식이 출력된다', () => {
        const html = renderToStaticMarkup(<WorkDetailClient initialWork={{ title: '작품 제목', artist: '아티스트', slug: 'item', imageUrl: null, lqip: null, releaseDate: '2026. 10. 27.', contentBlocks: [{ _type: 'freeformTextBlock', _key: 'freeform', content: [block('구역 제목', 'h1'), block('하위 제목', 'h6'), linked('data:text/html,bad', '보존 문구')] }] }} />);
        const host = document.createElement('div'); host.innerHTML = html;
        expect(host.querySelectorAll('h1')).toHaveLength(1);
        expect(host.querySelector('h1')?.textContent).toBe('작품 제목');
        expect(host.querySelector('h2')?.textContent).toBe('구역 제목');
        expect(host.querySelector('h3')?.textContent).toBe('하위 제목');
        expect(host.textContent).toContain('보존 문구');
        expect(host.querySelector('a[href^="data:"]')).toBeNull();
    });
});
