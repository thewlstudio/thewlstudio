// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { dataset, projectId } from '@/sanity/env';
import CmsImage from './CmsImage';
import { publicImageFallback, PUBLIC_IMAGE_FALLBACK } from '@/lib/public-image';

const source = `https://cdn.sanity.io/images/${projectId}/${dataset}/abcdef-3787x5443.png`;
function image(markup: string) {
    const host = document.createElement('div');
    host.innerHTML = markup;
    return host.querySelector('img')!;
}

describe('실제 Next Image와 CMS 로더 연결', () => {
    it('사진의 src·srcset은 원본이나 Next 중계가 아닌 크기가 지정된 CDN 주소다', () => {
        const img = image(renderToStaticMarkup(<CmsImage src={source} alt="강사" fill sizes="160px" className="object-cover object-top" />));
        expect(img.alt).toBe('강사');
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.getAttribute('sizes')).toBe('160px');
        expect(img.style.position).toBe('absolute');
        expect(img.classList.contains('object-top')).toBe(true);
        expect(img.src).not.toContain('/_next/image');
        expect(new URL(img.src).searchParams.get('w')).toBeTruthy();
        const candidates = img.srcset.split(', ').map((part) => part.split(' '));
        expect(candidates.length).toBeGreaterThan(2);
        for (const [url, descriptor] of candidates) {
            expect(new URL(url).searchParams.get('w')).toBe(descriptor.replace('w', ''));
            expect(new URL(url).searchParams.get('auto')).toBe('format');
        }
    });
    it('로컬 예비 사진·로고는 기존 Next 최적화를 유지한다', () => {
        const img = image(renderToStaticMarkup(<CmsImage src="/images/lobby_1.jpg" alt="로비" fill sizes="50vw" />));
        expect(img.src).toContain('/_next/image?url=%2Fimages%2Flobby_1.jpg');
        expect(img.getAttribute('sizes')).toBe('50vw');
    });
    it('기존 SVG 강사 사진은 지원되지 않는 CDN 변환을 붙이지 않는다', () => {
        const svg = source.replace('.png', '.svg');
        const img = image(renderToStaticMarkup(<CmsImage src={svg} alt="벡터 프로필" fill sizes="128px" />));
        expect(img.getAttribute('src')).toBe(svg);
        expect(img.hasAttribute('srcset')).toBe(false);
    });
    it('data URL과 명시적 unoptimized 요청에는 크기 변환을 강제하지 않는다', () => {
        const data = 'data:image/png;base64,abc';
        expect(image(renderToStaticMarkup(<CmsImage src={data} alt="미리보기" width={10} height={10} />)).getAttribute('src')).toBe(data);
        const raw = image(renderToStaticMarkup(<CmsImage src={source} alt="원본" width={10} height={10} unoptimized />));
        expect(raw.getAttribute('src')).toBe(source);
        expect(raw.hasAttribute('srcset')).toBe(false);
    });
    it('blur placeholder·이미지 비율 예약·지연 로딩을 그대로 전달한다', () => {
        const img = image(renderToStaticMarkup(<CmsImage src={source} alt="앨범" width={1200} height={800} sizes="80vw" placeholder="blur" blurDataURL="data:image/png;base64,abc" style={{ width: '100%', height: 'auto' }} />));
        expect(img.width).toBe(1200);
        expect(img.height).toBe(800);
        expect(img.style.height).toBe('auto');
        // jsdom의 CSS 파서는 SVG data URL을 생략할 수 있어 SSR이 만든 원문 속성을 검사한다.
        expect(img.getAttribute('style')).toContain('data:image/svg+xml');
        expect(img.getAttribute('loading')).toBe('lazy');
    });
});

