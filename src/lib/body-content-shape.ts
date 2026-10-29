import "server-only";
import { isEditableType } from "./work-blocks";
import { isKnownType } from "./crew-sections";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const key = (row: Raw, required = false) => required ? Object.hasOwn(row, "_key") && typeof row._key === "string" && !!row._key : !Object.hasOwn(row, "_key") || typeof row._key === "string";
const strings = (row: Raw, fields: readonly string[]) => fields.every((field) => Object.hasOwn(row, field) && typeof row[field] === "string");
const textList = (value: unknown) => Array.isArray(value) && Array.from(value).every((item) => typeof item === "string");
const rows = (value: unknown, fields: readonly string[]): value is Raw[] => Array.isArray(value) && Array.from(value).every((item) => object(item) && key(item) && strings(item, fields));
const failure = (label: string) => `${label}: 입력 형식을 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.`;
const binding = (row: Raw, existing: Raw[]) => key(row, true) && existing.some((previous) => previous._key === row._key && previous._type === row._type);

/** 모든 제출 블록과 보존 참조를 업로드 전에 검사한다. 보존 블록 내용은 서버 원본만 사용한다. */
export function workBlocksShapeError(payload: unknown[], existing: Raw[]): string | null {
    if (existing.some((row) => !object(row))) return failure("저장된 상세 내용");
    for (const [i, row] of payload.entries()) {
        if (!object(row) || !key(row) || !strings(row, ["_type"]) || !row._type) return failure(`블록 ${i + 1}`);
        let valid: boolean;
        switch (row._type) {
            case "descriptionBlock": valid = textList(row.paragraphs); break;
            case "signatureMessageBlock": valid = textList(row.paragraphs) && strings(row, ["signature"]); break;
            case "tracklistBlock": valid = rows(row.tracks, ["title", "description"]); break;
            case "creditGridBlock":
                valid = rows(row.sections, ["title"]) && row.sections.every((section) => rows(section.items, ["role", "value", "linkText", "linkUrl"]));
                break;
            case "imageBlock": valid = key(row, true) && strings(row, ["caption"]); break;
            case "videoEmbedBlock": valid = strings(row, ["url"]); break;
            case "audioBlock": valid = binding(row, existing) && strings(row, ["title", "artist"]); break;
            default: valid = binding(row, existing);
        }
        if (!valid) return failure(`블록 ${i + 1}`);
    }
    for (const row of existing) {
        if (!isEditableType(row._type) && !payload.some((item) => object(item) && item._key === row._key && item._type === row._type)) return failure("보존 블록");
    }
    return null;
}

/** 알려진 섹션은 폼 전체 구조를 검사하고, 예전 형식은 같은 키·종류의 원본만 참조한다. */
export function crewSectionsShapeError(payload: unknown[], existing: Raw[]): string | null {
    if (existing.some((row) => !object(row))) return failure("저장된 프로필");
    for (const [i, row] of payload.entries()) {
        if (!object(row) || !key(row) || !strings(row, ["_type"]) || !row._type) return failure(`섹션 ${i + 1}`);
        let valid: boolean;
        switch (row._type) {
            case "aboutSection": valid = strings(row, ["text"]); break;
            case "discographySection": valid = rows(row.years, ["year"]) && row.years.every((year) => rows(year.tracks, ["title", "desc"])); break;
            case "careerSection": valid = rows(row.items, ["title", "date", "desc"]); break;
            case "awardsAndActivitiesSection": valid = rows(row.awards, ["title", "date"]) && rows(row.activities, ["title", "date"]); break;
            case "educationSection":
            case "certificationsSection": valid = textList(row.items); break;
            default: valid = !isKnownType(row._type) && binding(row, existing);
        }
        if (!valid) return failure(`섹션 ${i + 1}`);
    }
    return null;
}
