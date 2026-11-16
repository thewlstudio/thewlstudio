import "server-only";
import type { WorkSummary, CrewMemberSummary } from "@/types/sanity";
import type { Instructor } from "@/app/class/ClassClient";
import { urlFor } from "@/sanity/lib/image";
import { mergeInfo, type StudioInfo } from "./studio-info";
import type { StudioSpaceData } from "./studio-spaces";

type Raw = Record<string, unknown>;
type Lists = { work: WorkSummary; crew: CrewMemberSummary; instructor: Instructor; studioSpace: StudioSpaceData & { kind?: "room" | "lobby" } };
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) => value === null || value === undefined;
const own = (row: Raw, field: string) => !(field in row) || Object.hasOwn(row, field);
const texts = (row: Raw, fields: readonly string[]) => fields.every((field) => own(row, field) && (missing(row[field]) || typeof row[field] === "string"));
const requiredText = (row: Raw, field: string) => Object.hasOwn(row, field) && typeof row[field] === "string";
function list(value: unknown, valid: (row: unknown) => boolean): boolean {
    if (!Array.isArray(value)) return false;
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index) || !valid(value[index])) return false;
    return true;
}
const strings = (value: unknown) => list(value, (row) => typeof row === "string");
const optionalList = (row: Raw, field: string, valid: (value: unknown) => boolean) => own(row, field) && (missing(row[field]) || list(row[field], valid));
const optionalStrings = (row: Raw, field: string) => optionalList(row, field, (value) => typeof value === "string");
function image(value: unknown): boolean {
    if (missing(value)) return true;
    if (!object(value) || !Object.hasOwn(value, "asset") || !object(value.asset) || !Object.hasOwn(value.asset, "_ref") || typeof value.asset._ref !== "string") return false;
    try { urlFor(value as Parameters<typeof urlFor>[0]).url(); return true; }
    catch { return false; }
}

/** 화면에서 읽는 필드의 자료형만 확인한다. 행을 버리거나 원본 값을 보정하지 않는다. */
export function readPublicList<K extends keyof Lists>(kind: K, raw: unknown): Lists[K][] {
    const fail = () => { throw new Error(`Invalid public list response: ${kind}`); };
    if (!list(raw, object)) return fail();
    const rows = raw as Raw[];
    const ids = new Set<string>();
    for (const row of rows) {
        let valid: boolean;
        if (kind === "work") {
            valid = requiredText(row, "title") && requiredText(row, "artist") && texts(row, ["slug", "releaseDate", "imageUrl", "lqip"]);
        } else if (kind === "crew") {
            valid = requiredText(row, "name") && texts(row, ["slug", "koName", "role", "imageUrl"]) && optionalList(row, "links", (link) => object(link) && texts(link, ["url", "iconUrl"]));
        } else if (kind === "instructor") {
            valid = requiredText(row, "_id") && requiredText(row, "instructorName") && requiredText(row, "category") &&
                texts(row, ["subtitle", "lessonInfo", "imagePosition", "bgScale", "bgPosition", "portfolioUrl", "portfolioText", "portfolioBtn"]) &&
                optionalStrings(row, "about") && optionalStrings(row, "process") &&
                ["image", "modalImage", "bgImage"].every((field) => own(row, field) && image(row[field]));
        } else {
            valid = requiredText(row, "name") && texts(row, ["subtitle", "description"]) && own(row, "kind") &&
                (missing(row.kind) || row.kind === "room" || row.kind === "lobby") &&
                Object.hasOwn(row, "prices") && list(row.prices, (price) => object(price) && texts(price, ["label", "value", "unit"])) &&
                Object.hasOwn(row, "features") && strings(row.features) && optionalStrings(row, "notes") && Object.hasOwn(row, "images") && strings(row.images);
        }
        if (!valid) return fail();
        const id = kind === "instructor" ? row._id : kind === "studioSpace" ? undefined : row.slug;
        if (typeof id === "string") { if (ids.has(id)) return fail(); ids.add(id); }
    }
    return raw as Lists[K][];
}

/** 누락 필드·명시적인 빈 값에 대한 기존 기본값 정책은 유효한 원본에만 적용한다. */
export function readPublicStudioInfo(raw: unknown): StudioInfo {
    if (raw === null) return mergeInfo(null);
    const fail = () => { throw new Error("Invalid public studioInfo response"); };
    if (!object(raw) || !texts(raw, ["membershipNote", "guidelinesIntro", "parkingWarning", "parkingDetail", "parkingFeeLabel", "parkingFee", "cctvTitle", "cctvDetail", "dutyText", "dutyWarning"]) || !optionalStrings(raw, "amenities")) return fail();
    for (const [field, fields, nested] of [
        ["services", ["title", "price", "priceUnit"], "points"],
        ["equipment", ["title"], "items"],
        ["memberships", ["num", "label", "sub", "price"], null],
    ] as const) {
        if (!optionalList(raw, field, (row) => object(row) && texts(row, fields) && (!nested || optionalStrings(row, nested)))) return fail();
    }
    return mergeInfo(raw);
}
