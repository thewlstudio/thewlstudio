import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';

const decorators = new Set(['strong', 'em', 'code', 'underline', 'strike-through']);
const reservedKeys = new Set(['__proto__', 'constructor', 'prototype']);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 현재 작품 스키마가 허용하는 표준 텍스트를 표시용으로 복사한다.
 * 원본은 수정하지 않는다. 미지원 주석은 글자를 유지하고 서식만 제외한다.
 */
export function normalizeWorkRichText(value: unknown): PortableTextBlock[] {
    const input = Array.isArray(value) ? value : value == null ? [] : [value];
    const output: PortableTextBlock[] = [];
    let previousHeading = 1; // 작품 제목은 페이지의 h1이며, 각 자유 서식 구역은 그 아래다.
    for (const [index, block] of input.entries()) {
        if (!record(block) || block._type !== 'block' || !Array.isArray(block.children)) continue;
        const markDefs = (Array.isArray(block.markDefs) ? block.markDefs : []).filter(record)
            .filter((mark) => mark._type === 'link' && typeof mark._key === 'string' && !reservedKeys.has(mark._key))
            .map((mark) => ({ _type: 'link', _key: mark._key as string, href: mark.href }));
        const annotations = new Set(markDefs.map((mark) => mark._key));
        const children: PortableTextSpan[] = block.children.filter(record)
            .filter((child) => child._type === 'span' && typeof child.text === 'string')
            .map((child, childIndex) => ({
                _type: 'span', _key: typeof child._key === 'string' ? child._key : `span-${childIndex}`,
                text: child.text as string,
                marks: (Array.isArray(child.marks) ? child.marks : []).filter((mark): mark is string => typeof mark === 'string' && (decorators.has(mark) || annotations.has(mark))),
            }));
        let style = typeof block.style === 'string' ? block.style : 'normal';
        if (/^h[1-6]$/.test(style)) {
            if (children.some((child) => child.text.trim())) {
                const level = Math.min(Math.max(2, Number(style.slice(1))), previousHeading + 1);
                style = `h${level}`;
                previousHeading = level;
            } else style = 'normal'; // 빈 제목은 만들지 않되 입력한 빈 줄은 보존한다.
        } else if (style !== 'blockquote') style = 'normal';
        const listItem = block.listItem === 'bullet' || block.listItem === 'number' ? block.listItem : undefined;
        output.push({
            _type: 'block', _key: typeof block._key === 'string' ? block._key : `block-${index}`,
            style, children, markDefs,
            ...(listItem ? { listItem, level: typeof block.level === 'number' && Number.isSafeInteger(block.level) && block.level > 0 ? block.level : 1 } : {}),
        });
    }
    return output;
}
