// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, Component, Suspense, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import WorksLoading from '@/app/works/loading';
import CrewLoading from '@/app/crew/loading';
import ClassLoading from '@/app/class/loading';
import PageError from '@/app/error';
import NotFound from '@/app/not-found';
import PageNavigationFocus from './PageNavigationFocus';
import { isBodyScrollLocked } from '@/hooks/useBodyScrollLock';

vi.mock('next/navigation', () => ({ usePathname: () => '/works' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('공개 로딩 안내와 장식 구분', () => {
    it.each([[WorksLoading, '작품을 불러오고 있습니다.'], [CrewLoading, '크루 정보를 불러오고 있습니다.'], [ClassLoading, '클래스 정보를 불러오고 있습니다.']] as const)('%s는 한 번의 상태 안내만 제공하고 실제 제목으로 오인시키지 않는다', (Loading, text) => {
        const host = document.createElement('div'); host.innerHTML = renderToStaticMarkup(<Loading />);
        expect(host.querySelector('main')?.id).toBe('main-content');
        expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
        const status = host.querySelector('[role="status"]')!;
        expect(status.textContent).toBe(text);
        expect(status.closest('[aria-hidden="true"],[aria-busy="true"]')).toBeNull();
        expect(host.querySelector('#page-title,h1')).toBeNull();
        for (const section of host.querySelectorAll('section')) expect(section.getAttribute('aria-hidden')).toBe('true');
        expect(host.querySelectorAll('button,a,input')).toHaveLength(0);
    });
});

const pending = new Promise<void>(() => {});
function ReadResult({ outcome }: { outcome: 'pending' | 'error' | 'missing' }) {
    if (outcome === 'pending') throw pending;
    if (outcome === 'error') throw new Error('test-only-read-failure');
    return <NotFound />;
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <PageError error={null} retry={() => {}} /> : this.props.children; }
}

describe('실제 Suspense의 로딩 → 오류/404 교체', () => {
    let host: HTMLDivElement;
    let root: Root;
    beforeEach(() => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        history.replaceState({}, '', '/works');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    });
    afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
    it.each([
        [WorksLoading, 'error'], [WorksLoading, 'missing'],
        [CrewLoading, 'error'], [CrewLoading, 'missing'],
        [ClassLoading, 'error'], [ClassLoading, 'missing'],
    ] as const)('%s의 %s 전환에서 로딩 안내를 제거하고 실제 복귀 화면만 남긴다', async (Loading, outcome) => {
        const frame = (result: 'pending' | typeof outcome) => <><PageNavigationFocus /><Boundary><Suspense fallback={<Loading />}><ReadResult outcome={result} /></Suspense></Boundary></>;
        await act(async () => root.render(frame('pending')));
        expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
        expect(host.querySelector('#page-title')).toBeNull();
        await act(async () => root.render(frame(outcome)));
        expect(host.querySelector('[role="status"]')).toBeNull();
        expect(host.querySelectorAll('main')).toHaveLength(1);
        expect(host.querySelectorAll('#page-title')).toHaveLength(1);
        expect(host.querySelector('h1')?.id).toBe('page-title');
        expect(host.querySelector('a')?.getAttribute('href')).toBe('/');
        expect(host.textContent).not.toContain('test-only-read-failure');
        expect(isBodyScrollLocked()).toBe(false);
        expect(host.querySelector('[inert]')).toBeNull();
        expect(document.activeElement).toBe(outcome === 'error' ? host.querySelector('#page-title') : document.body);
    });
});
