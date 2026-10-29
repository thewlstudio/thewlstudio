import { FALLBACK_INFO } from "@/lib/studio-info";

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);

/** 기존의 정상 저장 테스트를 실제 폼의 완전한 스냅샷 형식으로 구성한다. 잘못된 값은 보정하지 않는다. */
export function studioSpacePayload(values: Raw = {}): Raw {
    const out: Raw = { prices: [], features: [], notes: [], images: [], ...values };
    if (Array.isArray(out.prices)) out.prices = out.prices.map((row) => isObject(row) ? { label: "", value: "", unit: "", ...row } : row);
    return out;
}

export function studioInfoPayload(values: Raw = {}): Raw {
    const out: Raw = { ...FALLBACK_INFO, ...values };
    for (const [name, defaults] of [
        ["services", { title: "", price: "", priceUnit: "", points: [] }],
        ["equipment", { title: "", items: [] }],
        ["memberships", { num: "", label: "", sub: "", price: "" }],
    ] as const) {
        const rows = out[name];
        if (Array.isArray(rows)) out[name] = rows.map((row) => isObject(row) ? { ...defaults, ...row } : row);
    }
    return out;
}
