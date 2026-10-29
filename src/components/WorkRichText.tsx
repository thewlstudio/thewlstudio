"use client";

import { createContext, useContext } from 'react';
import { PortableText, type PortableTextComponents, type PortableTextMarkComponentProps } from 'next-sanity';
import { publicRichTextHref } from '@/lib/content-urls';
import { normalizeWorkRichText } from '@/lib/work-rich-text';

const InsideLink = createContext(false);
type LinkMark = { _type: 'link'; _key: string; href?: unknown };

function RichTextLink({ children, value, text }: PortableTextMarkComponentProps<LinkMark>) {
    const insideLink = useContext(InsideLink);
    const href = publicRichTextHref(value?.href);
    // 비었거나 잘못되거나 중첩된 링크라도 입력 문구와 강조는 남긴다.
    if (!href || !text.trim() || insideLink) return <>{children}</>;
    return <InsideLink.Provider value={true}>
        <a href={href} className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">{children}</a>
    </InsideLink.Provider>;
}

const components: PortableTextComponents = {
    marks: { link: RichTextLink },
    list: {
        bullet: ({ children }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>,
        number: ({ children }) => <ol className="list-decimal pl-6 space-y-2">{children}</ol>,
    },
};

/** 공개 Works 전용 렌더러. 저장·관리 화면의 원본 보존 정책과는 별개다. */
export default function WorkRichText({ value }: { value: unknown }) {
    const blocks = normalizeWorkRichText(value);
    if (blocks.length === 0) return null;
    return <div className="space-y-4 [overflow-wrap:anywhere]">
        <PortableText value={blocks} components={components} />
    </div>;
}
