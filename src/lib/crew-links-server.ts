import "server-only";
import { arrayKeyError } from "./manage-array-keys";
import { externalHttpUrl } from "./content-urls";

type Raw = Record<string, unknown>;
type LinkInput = { index: number; key: string; url: string; keep: string | null; previous: Raw | null };
type Failure = { error: string; field: { id: string; label: string } };
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const PREFIX = /^(linkUrl|linkKey|linkIconKeep|linkIconFile)_/;
const INPUT = /^(linkUrl|linkKey|linkIconKeep|linkIconFile)_(0|[1-9]\d*)$/;
const failure = (index?: number, original = false): Failure => ({
    error: original ? "소셜 링크: 이 편집기에서 다루지 않는 원본 정보가 있어 저장하지 않았어요. 입력을 따로 보관한 뒤 /admin에서 확인해 주세요." : "소셜 링크 입력을 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.",
    field: { id: index === undefined ? "links" : `linkUrl_${index}`, label: "소셜 링크" },
});

/** 모든 행을 검사한 뒤에만 호출부가 업로드한다. null은 목록 입력 전체 생략(기존 목록 유지)이다. */
export function prepareCrewLinks(data: FormData, existing: unknown = []): { rows: LinkInput[] | null } | Failure {
    const inputs = [...data.keys()].filter((name) => PREFIX.test(name));
    if (!data.has("linkCount")) return inputs.length ? failure() : { rows: null };
    const rawCount = data.get("linkCount");
    if (data.getAll("linkCount").length !== 1 || typeof rawCount !== "string" || !/^(0|[1-9]\d*)$/.test(rawCount)) return failure();
    const count = Number(rawCount);
    if (!Number.isSafeInteger(count) || count > 10) return failure();
    for (const name of inputs) {
        const match = INPUT.exec(name);
        if (!match || Number(match[2]) >= count || data.getAll(name).length !== 1) return failure();
    }
    const rows: LinkInput[] = [];
    for (let index = 0; index < count; index++) {
        const url = data.get(`linkUrl_${index}`);
        const key = data.get(`linkKey_${index}`);
        const keep = data.get(`linkIconKeep_${index}`);
        if (typeof url !== "string" || key !== null && typeof key !== "string" || keep !== null && typeof keep !== "string") return failure(index);
        rows.push({ index, key: key ?? "", url: url.trim(), keep: keep === null ? null : keep.trim(), previous: null });
    }
    const keyError = arrayKeyError(rows.map((row) => ({ _key: row.key })), "소셜 링크");
    if (keyError) return { error: keyError, field: { id: "links", label: "소셜 링크" } };
    for (const row of rows) {
        if (row.url && !externalHttpUrl(row.url)) return {
            error: `링크 ${row.index + 1}번의 주소가 올바르지 않아요. 브라우저 주소창의 주소를 복사해 붙여넣어 주세요.`,
            field: { id: `linkUrl_${row.index}`, label: `링크 ${row.index + 1}번 주소` },
        };
    }
    if (existing !== null && !Array.isArray(existing)) return failure(undefined, true);
    for (const source of existing ?? []) {
        if (!object(source)) return failure(undefined, true);
        const keyed = Object.hasOwn(source, "_key") && typeof source._key === "string" && !!source._key;
        const matching = keyed ? rows.find((row) => row.key === source._key) : undefined;
        // 유효한 원본 키가 전체 제출 목록에서 빠졌을 때만 기존 명시적 삭제 계약이다.
        if (keyed && !matching) continue;
        if (Object.keys(source).some((field) => !["_key", "url", "iconImage"].includes(field))) return failure(matching?.index, true);
        if (matching) matching.previous = source;
    }
    return { rows };
}
