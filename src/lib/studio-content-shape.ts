import "server-only";
import type { StudioContentError } from "./studio-content-limits";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const owns = (value: Raw, field: string) => Object.hasOwn(value, field);
const strings = (value: unknown): value is string[] => Array.isArray(value) && Array.from(value).every((item) => typeof item === "string");
const hasStrings = (row: Raw, fields: readonly string[]) => fields.every((field) => owns(row, field) && typeof row[field] === "string");
const validOptionalKey = (row: Raw) => !owns(row, "_key") || typeof row._key === "string";

function failure(id: string, label: string): StudioContentError {
    return { error: `${label}: 입력 형식을 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.`, fields: [{ id, label }] };
}

/** 공간 폼은 네 목록을 모두 보낸다. 누락과 명시적인 빈 배열을 구분한다. */
export function studioSpaceShapeError(value: unknown): StudioContentError | null {
    if (!object(value)) return failure("name", "공간 입력");
    for (const [field, label] of [["prices", "가격"], ["images", "사진"], ["features", "장비·특징"], ["notes", "안내 문구"]] as const) {
        if (!owns(value, field) || !Array.isArray(value[field])) return failure(field, label);
    }
    for (const row of value.prices as unknown[]) {
        if (!object(row) || !validOptionalKey(row) || !hasStrings(row, ["label", "value", "unit"])) return failure("prices", "가격");
    }
    for (const row of value.images as unknown[]) {
        if (!object(row) || !owns(row, "_key") || typeof row._key !== "string" || !row._key) return failure("images", "사진");
    }
    if (!strings(value.features)) return failure("features", "장비·특징");
    if (!strings(value.notes)) return failure("notes", "안내 문구");
    return null;
}

/** 안내 폼 전체 스냅샷 검증. 빈 문자열·빈 배열은 사용자의 명시적 삭제로 허용한다. */
export function studioInfoShapeError(value: unknown): StudioContentError | null {
    if (!object(value)) return failure("services", "스튜디오 안내");
    for (const [field, label] of [["services", "서비스"], ["equipment", "장비"], ["memberships", "멤버십"], ["amenities", "편의시설"]] as const) {
        if (!owns(value, field) || !Array.isArray(value[field])) return failure(field, label);
    }
    for (const [field, label] of [
        ["membershipNote", "멤버십 안내"], ["guidelinesIntro", "이용 안내 소개"], ["parkingWarning", "주차 강조 문구"],
        ["parkingDetail", "주차 안내"], ["parkingFeeLabel", "주차 요금 라벨"], ["parkingFee", "주차 요금"],
        ["cctvTitle", "CCTV 제목"], ["cctvDetail", "CCTV 설명"], ["dutyText", "이용 수칙"], ["dutyWarning", "강조 수칙"],
    ] as const) {
        if (!owns(value, field) || typeof value[field] !== "string") return failure(field, label);
    }
    for (const [field, label, fields, nested] of [
        ["services", "서비스", ["title", "price", "priceUnit"], "points"],
        ["equipment", "장비", ["title"], "items"],
        ["memberships", "멤버십", ["num", "label", "sub", "price"], null],
    ] as const) {
        for (const row of value[field] as unknown[]) {
            if (!object(row) || !validOptionalKey(row) || !hasStrings(row, fields)) return failure(field, label);
            if (nested && (!owns(row, nested) || !strings(row[nested]))) return failure(field, label);
        }
    }
    if (!strings(value.amenities)) return failure("amenities", "편의시설");
    return null;
}
