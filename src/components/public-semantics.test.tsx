// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import About from './About';
import Hero from './Hero';
import ClassClient, { type Instructor } from '@/app/class/ClassClient';
import StudioClient from '@/app/studio/StudioClient';
import CrewClient from '@/app/crew/CrewClient';
import CrewDetailClient from '@/app/crew/[slug]/CrewDetailClient';
import WorksClient from '@/app/works/WorksClient';
import WorkDetailClient from '@/app/works/[slug]/WorkDetailClient';
import { FALLBACK_INFO } from '@/lib/studio-info';
import { FALLBACK_LOBBY, FALLBACK_ROOMS } from '@/lib/studio-spaces';
import type { CrewMemberDetail, WorkDetail } from '@/types/sanity';

vi.mock('./Header', () => ({ default: () => null }));
vi.mock('./Footer', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));
vi.mock('./CmsImage', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));
vi.mock('@/sanity/lib/image', () => ({ urlFor: () => ({ url: () => '/test.jpg' }) }));
vi.mock('next-sanity', () => ({ PortableText: () => null }));
vi.mock('motion/react', async () => {
    const { createElement } = await import('react');
    const ignored = new Set(['initial', 'animate', 'exit', 'transition', 'viewport', 'whileInView', 'variants']);
    const cache = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    return { AnimatePresence: ({ children }: { children: ReactNode }) => children,
        motion: new Proxy({}, { get: (_, tag: string) => {
            if (!cache.has(tag)) cache.set(tag, (props) => createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))), props.children as ReactNode));
            return cache.get(tag);
        } }),
    };
});

