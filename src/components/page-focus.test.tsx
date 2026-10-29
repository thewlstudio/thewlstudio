// @vitest-environment jsdom
import { act, createElement, StrictMode, type MouseEventHandler, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SkipLink from './SkipLink';
import PageNavigationFocus from './PageNavigationFocus';
import { focusPageElement, pageFocusTarget } from '@/lib/page-focus';

const state = vi.hoisted(() => ({ pathname: '/crew' }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next/link', () => ({ default: ({ children, onClick, onNavigate, ...props }: { children: ReactNode; onClick?: MouseEventHandler<HTMLAnchorElement>; onNavigate?: () => void }) => createElement('a', { ...props, onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) onNavigate?.();
} }, children) }));
let root: Root;
let host: HTMLDivElement;
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
const scroll = vi.fn();
const preventNativeNavigation = (event: Event) => event.preventDefault();
async function render(node: ReactNode) { await act(async () => root.render(<StrictMode>{node}</StrictMode>)); }
async function click(element: HTMLElement, props: MouseEventInit = {}) {
    await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...props })));
}
function path(value: string) { state.pathname = value.split(/[?#]/)[0]; history.replaceState({}, '', value); }
const title = () => document.getElementById('page-title')!;
const skip = () => document.getElementById('skip-link')!;
function Frame({ ready = true, bodyPath = state.pathname, inert = false }: { ready?: boolean; bodyPath?: string; inert?: boolean }) {
    return <><SkipLink /><PageNavigationFocus /><input aria-label="직접 선택한 입력" />{ready && <main id="main-content" inert={inert}>
        <header>{createElement('a', { href: '/' }, '로고')}</header>
        <h1 id="page-title" tabIndex={-1} data-page-path={bodyPath}>페이지 제목</h1>
        <section id="membership"><h2>멤버십</h2><button>가입 안내</button></section>
    </main>}</>;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    path('/crew'); scroll.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    // React 이벤트 뒤에서만 기본 탐색을 막아 jsdom의 예약된 URL 변경을 격리한다.
    document.addEventListener('click', preventNativeNavigation);
});
afterEach(async () => {
    (document.activeElement as HTMLElement)?.blur?.();
    await act(async () => root.unmount());
    host.remove(); document.removeEventListener('click', preventNativeNavigation);
    if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    vi.restoreAllMocks();
});

describe('본문 바로가기의 실제 목적지', () => {
    it('헤더를 포함한 main이 아니라 Tab으로 다시 헤더에 가지 않는 제목을 가리킨다', async () => {
        await render(<Frame />);
        expect(skip().getAttribute('href')).toBe('#page-title');
        expect(title().tabIndex).toBe(-1);
        expect(title().closest('header')).toBeNull();
        expect(title().previousElementSibling?.tagName).toBe('HEADER');
        expect(document.activeElement).toBe(document.body); // 최초 진입은 자동으로 포커스하지 않는다.
        skip().focus(); await click(skip());
        expect(document.activeElement).toBe(title());
        expect(scroll).not.toHaveBeenCalled(); // 해시 스크롤과 탐색 기록은 Next 링크가 담당한다.
    });
    it.each(['/manage', '/manage/instructors', '/manage/login'])('%s는 기존 관리 화면 대상을 유지한다', async (url) => {
        path(url); await render(<Frame />);
        expect(skip().getAttribute('href')).toBe('#main-content');
    });
    it.each(['/admin', '/admin/desk'])('%s에는 존재하지 않는 앱 외부 목적지를 노출하지 않는다', async (url) => {
        path(url); await render(<Frame />);
        expect(skip()).toBeNull();
    });
    it('이름이 비슷한 일반 404 경로까지 관리 앱으로 처리하지 않는다', async () => {
        path('/admin-other'); await render(<Frame />);
        expect(skip().getAttribute('href')).toBe('#page-title');
    });
    it('스트리밍 중 명시적으로 요청한 본문 이동은 제목 준비 후 완료한다', async () => {
        await render(<Frame ready={false} />);
        skip().focus(); await click(skip());
        history.replaceState({}, '', '#page-title');
        await render(<Frame />);
        expect(document.activeElement).toBe(title());
        expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    });
    it.each(['ctrlKey', 'metaKey', 'altKey', 'shiftKey'])('%s 새 탐색 요청에는 지연 포커스를 예약하지 않는다', async (modifier) => {
        await render(<Frame ready={false} />);
        skip().focus(); await click(skip(), { [modifier]: true });
        await render(<Frame />);
        expect(document.activeElement).toBe(skip());
        expect(scroll).not.toHaveBeenCalled();
    });
    it('준비를 기다리는 동안 사용자가 입력칸을 선택하면 포커스를 빼앗지 않는다', async () => {
        await render(<Frame ready={false} />);
        skip().focus(); await click(skip());
        history.replaceState({}, '', '#page-title');
        const input = host.querySelector('input')!; input.focus();
        await render(<Frame />);
        expect(document.activeElement).toBe(input);
        expect(scroll).not.toHaveBeenCalled();
    });
    it('기다리던 본문 대신 다른 해시를 선택하면 이전 요청을 취소한다', async () => {
        await render(<Frame ready={false} />);
        skip().focus(); await click(skip());
        history.replaceState({}, '', '#membership');
        await render(<Frame />);
        expect(document.activeElement).toBe(skip());
        expect(scroll).not.toHaveBeenCalled();
    });
});

describe('공개 SPA 이동 후 포커스', () => {
    it('새 경로의 실제 본문이 준비되면 제목을 안내하고 이미 보이는 제목은 스크롤하지 않는다', async () => {
        await render(<Frame />);
        path('/works'); await render(<Frame />);
        expect(document.activeElement).toBe(title());
        expect(title().getAttribute('data-page-focus')).toBe('');
        expect(scroll).not.toHaveBeenCalled();
    });
    it('새 제목이 화면 밖이나 고정 헤더 뒤에 있으면 요청한 목적지만 드러낸다', async () => {
        await render(<Frame />);
        vi.spyOn(title(), 'getBoundingClientRect').mockReturnValue({ ...title().getBoundingClientRect(), top: -10 });
        path('/works'); await render(<Frame />);
        expect(document.activeElement).toBe(title());
        expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    });
    it('URL이 먼저 바뀌어도 이전 본문은 건드리지 않고 새 데이터 표식을 기다린다', async () => {
        await render(<Frame />);
        const oldTitle = title();
        path('/works'); await render(<Frame bodyPath="/crew" />);
        expect(document.activeElement).toBe(document.body);
        await render(<Frame bodyPath="/works" />);
        expect(title()).toBe(oldTitle); // DOM 재사용도 경로 표식으로 구분한다.
        expect(document.activeElement).toBe(title());
    });
    it('화면 준비 중에는 기다리고 제목이 나타난 뒤 한 번만 포커스한다', async () => {
        await render(<Frame />);
        path('/works'); await render(<Frame ready={false} />);
        expect(document.activeElement).toBe(document.body);
        await render(<Frame />);
        expect(document.activeElement).toBe(title());
        const button = host.querySelector('button')!; button.focus();
        await render(<Frame />);
        expect(document.activeElement).toBe(button);
    });
    it('배경이 inert이면 풀릴 때까지 제목에 포커스를 주지 않는다', async () => {
        await render(<Frame />);
        path('/works'); await render(<Frame inert />);
        expect(document.activeElement).toBe(document.body);
        await render(<Frame />);
        expect(document.activeElement).toBe(title());
    });
    it('페이지가 늦게 와도 새 화면에서 선택한 입력을 가로채지 않는다', async () => {
        await render(<Frame />);
        path('/works'); await render(<Frame ready={false} />);
        const input = host.querySelector('input')!; input.focus();
        await render(<Frame />);
        expect(document.activeElement).toBe(input);
    });
    it('뒤로/앞으로의 위치·포커스 복원은 재설정하지 않는다', async () => {
        await render(<Frame />);
        path('/works');
        await act(async () => window.dispatchEvent(new PopStateEvent('popstate')));
        await render(<Frame />);
        expect(document.activeElement).toBe(document.body);
        expect(scroll).not.toHaveBeenCalled();
    });
    it('같은 경로의 검색 조건·새로고침은 새 본문 이동으로 취급하지 않는다', async () => {
        await render(<Frame />);
        const input = host.querySelector('input')!; input.focus();
        path('/crew?page=2'); await render(<Frame />);
        expect(document.activeElement).toBe(input);
    });
    it.each(['/manage/crew', '/admin/desk'])('%s의 폼·Studio 포커스에는 개입하지 않는다', async (url) => {
        await render(<Frame />);
        path(url); await render(<Frame />);
        expect(document.activeElement).toBe(document.body);
    });
    it('다른 페이지의 해시는 본문 제목 대신 해당 섹션의 제목을 안내한다', async () => {
        await render(<Frame />);
        path('/studio#membership'); await render(<Frame />);
        const heading = host.querySelector('h2')!;
        expect(document.activeElement).toBe(heading);
        expect(heading.tabIndex).toBe(-1);
        expect(scroll).not.toHaveBeenCalled();
        heading.blur();
        expect(heading.hasAttribute('tabindex')).toBe(false);
        expect(heading.hasAttribute('data-page-focus')).toBe(false);
    });
    it('화면이 사라진 뒤 남은 관찰자가 미래 화면 포커스를 가져오지 않는다', async () => {
        await render(<Frame />);
        path('/works'); await render(<Frame ready={false} />);
        await render(<h1 id="page-title" tabIndex={-1}>다른 화면</h1>);
        expect(document.activeElement).toBe(document.body);
    });
});

describe('목적지 선택과 임시 포커스 속성', () => {
    it('명시적인 본문 시작 그룹은 내부 첫 제목으로 바꾸지 않는다', async () => {
        await render(<main id="main-content"><div id="page-title" tabIndex={-1}><h2>아티스트</h2><button>링크</button><h1>작품</h1></div></main>);
        expect(pageFocusTarget('#page-title')).toBe(title());
    });
    it('해시는 한 번 해석하고 헤더 안·없는 해시·잘못된 값은 본문 제목으로 대체한다', async () => {
        await render(<Frame />);
        const header = host.querySelector('header')!; header.id = 'header';
        const section = host.querySelector('section')!; section.id = 'literal%2Fid';
        expect(pageFocusTarget('#literal%252Fid')).toBe(host.querySelector('h2'));
        for (const hash of ['#header', '#missing', '#%zz']) expect(pageFocusTarget(hash)).toBe(title());
    });
    it('기존 tabindex·표식은 보존하고 반복 요청의 이전 cleanup이 새 속성을 지우지 않는다', async () => {
        await render(<Frame />);
        const heading = host.querySelector('h2')!;
        heading.setAttribute('tabindex', '0'); heading.setAttribute('data-page-focus', 'original');
        expect(focusPageElement(heading)).toBe(true);
        expect(focusPageElement(heading)).toBe(true);
        heading.blur();
        expect(heading.getAttribute('tabindex')).toBe('0');
        expect(heading.getAttribute('data-page-focus')).toBe('original');
    });
    it('다른 소유자가 바꾼 tabindex는 blur 때 제거하지 않는다', async () => {
        await render(<Frame />);
        const heading = host.querySelector('h2')!;
        focusPageElement(heading); heading.setAttribute('tabindex', '0'); heading.blur();
        expect(heading.getAttribute('tabindex')).toBe('0');
    });
    it('잠긴·숨겨진·사라진 목적지에는 임시 속성도 남기지 않는다', async () => {
        await render(<Frame inert />);
        expect(focusPageElement(title())).toBe(false);
        expect(title().hasAttribute('data-page-focus')).toBe(false);
        await render(<Frame />);
        const heading = host.querySelector('h2')!; heading.hidden = true;
        expect(focusPageElement(heading)).toBe(false);
        heading.remove(); expect(focusPageElement(heading)).toBe(false);
        expect(focusPageElement(null)).toBe(false);
    });
});
