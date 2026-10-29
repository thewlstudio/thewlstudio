import "server-only";
import { isManagedDocumentId } from "./manage-document-id";

const COUNT_FIELDS = ["instructors", "instructorsHidden", "crew", "crewHidden", "works", "rooms", "lobbies"] as const;
export type HubCounts = Record<typeof COUNT_FIELDS[number], number>;
type RecentType = "instructor" | "crew" | "work" | "studioSpace" | "studioInfo" | "siteSettings";
export type HubRecent = { _id: string; _type: RecentType; _updatedAt: string; title?: string };
type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);

export const HUB_RECENT_META: Record<RecentType, { area: string; href: (id: string) => string; fallback: string; fixedId?: string }> = {
    instructor: { area: "강사", href: (id) => `/manage/instructors/${encodeURIComponent(id)}`, fallback: "강사" },
    crew: { area: "Crew", href: (id) => `/manage/crew/${encodeURIComponent(id)}`, fallback: "크루" },
    work: { area: "Works", href: (id) => `/manage/works/${encodeURIComponent(id)}`, fallback: "작업물" },
    studioSpace: { area: "Studio", href: (id) => `/manage/studio/${encodeURIComponent(id)}`, fallback: "공간" },
    studioInfo: { area: "Studio", href: () => "/manage/studio/info", fallback: "서비스·장비·멤버십·이용 안내", fixedId: "studioInfo" },
    siteSettings: { area: "Contact", href: () => "/manage/contact", fallback: "연락처·링크·홈페이지 소개", fixedId: "siteSettings" },
};

/** 읽기 실패와 실제 0건을 구분한다. 알려진 건수 외의 원본 필드는 반환하지 않는다. */
export function readHubCounts(raw: unknown): HubCounts | null {
    if (!object(raw) || COUNT_FIELDS.some((field) => !Object.hasOwn(raw, field) || typeof raw[field] !== "number" || !Number.isSafeInteger(raw[field]) || raw[field] < 0)) return null;
    const counts = Object.fromEntries(COUNT_FIELDS.map((field) => [field, raw[field]])) as HubCounts;
    if (counts.instructorsHidden > counts.instructors || counts.crewHidden > counts.crew) return null;
    return counts;
}

/** 잘못된 행을 조용히 빼지 않는다. 보조 목록만 생략하고 허브 내비게이션은 유지한다. */
export function readHubRecent(raw: unknown): HubRecent[] | null {
    if (!Array.isArray(raw)) return null;
    const ids = new Set<string>(); const recent: HubRecent[] = [];
    for (const row of raw) {
        if (!object(row) || typeof row._id !== "string" || !isManagedDocumentId(row._id) || ids.has(row._id) || typeof row._type !== "string" || !Object.hasOwn(HUB_RECENT_META, row._type)) return null;
        const type = row._type as RecentType;
        const meta = HUB_RECENT_META[type];
        if (meta.fixedId && meta.fixedId !== row._id) return null;
        if (typeof row._updatedAt !== "string" || !row._updatedAt.trim() || !Number.isFinite(Date.parse(row._updatedAt))) return null;
        if (row.title !== undefined && row.title !== null && typeof row.title !== "string") return null;
        ids.add(row._id);
        recent.push({ _id: row._id, _type: type, _updatedAt: row._updatedAt, title: typeof row.title === "string" ? row.title : undefined });
    }
    return recent;
}
