import "server-only";
import { publicDetailPath } from "./public-routes";
import { dataset } from "@/sanity/env";
import type { getWriteClient } from "@/sanity/lib/writeClient";

type Client = ReturnType<typeof getWriteClient>;

/**
 * /manage 변경 이력: Sanity가 보관하는 문서 이력(History API)을 읽어서
 * "언제, 무엇이 바뀌었는지"를 보여주고 이전 상태로 되돌린다.
 * 되돌린 직후의 상태도 이력에 새로 남으므로 되돌리기를 다시 되돌릴 수 있다.
 */

export type HistoryAreaKey = "instructors" | "crew" | "works" | "studio" | "studio-info" | "contact";

export type HistoryArea = {
    title: string;
    type: string;
    tag: string;
    /** 저장 직후 갱신할 공개·관리 경로 */
    paths: string[];
    /** 문서 하나짜리(고정 _id)면 그 값 */
    fixedId?: string;
    /** 이 항목의 수정 화면 주소 */
    back: (id: string) => string;
    /** 공개 주소가 slug를 쓰는 영역 */
    slugPath?: (slug: string) => string;
    labels: Record<string, string>;
};

export const HISTORY_AREAS: Record<HistoryAreaKey, HistoryArea> = {
    instructors: {
        title: "강사",
        type: "instructor",
        tag: "instructor",
        paths: ["/class", "/manage/instructors"],
        back: (id) => `/manage/instructors/${id}`,
        labels: {
            instructorName: "이름", category: "분야", subtitle: "소제목", lessonInfo: "수업 정보", about: "소개", process: "커리큘럼",
            imagePosition: "사진 위치", portfolioUrl: "포트폴리오 주소", portfolioText: "포트폴리오 문구", portfolioBtn: "포트폴리오 버튼",
            image: "목록 사진", modalImage: "상세 사진", bgImage: "배경 사진", isActive: "공개 여부", trashed: "휴지통", order: "순서",
        },
    },
    crew: {
        title: "크루",
        type: "crew",
        tag: "crew",
        paths: ["/crew", "/manage/crew", "/sitemap.xml"],
        back: (id) => `/manage/crew/${id}`,
        slugPath: (slug) => publicDetailPath("crew", slug) ?? "/crew",
        labels: { name: "영문 이름", koName: "한글 이름", role: "직책", image: "사진", links: "소셜 링크", sections: "프로필 섹션", isActive: "공개 여부", trashed: "휴지통", order: "순서", slug: "주소" },
    },
    works: {
        title: "작업물",
        type: "work",
        tag: "work",
        paths: ["/works", "/manage/works", "/sitemap.xml"],
        back: (id) => `/manage/works/${id}`,
        slugPath: (slug) => publicDetailPath("works", slug) ?? "/works",
        labels: { title: "제목", artist: "아티스트", releaseDate: "발매일", coverImage: "커버 이미지", youtubeUrl: "유튜브 주소", instagramId: "인스타그램 아이디", instagramUrl: "인스타그램 주소", contentBlocks: "상세 페이지 내용", trashed: "휴지통", slug: "주소" },
    },
    studio: {
        title: "스튜디오 공간",
        type: "studioSpace",
        tag: "studioSpace",
        paths: ["/studio", "/manage/studio"],
        back: (id) => `/manage/studio/${id}`,
        labels: { name: "이름", subtitle: "소제목", description: "소개글", prices: "가격", features: "특징", notes: "안내 문구", images: "사진", isActive: "공개 여부", trashed: "휴지통", order: "순서", kind: "종류" },
    },
    "studio-info": {
        title: "스튜디오 안내",
        type: "studioInfo",
        tag: "studioInfo",
        paths: ["/studio"],
        fixedId: "studioInfo",
        back: () => "/manage/studio/info",
        labels: {
            services: "서비스", equipment: "장비", memberships: "멤버십", membershipNote: "멤버십 안내 문구", guidelinesIntro: "이용 안내 소개", parkingWarning: "주차 강조 문구",
            parkingDetail: "주차 안내", parkingFeeLabel: "주차 요금 라벨", parkingFee: "주차 요금", amenities: "편의시설", cctvTitle: "CCTV 제목", cctvDetail: "CCTV 설명", dutyText: "이용 수칙", dutyWarning: "강조 수칙",
        },
    },
    contact: {
        title: "연락처·링크",
        type: "siteSettings",
        tag: "siteSettings",
        paths: ["/"],
        fixedId: "siteSettings",
        back: () => "/manage/contact",
        labels: {
            phone: "전화번호", addressKo: "한글 주소", addressEn: "영문 주소", mapQuery: "지도 검색어", naverMapPlaceUrl: "네이버 지도 주소", naverReservationUrl: "네이버 예약 주소",
            instagramUrl: "인스타그램 주소", blogUrl: "블로그 주소", homeHeadline: "홈페이지 소개 제목", homeIntro: "홈페이지 소개 본문",
        },
    },
};

export function isHistoryArea(v: string): v is HistoryAreaKey {
    return typeof v === "string" && Object.hasOwn(HISTORY_AREAS, v);
}

export { isManagedDocumentId as isHistoryDocumentId } from "./manage-document-id";

