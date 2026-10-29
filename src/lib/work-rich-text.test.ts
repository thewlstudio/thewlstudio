import { describe, expect, it } from 'vitest';
import { publicRichTextHref } from './content-urls';
import { normalizeWorkRichText } from './work-rich-text';

const paragraph = (style = 'normal', text = '본문') => ({ _type: 'block', _key: 'block', style, children: [{ _type: 'span', _key: 'span', text, marks: [] }], markDefs: [] });

describe('자유 서식의 링크 정책', () => {
    it.each(['https://example.com/path?q=value#part', 'http://example.com', ' HTTPS://EXAMPLE.COM ', '/works/With_you_n%40di', '/works/literal%252Fname', './related', '../studio', 'relative/path', '?page=2&campaign=test', '#credits', '#', 'mailto:studio@example.com?subject=hello', 'MAILTO:studio@example.com', 'tel:+82-10-1234-5678'])('기존의 정상 웹·상대·연락 주소를 유지한다: %s', (value) => {
        expect(publicRichTextHref(value)).toBe(value.trim());
    });
    it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)', 'file:///tmp/file', 'blob:https://example.com/file', 'ftp://example.com', '//example.com/path', '//rich-text.invalid/path', '/\\example.com/path', 'https:example.com', 'https://', 'https://user:pass@rich-text.invalid/path', 'https://user@example.com', 'https://example.com/\npath', 'mailto:', 'tel:', '', ' ', null, undefined, {}, 123])('허용하지 않는 주소는 링크로 출력하지 않는다: %s', (value) => {
        expect(publicRichTextHref(value)).toBeNull();
    });
    it.each(['/works/literal%252Fname', '../studio', '?page=2', '#credits'])('상대 주소 %s는 해석 후에도 사이트 밖으로 나가지 않는다', (value) => {
        expect(new URL(publicRichTextHref(value)!, 'https://example.com/works/item').origin).toBe('https://example.com');
    });
});

describe('원본을 바꾸지 않는 공개 자유 서식 정규화', () => {
    it('페이지 h1 아래에서 시작하고 제목 단계가 건너뛰지 않게 한다', () => {
        const styles = ['h1', 'h6', 'normal', 'blockquote', 'h4', 'h2', 'h6'];
        const result = normalizeWorkRichText(styles.map((style, i) => ({ ...paragraph(style), _key: String(i) })));
        expect(result.map((block) => block.style)).toEqual(['h2', 'h3', 'normal', 'blockquote', 'h4', 'h2', 'h3']);
    });
    it('빈 제목은 빈 문단으로 남기고 잘못된 스타일은 일반 문단으로 읽는다', () => {
        expect(normalizeWorkRichText(paragraph('h1', '  '))[0].style).toBe('normal');
        for (const style of ['constructor', '__proto__', 'custom']) expect(normalizeWorkRichText(paragraph(style))[0].style).toBe('normal');
    });
    it('잘못된 블록·자식·주석을 섞어도 읽을 수 있는 텍스트는 유지한다', () => {
        const blocks = normalizeWorkRichText([null, { _type: 'image' }, { _type: 'block', markDefs: {}, children: [null, 1, { _type: 'image' }, { _type: 'span', text: 3 }, { _type: 'span', text: '남길 문구', marks: [null, 'strong', 'unknown', {}] }] }]);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].children).toEqual([{ _type: 'span', _key: 'span-0', text: '남길 문구', marks: ['strong'] }]);
        expect(blocks[0].markDefs).toEqual([]);
    });
    it('지원하는 강조와 링크만 유지하고 미지원 주석의 글자는 버리지 않는다', () => {
        const block = { ...paragraph(), markDefs: [{ _type: 'link', _key: 'safe', href: 'https://example.com' }, { _type: 'link', _key: '__proto__', href: 'https://example.com' }, { _type: 'custom', _key: 'custom' }], children: [{ _type: 'span', _key: 's', text: '강조 문구', marks: ['strong', 'em', 'code', 'underline', 'strike-through', 'safe', '__proto__', 'custom'] }] };
        const result = normalizeWorkRichText(block)[0];
        expect(result.children[0].text).toBe('강조 문구');
        expect(result.children[0].marks).toEqual(['strong', 'em', 'code', 'underline', 'strike-through', 'safe']);
        expect(result.markDefs).toEqual([{ _type: 'link', _key: 'safe', href: 'https://example.com' }]);
    });
    it('중첩 목록은 유지하되 잘못된 목록 깊이는 첫 단계로 처리한다', () => {
        expect(normalizeWorkRichText({ ...paragraph(), listItem: 'number', level: 3 })[0]).toMatchObject({ listItem: 'number', level: 3 });
        for (const level of [0, -1, 1.5, Infinity, '2']) expect(normalizeWorkRichText({ ...paragraph(), listItem: 'bullet', level })[0].level).toBe(1);
        expect(normalizeWorkRichText({ ...paragraph(), listItem: 'constructor' })[0]).not.toHaveProperty('listItem');
    });
    it('빈 값은 출력하지 않고 단일 블록도 배열과 같은 방식으로 처리한다', () => {
        for (const value of [undefined, null, [], {}, 3, 'text']) expect(normalizeWorkRichText(value)).toEqual([]);
        expect(normalizeWorkRichText(paragraph())).toEqual(normalizeWorkRichText([paragraph()]));
    });
    it('동결한 원본을 그대로 보존한다', () => {
        const original = [paragraph('h1')];
        const before = JSON.stringify(original);
        Object.freeze(original[0].children[0]); Object.freeze(original[0].children); Object.freeze(original[0].markDefs); Object.freeze(original[0]); Object.freeze(original);
        const output = normalizeWorkRichText(original);
        expect(output[0].style).toBe('h2');
        expect(output[0]).not.toBe(original[0]);
        expect(JSON.stringify(original)).toBe(before);
    });
});
