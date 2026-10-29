export const WORKS_PER_PAGE = 12;
export type WorksSearchParams = Record<string, string | string[] | undefined>;

/** 소수·지수 표기·비정상 값은 페이지 번호로 취급하지 않는다. */
export function worksPage(value: unknown, totalItems: number): { page: number; totalPages: number } {
    const totalPages = Math.max(1, Math.ceil(totalItems / WORKS_PER_PAGE));
    const raw = Array.isArray(value) ? value[0] : value;
    const number = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : 1;
    const page = Number.isSafeInteger(number) && number > 0 ? Math.min(number, totalPages) : 1;
    return { page, totalPages };
}

export function worksQueryString(params: WorksSearchParams): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
        else if (value !== undefined) query.append(key, value);
    }
    return query.toString();
}

export function worksPageHref(query: string, page: number): string {
    const params = new URLSearchParams(query);
    params.delete("page");
    if (page > 1) params.set("page", String(page));
    return params.size ? `/works?${params.toString()}` : "/works";
}
