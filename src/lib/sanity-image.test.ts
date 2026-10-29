import { describe, expect, it } from 'vitest';
import { dataset, projectId } from '@/sanity/env';
import { urlFor } from '@/sanity/lib/image';
import { sanityImageLoader, sanityImageUrl, socialImageUrl } from './sanity-image';

const source = `https://cdn.sanity.io/images/${projectId}/${dataset}/abcdef-3787x5443.png`;

describe('Sanity 사진의 전송 크기', () => {
    it.each([32, 128, 256, 640, 1080, 1920, 3840])('srcset의 %i 픽셀을 CDN에 그대로 요청한다', (width) => {
        const url = new URL(sanityImageLoader({ src: source, width }));
        expect(url.origin + url.pathname).toBe(source);
        expect(url.searchParams.get('w')).toBe(String(width));
        expect(url.searchParams.get('q')).toBe('75');
        expect(url.searchParams.get('fit')).toBe('max');
        expect(url.searchParams.get('auto')).toBe('format');
        expect(url.searchParams.has('h')).toBe(false);
        expect(url.searchParams.has('bg')).toBe(false); // 투명 배경을 임의의 색으로 채우지 않는다.
    });
    it('정수 크기·품질만 만들고 과도한 요청은 제한한다', () => {
        const url = new URL(sanityImageUrl(source, 99999, 999)!);
        expect(url.searchParams.get('w')).toBe('3840');
        expect(url.searchParams.get('q')).toBe('100');
        expect(new URL(sanityImageUrl(source, 255.6, 74.7)!).searchParams.get('w')).toBe('256');
        expect(new URL(sanityImageUrl(source, 1, NaN)!).searchParams.get('q')).toBe('75');
        expect(new URL(sanityImageUrl(source, 1, -1)!).searchParams.get('q')).toBe('1');
    });
    it.each([0, -1, Infinity, NaN])('잘못된 폭 %s은 원본 요청으로 돌아가지 않는다', (width) => {
        expect(sanityImageUrl(source, width)).toBeNull();
        expect(() => sanityImageLoader({ src: source, width })).toThrow('Unsupported');
    });
    it('기존 Sanity 자르기 영역·초점·색 처리와 명시적 형식을 보존한다', () => {
        const input = source + '?rect=10,20,500,800&crop=focalpoint&fp-x=0.3&fp-y=0.7&sat=-100&fm=png&w=500&h=800&fit=crop&dpr=2#old';
        const url = new URL(sanityImageUrl(input, 250, 90)!);
        for (const [name, value] of Object.entries({ rect: '10,20,500,800', crop: 'focalpoint', 'fp-x': '0.3', 'fp-y': '0.7', sat: '-100', fm: 'png', fit: 'crop', w: '250', h: '400', q: '90' })) {
            expect(url.searchParams.get(name)).toBe(value);
        }
        expect(url.searchParams.has('dpr')).toBe(false);
        expect(url.searchParams.has('auto')).toBe(false);
        expect(url.hash).toBe('');
    });
    it('실제 image-url SDK가 만든 편집자 crop도 그대로 적용한다', () => {
        const input = urlFor({ _type: 'image', asset: { _ref: 'image-abcdef-3000x4000-png' }, crop: { left: 0.1, right: 0.2, top: 0.05, bottom: 0.1 }, hotspot: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } }).url();
        const before = new URL(input);
        const after = new URL(sanityImageUrl(input, 256)!);
        expect(before.searchParams.get('rect')).toBeTruthy();
        expect(after.searchParams.get('rect')).toBe(before.searchParams.get('rect'));
        expect(after.pathname).toBe(before.pathname);
    });
    it('높이만 있던 원본도 새로운 폭에서 자연 비율로 축소한다', () => {
        const url = new URL(sanityImageUrl(source + '?h=500', 256)!);
        expect(url.searchParams.has('h')).toBe(false);
        expect(url.searchParams.get('w')).toBe('256');
    });
    it('공유 이미지는 별도 프레임 자르기 없이 1200px로 제한하고 빈 값은 유지한다', () => {
        expect(socialImageUrl(null)).toBeNull();
        const url = new URL(socialImageUrl(source)!);
        expect(url.searchParams.get('w')).toBe('1200');
        expect(url.searchParams.get('q')).toBe('85');
        expect(url.searchParams.has('h')).toBe(false);
        expect(socialImageUrl('/images/studio_logo.jpg')).toBe('/images/studio_logo.jpg');
    });
});

describe('커스텀 CDN 로더의 적용 범위', () => {
    it.each([
        '/images/local.png', 'data:image/png;base64,abc', 'blob:https://example.com/a',
        source.replace('https:', 'http:'), source.replace('cdn.sanity.io', 'cdn.sanity.io.evil.test'),
        source.replace('cdn.sanity.io', 'name:pass@cdn.sanity.io'), source.replace('cdn.sanity.io', 'cdn.sanity.io:444'),
        source.replace(`/images/${projectId}/`, '/images/another-project/'), source.replace(`/${dataset}/`, '/another-dataset/'),
        source.replace('/images/', '/files/'), source + '\n', source.replace('/images/', '/images\\'),
        source.replace('.png', '.svg'), source.replace('.png', '.gif'), 'not-a-url',
    ])('현재 프로젝트의 사진이 아닌 값은 기본 Next 경로에 맡긴다: %s', (src) => {
        expect(sanityImageUrl(src, 256)).toBeNull();
    });
    it.each(['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'])('%s 사진은 지원한다', (extension) => {
        expect(sanityImageUrl(source.replace('.png', '.' + extension), 256)).toBeTruthy();
    });
});
