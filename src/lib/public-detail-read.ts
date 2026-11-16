import "server-only";
import type { WorkDetail, CrewMemberDetail } from "@/types/sanity";

type Raw = Record<string, unknown>;
type Details = { work: WorkDetail; crew: CrewMemberDetail };
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) => value === null || value === undefined;
const own = (row: Raw, field: string) => !(field in row) || Object.hasOwn(row, field);
const texts = (row: Raw, fields: readonly string[]) => fields.every((field) => own(row, field) && (missing(row[field]) || typeof row[field] === "string"));
const requiredText = (row: Raw, field: string) => Object.hasOwn(row, field) && typeof row[field] === "string";

/** 키는 같은 배열 안에서만 확인한다. 없는 키를 CMS에 새로 쓰거나 다른 배열과 합치지 않는다. */
function rows(value: unknown, valid: (row: Raw) => boolean, keyed = false): boolean {
    if (missing(value)) return true;
    if (!Array.isArray(value)) return false;
    const keys = new Set<string>();
    for (let index = 0; index < value.length; index++) {
        const row: unknown = value[index];
        if (!Object.hasOwn(value, index) || !object(row)) return false;
        if (keyed) {
            if (!own(row, "_key")) return false;
            if (!missing(row._key)) {
                if (typeof row._key !== "string" || !row._key.trim() || keys.has(row._key)) return false;
                keys.add(row._key);
            }
        }
        if (!valid(row)) return false;
    }
    return true;
}
function textList(value: unknown): boolean {
    if (missing(value)) return true;
    if (!Array.isArray(value)) return false;
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index) || typeof value[index] !== "string") return false;
    return true;
}
const listField = (row: Raw, field: string, valid: (row: Raw) => boolean, keyed = false) => own(row, field) && rows(row[field], valid, keyed);
const textListField = (row: Raw, field: string) => own(row, field) && textList(row[field]);
const type = (row: Raw) => requiredText(row, "_type") && !!(row._type as string).trim();

function workBlock(block: Raw): boolean {
    if (!type(block)) return false;
    switch (block._type) {
        case "descriptionBlock": return textListField(block, "paragraphs");
        case "signatureMessageBlock": return textListField(block, "paragraphs") && texts(block, ["signature"]);
        case "tracklistBlock": return listField(block, "tracks", (track) => texts(track, ["title", "description"]));
        case "creditGridBlock": return listField(block, "sections", (section) => texts(section, ["title"]) && listField(section, "items", (item) => texts(item, ["role", "value", "linkText", "linkUrl"])));
        case "imageBlock": return texts(block, ["imageUrl", "caption"]);
        case "videoEmbedBlock": return texts(block, ["url"]);
        case "audioBlock": return texts(block, ["audioUrl", "title", "artist"]);
        // 자유 서식은 기존 공개 전용 렌더러가 안전하게 표시한다. 미지원 타입도 재해석하지 않는다.
        default: return true;
    }
}
function crewSection(section: Raw): boolean {
    if (!type(section)) return false;
    switch (section._type) {
        case "aboutSection": return texts(section, ["text"]);
        case "discographySection": return listField(section, "years", (year) => texts(year, ["year"]) && listField(year, "tracks", (track) => texts(track, ["title", "desc"]), true), true);
        case "careerSection": return listField(section, "items", (item) => texts(item, ["date", "title", "desc"]), true);
        case "awardsAndActivitiesSection": return ["awards", "activities"].every((field) => listField(section, field, (item) => texts(item, ["date", "title"]), true));
        case "educationSection": case "certificationsSection": return textListField(section, "items");
        default: return true;
    }
}

/** 정상 없음은 null로 유지하고, 잘못된 표시값은 본문·공유 정보에 넘기기 전에 거부한다. */
export function readPublicDetail<K extends keyof Details>(kind: K, raw: unknown): Details[K] | null {
    if (raw === null) return null;
    const fail = () => { throw new Error(`Invalid public detail response: ${kind}`); };
    if (!object(raw)) return fail();
    const valid = kind === "work"
        ? requiredText(raw, "title") && requiredText(raw, "artist") && texts(raw, ["releaseDate", "imageUrl", "lqip", "youtubeUrl", "instagramId", "instagramUrl"]) && listField(raw, "contentBlocks", workBlock, true)
        : requiredText(raw, "name") && texts(raw, ["koName", "role", "imageUrl"]) && listField(raw, "links", (link) => texts(link, ["url", "iconUrl"])) && listField(raw, "sections", crewSection, true);
    if (!valid) return fail();
    return raw as Details[K];
}