let root: Root, host: HTMLDivElement;
async function render(node: ReactNode) { await act(async () => root.render(node)); }
const image = { _type: 'image' as const, asset: { _type: 'reference' as const, _ref: 'test' } };
const instructor: Instructor = { _id: 'one', id: 'one', category: 'VOCAL CLASS', instructorName: '김강사', image, bgImage: image, subtitle: '나의 음악을 완성하는 수업', lessonInfo: '레슨', about: ['소개'], process: ['과정'] };
const work: WorkDetail = { title: '작품', slug: 'work', artist: '아티스트', imageUrl: null, lqip: null, releaseDate: '2026. 10. 27.', contentBlocks: [] };
const member: CrewMemberDetail = { name: 'Artist', koName: '크루', role: 'Producer', imageUrl: '/profile.jpg', links: [], sections: [
    { _type: 'aboutSection', _key: 'about', text: '소개' },
    { _type: 'discographySection', _key: 'disco', years: [{ _key: 'year', year: '2026', tracks: [{ _key: 'track', title: '작품', desc: '제작' }] }] },
    { _type: 'careerSection', _key: 'career', items: [{ _key: 'job', date: '2025', title: '제작 경력', desc: '소개' }] },
    { _type: 'awardsAndActivitiesSection', _key: 'awards', awards: [{ _key: 'award', date: '2024', title: '수상' }], activities: [{ _key: 'activity', date: '2023', title: '활동' }] },
    { _type: 'educationSection', _key: 'education', items: ['학력'] },
    { _type: 'certificationsSection', _key: 'certs', items: ['자격'] },
] };
function headings(container: ParentNode = host) { return [...container.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')]; }
function expectOutline() {
    const nodes = headings(); expect(nodes.filter((node) => node.tagName === 'H1')).toHaveLength(1);
    let previous = 0;
    for (const node of nodes) {
        const level = Number(node.tagName.slice(1));
        expect(node.textContent?.trim()).toBeTruthy();
        expect(level, node.textContent ?? '').toBeLessThanOrEqual(previous + 1);
        previous = level;
    }
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('공개 페이지의 의미 구조', () => {
    it('강사 목록은 목록 항목 안의 기본 버튼이고 사진·장식이 버튼 이름을 중복하지 않는다', async () => {
        await render(<ClassClient initialInstructors={[instructor]} />);
        const list = host.querySelector('ul[aria-label="강사 목록"]')!;
        const item = list.firstElementChild!, button = item.querySelector<HTMLButtonElement>('button')!;
        expect(item.tagName).toBe('LI'); expect(item.hasAttribute('role')).toBe(false);
        expect(button.parentElement).toBe(item); expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBe('김강사 강사 · VOCAL CLASS 레슨 안내 보기');
        expect(button.getAttribute('aria-haspopup')).toBe('dialog');
        expect(button.querySelector('div,p,h1,h2,h3,button,a')).toBeNull();
        for (const image of button.querySelectorAll('img')) expect(image.alt).toBe('');
        expectOutline();
        await act(async () => button.click());
        const dialog = document.querySelector('[role="dialog"]')!;
        expect(dialog.getAttribute('aria-label')).toBe('김강사');
        expect(dialog.querySelectorAll('h1')).toHaveLength(0);
        expect(dialog.querySelector('h2')?.textContent).toBe(instructor.subtitle);
        expect([...dialog.querySelectorAll('h3')].map((node) => node.textContent?.trim())).toEqual(['ABOUT LESSON', 'PROCESS', "Instructor's Works"]);
    });
    it('강사가 없는 경우에도 ul 직속 자식은 li이며 공개 화면에 관리자 안내를 노출하지 않는다', async () => {
        await render(<ClassClient initialInstructors={[]} />);
        const list = host.querySelector('ul[aria-label="강사 목록"]')!;
        expect([...list.children].every((node) => node.tagName === 'LI')).toBe(true);
        expect(list.textContent).toContain('등록된 클래스 강사가 없습니다.');
        expect(list.textContent).not.toContain('Sanity');
    });
    it('홈 소개는 로고 문구를 제목으로 중복하지 않고 사진과 공간 이름이 일치한다', async () => {
        await render(<><Hero /><About /></>); expectOutline();
        const photos = [...host.querySelectorAll<HTMLImageElement>('#about img')];
        expect(photos.map((photo) => photo.alt)).toEqual(['화이트라이트 스튜디오 로비', '화이트라이트 스튜디오 A룸', '화이트라이트 스튜디오 C룸', '화이트라이트 스튜디오 D룸', '화이트라이트 스튜디오 B룸']);
        expect(host.querySelector('#about [aria-hidden="true"]')?.textContent?.trim()).toBe('PRODUCER');
    });
    it('Studio의 가격·장식 문구는 제목이 아니고 멤버십 항목은 구역 아래에 놓인다', async () => {
        await render(<StudioClient rooms={FALLBACK_ROOMS} lobby={FALLBACK_LOBBY} info={FALLBACK_INFO} />); expectOutline();
        expect(host.querySelector('#membership h2')?.textContent).toBe('MEMBERSHIP');
        expect([...host.querySelectorAll('#membership h3')].map((node) => node.textContent)).toEqual(FALLBACK_INFO.memberships.map((item) => item.label));
        expect(host.querySelector('img')?.getAttribute('alt')).toBe('');
    });
    it('Crew 상세 6종 구역은 페이지 제목 다음 단계이고 날짜는 제목이 아니다', async () => {
        await render(<CrewDetailClient member={member} path="/crew/artist" />); expectOutline();
        expect(headings().filter((node) => node.tagName === 'H2')).toHaveLength(6);
        expect(headings().some((node) => /202[3-6]|Producer/.test(node.textContent ?? ''))).toBe(false);
        expect(host.querySelector('img')?.alt).toBe('Artist 프로필 사진');
        for (const node of host.querySelectorAll('[class]')) {
            for (const token of node.classList) if (/group-hover\/.*:translate-/.test(token)) expect(token.startsWith('motion-safe:')).toBe(true);
        }
    });
    it('Crew와 Works 카드 제목은 페이지 바로 아래 단계이며 숨긴 중복 문구는 제외한다', async () => {
        await render(<CrewClient members={[{ ...member, slug: 'artist' }]} />); expectOutline();
        expect(host.querySelector('h2')?.textContent).toBe('Artist');
        expect(host.querySelector('[aria-hidden="true"] h3')).toBeNull();
        await render(<WorksClient initialWorks={[work]} />); expectOutline();
        expect(host.querySelector('h2')?.textContent).toBe('작품');
    });
    it('작품의 아티스트는 보조 문구이고 영상·캡션 없는 이미지는 구별되는 이름이 있다', async () => {
        await render(<WorkDetailClient initialWork={{ ...work, contentBlocks: [
            { _type: 'creditGridBlock', _key: 'credit', sections: [{ title: 'Credits', items: [{ value: '크루' }] }] },
            { _type: 'imageBlock', _key: 'image', imageUrl: 'https://cdn.sanity.io/images/test/production/image.jpg' },
            { _type: 'videoEmbedBlock', _key: 'one', url: 'https://www.youtube.com/watch?v=R86SFBXqEdM' },
            { _type: 'videoEmbedBlock', _key: 'two', url: 'https://youtu.be/R86SFBXqEdM' },
        ] }} />); expectOutline();
        expect(headings().map((node) => node.textContent)).toEqual(['작품', 'Credits']);
        expect(host.querySelector('img')?.alt).toBe('작품 관련 이미지 2');
        const names = [...host.querySelectorAll('iframe')].map((node) => node.title);
        expect(names).toEqual(['작품 관련 영상 3', '작품 관련 영상 4']);
        expect(new Set(names).size).toBe(names.length);
    });
});