export type Revision = { timestamp: string; id: string; created?: boolean };
type Doc = Record<string, unknown>;
const isObj = (v: unknown): v is Doc => !!v && typeof v === "object" && !Array.isArray(v);

export function isHistoryDocument(doc: unknown, id: string, type: string): doc is Doc & { _id: string; _type: string; _rev: string } {
    return isObj(doc) && doc._id === id && doc._type === type && typeof doc._rev === "string" && doc._rev.trim().length > 0;
}

/** 이 문서의 저장 기록(최신순). History API는 줄마다 JSON인 텍스트로 돌려준다. */
export async function listRevisions(client: Client, documentId: string, limit = 25): Promise<Revision[]> {
    const text = await client.request<unknown>({
        uri: `/data/history/${dataset}/transactions/${encodeURIComponent(documentId)}`,
        query: { limit: String(limit), excludeContent: "true", reverse: "true" },
        json: false,
    } as never);
    if (typeof text !== "string") throw new Error("저장 기록의 응답 형식을 확인하지 못했어요.");
    const ids = new Set<string>(); const times = new Set<string>();
    return text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
            const r: unknown = JSON.parse(l);
            if (!isObj(r) || typeof r.id !== "string" || !r.id.trim() || ids.has(r.id) || typeof r.timestamp !== "string" || !Number.isFinite(Date.parse(r.timestamp)) || times.has(r.timestamp)) {
                throw new Error("저장 기록의 응답 형식을 확인하지 못했어요.");
            }
            ids.add(r.id); times.add(r.timestamp);
            // 보관 기간·조회 한도의 마지막 항목을 최초 생성으로 추측하지 않는다.
            const created = Array.isArray(r.mutations) && r.mutations.some((m) => isObj(m) && isObj(m.create) && m.create._id === documentId);
            return { id: r.id, timestamp: r.timestamp, created };
        });
}

/** 특정 저장 시점의 문서 내용. 그 시점에 문서가 없으면 null */
export async function docAt(client: Client, documentId: string, time: string): Promise<Doc | null> {
    const res = await client.request<unknown>({
        uri: `/data/history/${dataset}/documents/${encodeURIComponent(documentId)}`,
        query: { time },
    });
    if (!isObj(res) || !Array.isArray(res.documents) || res.documents.length > 1 || res.documents.some((doc) => doc !== null && !isObj(doc))) throw new Error("저장 내용의 응답 형식을 확인하지 못했어요.");
    return res.documents[0] ?? null;
}

const SYSTEM = new Set(["_id", "_type", "_rev", "_createdAt", "_updatedAt"]);

export function buildHistoryRows(revisions: Revision[], snapshots: (Doc | null)[], limit = 25) {
    return revisions.slice(0, limit).map((r, i) => {
        const doc = snapshots[i] ?? null;
        const prev = snapshots[i + 1] ?? null;
        const comparison = !doc ? "unavailable" : r.created ? "created" : prev ? "available" : i + 1 < revisions.length ? "unavailable" : "boundary";
        return { ...r, doc, prev, comparison, keys: comparison === "available" ? changedKeys(prev, doc) : [] };
    });
}

/** 두 문서에서 값이 달라진 항목 이름들 (시스템 필드 제외) */
export function changedKeys(a: Doc | null, b: Doc | null): string[] {
    const keys = new Set<string>([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
    return [...keys].filter((k) => !SYSTEM.has(k) && JSON.stringify(historyValue(a, k) ?? null) !== JSON.stringify(historyValue(b, k) ?? null));
}

/** 존재하지 않는 constructor 등의 필드가 객체 기본 속성으로 표시되지 않게 한다. */
export function historyValue(doc: Doc | null | undefined, key: string): unknown {
    return doc && Object.hasOwn(doc, key) ? doc[key] : undefined;
}

/** 값을 한 줄로 요약 (이력 화면 표시용) */
export function summarizeValue(v: unknown): string {
    if (v === undefined || v === null || v === "") return "(비어 있음)";
    if (typeof v === "boolean") return v ? "예" : "아니요";
    if (typeof v === "string") return v.length > 60 ? `${v.slice(0, 60)}…` : v;
    if (typeof v === "number") return String(v);
    if (Array.isArray(v)) return `${v.length}개 항목`;
    if (typeof v === "object") return "사진·객체";
    return String(v);
}

/** 되돌릴 때 쓸 문서: 시스템 필드를 정리하고, 휴지통·순서는 지금 값을 유지한다 */
export function buildRestoredDoc(old: Doc, current: Doc | null): Doc {
    const next: Doc = Object.fromEntries(Object.entries(old).filter(([k]) => k !== "_rev" && k !== "_updatedAt"));
    for (const keep of ["trashed", "order"]) {
        if (current && Object.hasOwn(current, keep)) next[keep] = current[keep];
        else delete next[keep];
    }
    return next;
}

/** 전체 교체 대신 조건부 patch로 내용을 복원한다. 시스템 필드는 현재 값을 유지한다. */
export function buildRestorePatch(old: Doc, current: Doc) {
    const restored = buildRestoredDoc(old, current);
    return {
        set: Object.fromEntries(Object.entries(restored).filter(([key]) => !SYSTEM.has(key))),
        unset: Object.keys(current).filter((key) => !SYSTEM.has(key) && !Object.hasOwn(restored, key)),
    };
}