describe('실제 Next Image의 실패 처리와 사진 교체', () => {
    let host: HTMLDivElement, root: Root;
    async function render(node: ReactNode) { await act(async () => root.render(node)); }
    const current = () => host.querySelector('img')!;
    async function fail() { await act(async () => current().dispatchEvent(new Event('error'))); }
    beforeEach(() => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        host = document.createElement('div'); host.style.position = 'relative'; document.body.append(host); root = createRoot(host);
    });
    afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

    it('404 이벤트 후 외부 요청 없는 대체 표시로 바꾸고 fill·크기·클래스를 유지한다', async () => {
        const onError = vi.fn();
        await render(<CmsImage src={source} alt="강사 사진" fill sizes="160px" className="object-cover object-top" onError={onError} />);
        expect(current().getAttribute('sizes')).toBe('160px');
        await fail();
        expect(current().getAttribute('src')).toBe(PUBLIC_IMAGE_FALLBACK);
        expect(current().alt).toBe('강사 사진 (이미지를 불러올 수 없습니다)');
        expect(current().style.position).toBe('absolute');
        // Next는 srcset이 필요 없는 data URL에는 sizes를 출력하지 않는다.
        expect(current().hasAttribute('sizes')).toBe(false);
        expect(current().classList.contains('object-top')).toBe(true);
        expect(current().hasAttribute('srcset')).toBe(false);
        expect(onError).toHaveBeenCalledTimes(1);
        await fail(); expect(onError).toHaveBeenCalledTimes(1);
    });
    it('지원하지 않는 외부 주소는 Next 렌더 오류나 요청 없이 처음부터 대체한다', async () => {
        await render(<CmsImage src="https://unsupported.invalid/image.jpg" alt="작품" width={300} height={200} />);
        expect(current().getAttribute('src')).toBe(publicImageFallback(300, 200));
        expect(current().width).toBe(300); expect(current().height).toBe(200);
    });
    it('장식 사진은 실패해도 보조기기에 불필요한 오류 이름을 만들지 않는다', async () => {
        await render(<CmsImage src={source} alt="" fill sizes="100vw" />);
        await fail(); expect(current().alt).toBe('');
    });
    it('blur를 제거하고 비율을 유지하며 대체 이미지 로드를 원본 성공으로 알리지 않는다', async () => {
        const onLoad = vi.fn();
        await render(<CmsImage src={source} alt="작품" width={1200} height={800} placeholder="blur" blurDataURL="data:image/png;base64,abc" style={{ width: '100%', height: 'auto' }} onLoad={onLoad} />);
        await fail();
        expect(current().width).toBe(1200); expect(current().height).toBe(800);
        expect(current().getAttribute('src')).toBe(publicImageFallback(1200, 800));
        expect(current().style.height).toBe('auto'); expect(current().style.width).toBe('100%');
        expect(current().getAttribute('style')).not.toContain('data:image/svg+xml');
        await act(async () => current().dispatchEvent(new Event('load')));
        expect(onLoad).not.toHaveBeenCalled();
    });
    it('source가 바뀌면 사진만 복구하고 부모 입력 상태는 초기화하지 않는다', async () => {
        function Holder({ src }: { src: string }) {
            const [count, setCount] = useState(0);
            return <><button onClick={() => setCount(count + 1)}>{count}</button><CmsImage src={src} alt="사진" width={100} height={80} /></>;
        }
        await render(<StrictMode><Holder src={source} /></StrictMode>);
        await fail();
        await act(async () => host.querySelector('button')!.click());
        const old = current();
        await render(<StrictMode><Holder src={source + '?photo=2'} /></StrictMode>);
        expect(current()).not.toBe(old);
        expect(current().src).not.toContain('data:image');
        expect(new URL(current().src).searchParams.get('photo')).toBe('2');
        expect(host.querySelector('button')?.textContent).toBe('1');
    });
    it.each([{}, { width: 300 }, { height: 100 }])('static import도 크기 지정 %j에 맞춰 실패 전후 크기를 유지한다', async (size) => {
        const asset = { src: '/missing-photo.jpg', width: 600, height: 300 };
        await render(<CmsImage src={{ default: asset }} alt="사진" {...size} />);
        const before = [current().width, current().height];
        await fail();
        expect([current().width, current().height]).toEqual(before);
        expect(current().getAttribute('src')).toBe(publicImageFallback(...before));
    });
});
