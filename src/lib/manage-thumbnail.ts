import "server-only";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { urlFor } from "@/sanity/lib/image";
import { isPublicImageSource } from "./public-image";

/** 목록의 사진 하나를 읽지 못해도 문서 목록·변경 대상에는 영향을 주지 않는다. */
export function manageThumbnail(source: unknown): string | null {
    if (!source) return null;
    try {
        const url = urlFor(source as SanityImageSource).width(112).height(112).fit("crop").url();
        return url.startsWith("https://cdn.sanity.io/") && isPublicImageSource(url) ? url : null;
    } catch {
        return null;
    }
}
