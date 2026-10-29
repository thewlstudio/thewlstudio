"use client";

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { sanityImageLoader, sanityImageUrl } from '@/lib/sanity-image';
import { isPublicImageSource, publicImageFallback, PUBLIC_IMAGE_FALLBACK } from '@/lib/public-image';

/** CMS 사진은 Sanity에서 한 번만 최적화한다. 로컬 예비 사진은 기존 Next 경로를 유지한다. */
export default function CmsImage(props: Omit<ImageProps, 'loader'>) {
    const asset = typeof props.src === 'object' && props.src !== null
        ? ('default' in props.src ? props.src.default : props.src) : undefined;
    const source = typeof props.src === 'string' ? props.src : asset?.src ?? '';
    // 사진 교체 시 오류 상태만 새로 시작한다. 캐러셀·모달 등 부모 상태는 유지한다.
    return <ImageWithFallback key={source} {...props} source={source} staticWidth={asset?.width} staticHeight={asset?.height} />;
}

function ImageWithFallback({ source, staticWidth, staticHeight, ...props }: Omit<ImageProps, 'loader'> & {
    source: string; staticWidth?: number; staticHeight?: number;
}) {
    const [failed, setFailed] = useState(false);
    const fallback = failed || !isPublicImageSource(source);
    const useCdn = !fallback && sanityImageUrl(source, 640) !== null;
    // Static import의 자동 크기도 fallback src로 바뀐 뒤 그대로 예약한다.
    const width = props.width ?? (props.height && staticWidth && staticHeight ? Math.round(Number(props.height) * staticWidth / staticHeight) : staticWidth);
    const height = props.height ?? (props.width && staticWidth && staticHeight ? Math.round(Number(props.width) * staticHeight / staticWidth) : staticHeight);
    return <Image {...props}
        src={fallback ? (props.fill ? PUBLIC_IMAGE_FALLBACK : publicImageFallback(width, height)) : props.src}
        alt={fallback && props.alt.trim() ? `${props.alt} (이미지를 불러올 수 없습니다)` : props.alt}
        width={fallback && !props.fill ? width : props.width}
        height={fallback && !props.fill ? height : props.height}
        loader={useCdn ? sanityImageLoader : undefined}
        placeholder={fallback ? 'empty' : props.placeholder}
        blurDataURL={fallback ? undefined : props.blurDataURL}
        onLoad={fallback ? undefined : props.onLoad}
        onError={fallback ? undefined : (event) => { setFailed(true); props.onError?.(event); }}
    />;
}
