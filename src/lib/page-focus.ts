export const PAGE_TITLE_ID = 'page-title';

export const isManagePath = (path: string) => path === '/manage' || path.startsWith('/manage/');
export const isStudioPath = (path: string) => path === '/admin' || path.startsWith('/admin/');

const cleanups = new WeakMap<HTMLElement, () => void>();

/** 주소를 CSS 선택자로 쓰거나 재차 디코딩하지 않고 실제 본문 목적지를 찾는다. */
export function pageFocusTarget(hash = ''): HTMLElement | null {
    let target: HTMLElement | null = null;
    if (hash) {
        try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); }
        catch { /* 잘못된 해시는 페이지 제목으로 대체한다. */ }
    }
    if (target?.id === PAGE_TITLE_ID) return target;
    if (target && target.closest('#main-content') && !target.closest('header')) {
        return target.matches('h1,h2,h3,h4,h5,h6') ? target : target.querySelector<HTMLElement>('h1,h2,h3,h4,h5,h6') ?? target;
    }
    return document.getElementById(PAGE_TITLE_ID);
}

/** 기본 스크롤은 브라우저/Next에 맡긴다. 필요할 때만 가려진 목적지를 드러낸다. */
export function focusPageElement(target: HTMLElement | null, { reveal = false }: { reveal?: boolean } = {}): boolean {
    if (!target?.isConnected || target.closest('[inert], [hidden], [aria-hidden="true"]')) return false;
    cleanups.get(target)?.();
    const tabIndex = target.getAttribute('tabindex');
    const marker = target.getAttribute('data-page-focus');
    if (tabIndex === null) target.setAttribute('tabindex', '-1');
    target.setAttribute('data-page-focus', '');
    const cleanup = () => {
        if (cleanups.get(target) !== cleanup) return;
        if (tabIndex === null && target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
        if (target.getAttribute('data-page-focus') === '') {
            if (marker === null) target.removeAttribute('data-page-focus');
            else target.setAttribute('data-page-focus', marker);
        }
        target.removeEventListener('blur', cleanup);
        cleanups.delete(target);
    };
    cleanups.set(target, cleanup);
    target.addEventListener('blur', cleanup, { once: true });
    target.focus({ preventScroll: true });
    if (document.activeElement === target) {
        if (reveal) {
            const top = target.getBoundingClientRect().top;
            const headerBottom = document.querySelector('#main-content > header')?.getBoundingClientRect().bottom ?? 0;
            if (top < Math.max(0, headerBottom) || top >= window.innerHeight) target.scrollIntoView({ block: 'start', behavior: 'auto' });
        }
        return true;
    }
    cleanup();
    return false;
}
