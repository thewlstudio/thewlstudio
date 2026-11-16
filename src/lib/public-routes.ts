/** CMS 원문 slug를 단일 경로 조각으로 다룬다. 이 검증 자체는 URI를 해석하지 않는다. */
export function isPublicSlug(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && value.trim() === value &&
        value !== "." && value !== ".." && !/[\/\\\u0000-\u001f\u007f]/.test(value);
}

export function publicDetailPath(area: "works" | "crew", slug: unknown): string | null {
    if (!isPublicSlug(slug)) return null;
    try { return `/${area}/${encodeURIComponent(slug)}`; }
    catch { return null; } // 잘못된 유니코드도 링크나 빌드를 중단시키지 않는다.
}

/**
 * Next 16.4.3의 Page params는 인코딩되어 있다(getDynamicParam).
 * 본문 진입점에서만 한 번 해석하고 원문 검증을 다시 적용한다.
 * 원문을 받는 generateMetadata·generateStaticParams·CMS 값에는 사용하지 않는다.
 */
export function decodePublicPageSlug(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        const slug = decodeURIComponent(value);
        if (!isPublicSlug(slug)) return null;
        encodeURIComponent(slug); // 잘못된 유니코드도 저장소 조회 전에 거부한다.
        return slug;
    } catch {
        return null;
    }
}

export function publicStaticParams(rows: unknown): { slug: string }[] {
    // 조회 실패/형식 오류를 정상적인 "항목 없음"으로 바꾸어 빌드하지 않는다.
    if (!Array.isArray(rows)) throw new Error("Invalid static params response: expected an array");
    const slugs = new Set<string>();
    for (let index = 0; index < rows.length; index++) {
        if (!Object.hasOwn(rows, index)) continue;
        const row: unknown = rows[index];
        if (!row || typeof row !== "object" || Array.isArray(row) || !Object.hasOwn(row, "slug")) continue;
        const slug = (row as Record<string, unknown>).slug;
        if (typeof slug === "string" && publicDetailPath("works", slug) !== null) slugs.add(slug);
    }
    // Next에 CMS 원문을 넘긴다. 여기서 URI를 해석하거나 미리 인코딩하지 않는다.
    return [...slugs].map((slug) => ({ slug }));
}
