import { describe, expect, it } from 'vitest';
import { isPublicImageSource, publicImageFallback, PUBLIC_IMAGE_FALLBACK } from './public-image';

describe('공개 이미지 src의 허용 범위', () => {
    it.each(['/images/lobby_1.jpg', '/_next/static/media/test.png', '/images/my photo.jpg', 'https://cdn.sanity.io/images/project/production/image.png', 'https://cdn.sanity.io/images/project/production/image.svg', 'HTTPS://CDN.SANITY.IO/images/p/d/a.png', 'data:image/png;base64,abc', 'blob:http://localhost:3000/photo'])('Next가 처리할 수 있는 기존 src를 유지한다: %s', (source) => {
        expect(isPublicImageSource(source)).toBe(true);
    });
    it.each(['', ' ', ' /images/photo.jpg', '/images/photo.jpg ', '//example.com/photo.jpg', '/\\example.com/photo.jpg', 'javascript:alert(1)', 'data:text/html,hello', 'DATA:image/png;base64,abc', 'BLOB:http://localhost/photo', 'blob:', 'photo.jpg', 'http://cdn.sanity.io/images/p/d/a.jpg', 'https://cdn.sanity.io.evil.test/photo.jpg', 'https://user:pass@cdn.sanity.io/photo.jpg', 'https://cdn.sanity.io:444/photo.jpg', 'https://example.com/photo.jpg', 'https://cdn.sanity.io/\nphoto.jpg', null, undefined, 1])('불명확하거나 허용 범위 밖인 src는 요청하지 않는다: %s', (source) => {
        expect(isPublicImageSource(source)).toBe(false);
    });
    it('대체 이미지는 외부 요청·사용자 입력 없는 image data URL이다', () => {
        expect(isPublicImageSource(PUBLIC_IMAGE_FALLBACK)).toBe(true);
        const svg = decodeURIComponent(PUBLIC_IMAGE_FALLBACK.slice('data:image/svg+xml,'.length));
        expect(svg).toContain('<svg');
        expect(svg).not.toMatch(/<script|<image|<foreignObject|href=/i);
    });
    it.each([[600, 300], [300, 600], [1200, 800]])('%s×%s 예약 크기에 맞는 실제 SVG 비율을 사용한다', (width, height) => {
        const svg = decodeURIComponent(publicImageFallback(width, height).slice('data:image/svg+xml,'.length));
        expect(svg).toContain(`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`);
    });
    it('치수 문자열을 SVG 코드로 삽입하지 않는다', () => {
        expect(publicImageFallback('" onload="alert(1)', Infinity)).toBe(PUBLIC_IMAGE_FALLBACK);
        expect(publicImageFallback(Symbol('width'), {})).toBe(PUBLIC_IMAGE_FALLBACK);
    });
});
