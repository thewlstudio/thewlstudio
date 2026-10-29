// @vitest-environment jsdom
import { act, createElement, StrictMode, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CrewClient from '@/app/crew/CrewClient';
import WorksClient from '@/app/works/WorksClient';
import { RoomCarousel } from '@/app/studio/StudioClient';
import type { CrewMemberSummary, WorkSummary } from '@/types/sanity';

vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/CmsImage', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock('motion/react', async () => {
    const { createElement } = await import('react');
    const ignored = new Set(['initial', 'animate', 'transition', 'viewport', 'whileInView']);
    const cache = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    return { motion: new Proxy({}, { get: (_, tag: string) => {
        if (!cache.has(tag)) cache.set(tag, (props) => createElement(tag, Object.fromEntries(Object.entries(props).filter(([name]) => !ignored.has(name))), props.children as ReactNode));
        return cache.get(tag);
    } }) };
});

let root: Root;
let host: HTMLDivElement;
async function render(node: ReactNode) { await act(async () => root.render(<StrictMode>{node}</StrictMode>)); }
async function click(element: HTMLElement) { await act(async () => element.click()); }
const member: CrewMemberSummary = { name: '크루', koName: '이름', role: '프로듀서', slug: 'crew', imageUrl: '/profile.jpg' };
const work: WorkSummary = { title: '작품', artist: '아티스트', slug: 'work', releaseDate: '2026. 10. 27.', imageUrl: null, lqip: null };
const photos = ['/one.jpg', '/two.jpg', '/three.jpg'];
const region = () => host.querySelector<HTMLElement>('[role="region"]')!;
const slide = () => region().querySelector<HTMLElement>('[aria-roledescription="슬라이드"]')!;
const image = () => region().querySelector<HTMLImageElement>('img')!;
const next = () => region().querySelector<HTMLButtonElement>('[aria-label="연습실 다음 사진"]')!;
const prev = () => region().querySelector<HTMLButtonElement>('[aria-label="연습실 이전 사진"]')!;
const dot = (index: number) => region().querySelector<HTMLButtonElement>(`[aria-label="연습실 사진 ${index} 보기"]`)!;
async function key(key: string, options: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    await act(async () => region().dispatchEvent(event));
    return event;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('Crew 카드의 발견 가능성과 링크 이름', () => {
    it.each([{ members: [] }, { members: [{ ...member, slug: 'bad/path' }] }])('공개 가능한 항목이 없으면 빈 그리드 대신 안내한다', async ({ members }) => {
        await render(<CrewClient members={members} />);
        expect(host.textContent).toContain('등록된 크루가 없습니다.');
        expect(host.querySelector('h1')?.textContent?.trim()).toBe('OUR CREW');
        expect(host.querySelector('a')).toBeNull();
    });
    it.each([null, '/profile.jpg'])('사진 유무(%s)와 무관하게 사진 링크의 이름과 주소를 제공한다', async (imageUrl) => {
        await render(<CrewClient members={[{ ...member, imageUrl }]} />);
        const link = host.querySelector<HTMLAnchorElement>('[aria-label="크루 프로필 보기"]')!;
        expect(link.getAttribute('href')).toBe('/crew/crew');
        expect(link.classList.contains('focus-visible:outline-2')).toBe(true);
        link.focus(); expect(document.activeElement).toBe(link);
        for (const item of host.querySelectorAll('a')) expect(item.getAttribute('aria-label') || item.textContent?.trim()).toBeTruthy();
    });
    it('SNS는 투명한 전체 덮개 밖에 있고 키보드·hover 없는 기기에 표시하는 규칙이 있다', async () => {
        await render(<CrewClient members={[{ ...member, links: [{ url: 'https://instagram.com/artist', iconUrl: null }] }]} />);
        const link = host.querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
        const row = link.parentElement!;
        expect(row.classList.contains('group-focus-within:opacity-100')).toBe(true);
        expect(row.classList.contains('[@media(hover:none)]:opacity-100')).toBe(true);
        expect(row.parentElement!.classList.contains('opacity-0')).toBe(false);
        expect(row.parentElement!.querySelector('.bg-black\\/60.opacity-0')?.contains(row)).toBe(false);
        expect(link.classList.contains('pointer-events-auto')).toBe(true);
        expect(link.classList.contains('w-8')).toBe(true);
        expect(link.classList.contains('h-8')).toBe(true);
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(host.querySelector('a a')).toBeNull();
        link.focus(); expect(document.activeElement).toBe(link);
    });
    it.each([
        ['https://www.instagram.com/a', 'Instagram'], ['https://youtu.be/test', 'YouTube'],
        ['https://open.spotify.com/a', 'Spotify'], ['https://soundcloud.com/a', 'SoundCloud'],
        ['https://instagram.com.evil.test/a', 'SNS'], ['https://example.com/?site=youtube.com', 'SNS'],
    ])('플랫폼 이름은 주소 일부가 아니라 실제 호스트로 구분한다: %s', async (url, platform) => {
        await render(<CrewClient members={[{ ...member, links: [{ url, iconUrl: null }] }]} />);
        expect(host.querySelector('a[target="_blank"]')?.getAttribute('aria-label')).toBe(`크루 ${platform}`);
    });
    it('사용할 수 없는 주소·slug는 새 조작 영역에도 노출하지 않는다', async () => {
        await render(<CrewClient members={[{ ...member, links: [{ url: 'javascript:alert(1)', iconUrl: null }] }, { ...member, slug: 'bad/path' }]} />);
        expect(host.querySelectorAll('a[target="_blank"]')).toHaveLength(0);
        expect(host.querySelectorAll('a[aria-label$="프로필 보기"]')).toHaveLength(1);
    });
});

describe('Works의 사진 없는 링크', () => {
    it.each([null, '/cover.jpg'])('커버(%s)가 없어도 작품명·아티스트로 링크를 구분한다', async (imageUrl) => {
        await render(<WorksClient initialWorks={[{ ...work, imageUrl }]} />);
        const link = host.querySelector<HTMLAnchorElement>('a[href="/works/work"]')!;
        expect(link.getAttribute('aria-label')).toBe('작품 - 아티스트 작품 보기');
        expect(link.classList.contains('focus-visible:outline-2')).toBe(true);
        expect(link.querySelector('[aria-hidden="true"]')?.classList.contains('group-focus-within:opacity-100')).toBe(true);
    });
});

describe('Studio 사진 캐러셀의 키보드와 상태 전달', () => {
    it('작은 사진 점과 화살표 모두 44px 터치 영역을 제공하되 점 모양은 유지한다', async () => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        for (const button of region().querySelectorAll('button')) {
            expect(button.classList.contains('w-11')).toBe(true);
            expect(button.classList.contains('h-11')).toBe(true);
        }
        expect(dot(1).querySelector('span')?.classList.contains('h-1.5')).toBe(true);
        expect(dot(2).querySelector('span')?.classList.contains('w-1.5')).toBe(true);
        await click(dot(3));
        expect(slide().getAttribute('aria-label')).toBe('3 / 3');
    });
    it('빈 사진 목록은 렌더링하지 않고 한 장은 불필요한 조작을 만들지 않는다', async () => {
        await render(<RoomCarousel roomName="연습실" images={[]} />);
        expect(region()).toBeNull();
        await render(<RoomCarousel roomName="연습실" images={photos.slice(0, 1)} />);
        expect(region().hasAttribute('tabindex')).toBe(false);
        expect(region().querySelectorAll('button')).toHaveLength(0);
        expect(slide().getAttribute('aria-label')).toBe('1 / 1');
    });
    it('사진 번호·전체 수·현재 선택·조작 대상이 연결되고 HTML disabled로 포커스를 없애지 않는다', async () => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect(region().getAttribute('aria-label')).toBe('연습실 사진');
        expect(region().getAttribute('aria-roledescription')).toBe('캐러셀');
        expect(slide().getAttribute('aria-live')).toBe('polite');
        expect(slide().getAttribute('aria-label')).toBe('1 / 3');
        expect(dot(1).getAttribute('aria-current')).toBe('true');
        expect(dot(1).getAttribute('aria-disabled')).toBe('true');
        expect(dot(1).disabled).toBe(false);
        for (const button of region().querySelectorAll('button')) {
            expect(button.type).toBe('button');
            expect(button.getAttribute('aria-controls')).toBe(slide().id);
        }
        for (let i = 1; i <= 3; i++) {
            expect(dot(i).classList.contains('w-11')).toBe(true);
            expect(dot(i).classList.contains('h-11')).toBe(true);
        }
    });
    it('이전·다음은 순환하고 포커스를 옮기지 않으며 직접 선택도 같은 상태를 갱신한다', async () => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        next().focus(); await click(next());
        expect(document.activeElement).toBe(next());
        expect(image().getAttribute('src')).toBe('/two.jpg');
        expect(dot(2).getAttribute('aria-current')).toBe('true');
        await click(next()); await click(next());
        expect(image().getAttribute('src')).toBe('/one.jpg');
        await click(prev());
        expect(image().getAttribute('src')).toBe('/three.jpg');
        await click(dot(2));
        expect(slide().getAttribute('aria-label')).toBe('2 / 3');
        await click(dot(2));
        expect(image().alt).toBe('연습실 사진 2');
    });
    it('단독 방향키만 처리하고 처리한 키의 기본 스크롤은 막는다', async () => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect((await key('ArrowRight')).defaultPrevented).toBe(true);
        expect(image().getAttribute('src')).toBe('/two.jpg');
        expect((await key('ArrowLeft')).defaultPrevented).toBe(true);
        expect(image().getAttribute('src')).toBe('/one.jpg');
    });
    it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])('%s 방향키는 브라우저·보조 도구에 맡긴다', async (modifier) => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect((await key('ArrowRight', { [modifier]: true })).defaultPrevented).toBe(false);
        expect(image().getAttribute('src')).toBe('/one.jpg');
    });
    it.each(['Tab', 'Enter', ' ', 'Home', 'End'])('%s 기본 동작과 포커스 이동을 가로채지 않는다', async (value) => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect((await key(value)).defaultPrevented).toBe(false);
        expect(image().getAttribute('src')).toBe('/one.jpg');
    });
    it('선택 사진이 삭제되거나 모두 사라져도 잘못된 src 없이 복구한다', async () => {
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        await click(dot(3));
        await render(<RoomCarousel roomName="연습실" images={photos.slice(0, 1)} />);
        expect(image().getAttribute('src')).toBe('/one.jpg');
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect(image().getAttribute('src')).toBe('/one.jpg');
        await click(dot(3));
        await render(<RoomCarousel roomName="연습실" images={[]} />);
        expect(region()).toBeNull();
        await render(<RoomCarousel roomName="연습실" images={photos} />);
        expect(image().getAttribute('src')).toBe('/one.jpg');
    });
    it('여러 방의 사진과 버튼 ID가 서로 섞이지 않는다', async () => {
        await render(<><RoomCarousel roomName="연습실" images={photos} /><RoomCarousel roomName="로비" images={photos} /></>);
        const groups = host.querySelectorAll('[aria-roledescription="슬라이드"]');
        expect(groups[0].id).not.toBe(groups[1].id);
        expect(host.querySelector('button[aria-label="로비 다음 사진"]')?.getAttribute('aria-controls')).toBe(groups[1].id);
    });
});
