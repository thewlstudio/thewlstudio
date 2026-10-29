import type { ImageLoaderProps } from 'next/image';
import { dataset, projectId } from '@/sanity/env';

function imageUrl(src: string): URL | null {
    if (/[\u0000-\u0020\u007f\\]/.test(src)) return null;
    try {
        const url = new URL(src);
        if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io' || url.port || url.username || url.password) return null;
        const prefix = `/images/${projectId}/${dataset}/`;
        if (!url.pathname.startsWith(prefix)) return null;
        // SVG와 GIF는 기존 Next 처리에 맡긴다. 사진용 래스터만 CDN에서 리사이즈한다.
        if (!/^[a-zA-Z0-9_-]+-\d+x\d+\.(?:jpe?g|pjpg|png|webp|avif|tiff?)(?:\/[^/]+)?$/i.test(url.pathname.slice(prefix.length))) return null;
        return url;
    } catch { return null; }
}

/** 원본과 자르기 영역은 보존하고, 실제 srcset 크기만 CDN에 요청한다. */
export function sanityImageUrl(src: string, width: number, quality = 75): string | null {
    const url = imageUrl(src);
    if (!url || !Number.isFinite(width) || width <= 0) return null;
    const size = Math.max(1, Math.min(3840, Math.round(width)));
    const params = url.searchParams;
    const previousWidth = Number(params.get('w'));
    const previousHeight = Number(params.get('h'));
    // 이미 w/h로 지정한 프레임은 종횡비를 유지한다. rect·crop·focal point는 그대로 둔다.
    if (previousWidth > 0 && previousHeight > 0 && Number.isFinite(previousHeight / previousWidth)) {
        params.set('h', String(Math.max(1, Math.round(size * previousHeight / previousWidth))));
    } else params.delete('h');
    params.set('w', String(size));
    params.set('q', String(Number.isFinite(quality) ? Math.max(1, Math.min(100, Math.round(quality))) : 75));
    if (!params.has('fit')) params.set('fit', 'max'); // 작은 원본을 불필요하게 확대하지 않는다.
    if (!params.has('fm')) params.set('auto', 'format'); // 투명도 유지, 브라우저 Accept에 따라 형식 선택.
    params.delete('dpr'); // Next srcset의 width에는 이미 기기 해상도가 반영돼 있다.
    url.hash = '';
    return url.toString();
}

export function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
    const result = sanityImageUrl(src, width, quality);
    if (!result) throw new Error('Unsupported Sanity image URL');
    return result;
}

/** 공유/검색 크롤러도 수십 MB 원본 대신 비율을 유지한 이미지를 받게 한다. */
export function socialImageUrl(src: string | null): string | null {
    return src ? sanityImageUrl(src, 1200, 85) ?? src : null;
}
