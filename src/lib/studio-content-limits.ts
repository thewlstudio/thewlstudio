import "server-only";
import { contentListLimit, contentTextLimit } from "./content-limits";

type Raw = Record<string, unknown>;
export type StudioContentError = { error: string; fields: { id: string; label: string }[] };
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const normalized = (value: unknown) => typeof value === "string" ? value.replace(/\r\n/g, "\n") : "";
const failure = (error: string | null, id: string, label: string): StudioContentError | null => error ? { error, fields: [{ id, label }] } : null;

function listError(value: unknown, max: number, label: string, trim: boolean): string | null {
    const countError = contentListLimit(value, 50, label);
    if (countError) return countError;
    for (const [index, item] of array(value).entries()) {
        const value = normalized(item);
        const error = contentTextLimit(trim ? value.trim() : value, max, `${label} ${index + 1}`);
        if (error) return error;
    }
    return null;
}

/** 공간 카드의 기존 한도를 초과하면 업로드·내용 정리 전에 거부한다. */
export function studioSpaceLimitError(fields: Raw, lists: Raw): StudioContentError | null {
    for (const [id, label, max] of [["name", "이름", 300], ["subtitle", "한 줄 소개", 300], ["description", "공간 설명", 5000]] as const) {
        const error = failure(contentTextLimit(normalized(fields[id]), max, label), id, label);
        if (error) return error;
    }
    for (const [id, label, max] of [["prices", "가격", 10], ["images", "공간 사진", 20]] as const) {
        const error = failure(contentListLimit(lists[id], max, label), id, label);
        if (error) return error;
    }
    for (const [index, price] of array(lists.prices).entries()) {
        if (!object(price)) continue;
        for (const [id, label] of [["label", "라벨"], ["value", "금액"], ["unit", "단위"]] as const) {
            const error = failure(contentTextLimit(normalized(price[id]), 50, `가격 ${index + 1} ${label}`), "prices", "가격");
            if (error) return error;
        }
    }
    for (const [id, label] of [["features", "장비·특징"], ["notes", "안내 문구"]] as const) {
        const error = failure(listError(lists[id], 300, label, false), id, label);
        if (error) return error;
    }
    return null;
}

/** 안내 설정의 기존 한도. 앞뒤 공백·CRLF 정리는 기존 저장 규칙과 같다. */
export function studioInfoLimitError(data: Raw): StudioContentError | null {
    for (const [id, label, max] of [
        ["membershipNote", "멤버십 안내", 3000], ["guidelinesIntro", "이용 안내 소개", 3000],
        ["parkingWarning", "주차 강조 문구", 300], ["parkingDetail", "주차 안내", 3000],
        ["parkingFeeLabel", "주차 요금 라벨", 50], ["parkingFee", "주차 요금", 300],
        ["cctvTitle", "CCTV 제목", 300], ["cctvDetail", "CCTV 설명", 3000],
        ["dutyText", "이용 수칙", 3000], ["dutyWarning", "강조 수칙", 300],
    ] as const) {
        const error = failure(contentTextLimit(normalized(data[id]).trim(), max, label), id, label);
        if (error) return error;
    }
    for (const [id, label, rules] of [
        ["services", "서비스", [["title", "제목", 300], ["price", "금액", 100], ["priceUnit", "단위", 100]]],
        ["equipment", "장비", [["title", "제목", 300]]],
        ["memberships", "멤버십", [["num", "숫자", 10], ["label", "이름", 100], ["sub", "영문 이름", 100], ["price", "금액", 50]]],
    ] as const) {
        const countError = failure(contentListLimit(data[id], 20, label), id, label);
        if (countError) return countError;
        for (const [index, row] of array(data[id]).entries()) {
            if (!object(row)) continue;
            for (const [field, fieldLabel, max] of rules) {
                const error = failure(contentTextLimit(normalized(row[field]).trim(), max, `${label} ${index + 1} ${fieldLabel}`), id, label);
                if (error) return error;
            }
            const nested = id === "services" ? "points" : id === "equipment" ? "items" : null;
            if (nested) {
                const error = failure(listError(row[nested], 300, `${label} ${index + 1} 항목`, true), id, label);
                if (error) return error;
            }
        }
    }
    return failure(listError(data.amenities, 300, "편의시설", true), "amenities", "편의시설");
}
