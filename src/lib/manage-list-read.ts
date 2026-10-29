import "server-only";
import { isManagedDocumentId } from "./manage-document-id";
import type { DetailDocumentType } from "./manage-detail-read";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) => value === undefined || value === null;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const TEXT_FIELDS = {
    instructor: ["instructorName", "category"], crew: ["name", "koName", "role"],
    work: ["title", "artist", "releaseDate"], studioSpace: ["name", "kind"],
} as const;

/** 일부 행을 빼서 순서·개수를 바꾸지 않고, 변경 대상을 확인한 뒤 목록을 연다. */
export function listReadIssue(type: DetailDocumentType, rows: unknown, trashCount: unknown, isTrashView: boolean): { fields: string[] } | null {
    const invalid = new Set<string>();
    if (!count(trashCount)) invalid.add("휴지통 개수");
    if (!Array.isArray(rows)) return { fields: ["목록 응답", ...invalid] };
    const ids = new Set<string>();
    for (const row of rows) {
        if (!object(row)) { invalid.add("목록 항목"); continue; }
        if (typeof row._id !== "string" || !isManagedDocumentId(row._id) || row._type !== type || ids.has(row._id)) invalid.add("문서 식별 정보");
        if (typeof row._id === "string") ids.add(row._id);
        if (TEXT_FIELDS[type].some((field) => !missing(row[field]) && typeof row[field] !== "string")) invalid.add("이름·설명 정보");
        if (!missing(row._updatedAt) && typeof row._updatedAt !== "string") invalid.add("수정 시각");
        if ((!missing(row.trashed) && typeof row.trashed !== "boolean") || (row.trashed === true) !== isTrashView) invalid.add("휴지통 상태");
        if (type !== "work") {
            if (!missing(row.isActive) && typeof row.isActive !== "boolean") invalid.add("공개 상태");
            if (!missing(row.order) && (typeof row.order !== "number" || !Number.isFinite(row.order))) invalid.add("표시 순서");
        }
        if (type === "studioSpace" && !missing(row.photoCount) && !count(row.photoCount)) invalid.add("사진 개수");
    }
    return invalid.size ? { fields: [...invalid] } : null;
}
