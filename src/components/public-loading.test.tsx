// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WorksLoading from '@/app/works/loading';
import CrewLoading from '@/app/crew/loading';
import ClassLoading from '@/app/class/loading';

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
