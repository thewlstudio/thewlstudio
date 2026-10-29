/**
 * 크루 프로필 섹션의 공통 모델. 편집 화면(클라이언트)과 저장(서버)이 같은 정의를 쓴다.
 * 섹션 종류는 sanity/schemaTypes/crewType.ts, 화면 표시는 crew/[slug]/CrewDetailClient.tsx와 맞춰져 있다.
 */
export const SECTION_META = {
    aboutSection: { label: "소개", en: "ABOUT" },
    discographySection: { label: "음반 경력", en: "DISCOGRAPHY" },
    careerSection: { label: "경력", en: "CAREER" },
    awardsAndActivitiesSection: { label: "수상·대외활동", en: "AWARDS & ACTIVITIES" },
    educationSection: { label: "학력", en: "EDUCATION" },
    certificationsSection: { label: "자격증", en: "CERTIFICATIONS" },
} as const;

export type KnownType = keyof typeof SECTION_META;
export const KNOWN_TYPES = Object.keys(SECTION_META) as KnownType[];

export function isKnownType(t: unknown): t is KnownType {
    return typeof t === "string" && Object.hasOwn(SECTION_META, t);
}

export const LIMITS = { sections: 20, rows: 100, text: 5000, line: 300 } as const;

/** 한 줄짜리 항목 (경력 한 건, 수상 한 건, 트랙 한 곡, 학력 한 줄…) */
export type Row = { key: string; date: string; title: string; desc: string };
export type YearGroup = { key: string; year: string; tracks: Row[] };

export type SectionState =
    | { key: string; type: "aboutSection"; text: string }
    | { key: string; type: "discographySection"; years: YearGroup[] }
    | { key: string; type: "careerSection"; items: Row[] }
    | { key: string; type: "awardsAndActivitiesSection"; awards: Row[]; activities: Row[] }
    | { key: string; type: "educationSection" | "certificationsSection"; items: Row[] }
    | { key: string; type: "legacy"; legacyType: string; raw: Record<string, unknown> };

let seq = 0;
/** 새로 만든 항목의 임시 키 — 서버가 저장할 때 진짜 키로 바꾼다 */
export function newKey() {
    seq += 1;
    return `new-${Date.now().toString(36)}-${seq}`;
}

export function emptyRow(): Row {
    return { key: newKey(), date: "", title: "", desc: "" };
}

export function emptySection(type: KnownType): SectionState {
    const key = newKey();
    switch (type) {
        case "aboutSection":
            return { key, type, text: "" };
        case "discographySection":
            return { key, type, years: [] };
        case "awardsAndActivitiesSection":
            return { key, type, awards: [], activities: [] };
        case "careerSection":
            return { key, type, items: [] };
        default:
            return { key, type, items: [] };
    }
}

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

function toRow(r: Raw | string, i: number): Row {
    if (typeof r === "string") return { key: `str-${i}-${r.length}`, date: "", title: r, desc: "" };
    return { key: s(r._key) || newKey(), date: s(r.date), title: s(r.title), desc: s(r.desc) };
}

/** 서버에서 읽은 sections 배열 → 편집 상태 */
export function toState(raw: unknown): SectionState[] {
    return arr(raw).map((sec): SectionState => {
        const key = s(sec._key) || newKey();
        const type = s(sec._type);
        switch (type) {
            case "aboutSection":
                return { key, type, text: s(sec.text) };
            case "discographySection":
                return {
                    key,
                    type,
                    years: arr(sec.years).map((y) => ({
                        key: s(y._key) || newKey(),
                        year: s(y.year),
                        tracks: arr(y.tracks).map(toRow),
                    })),
                };
            case "careerSection":
                return { key, type, items: arr(sec.items).map(toRow) };
            case "awardsAndActivitiesSection":
                return { key, type, awards: arr(sec.awards).map(toRow), activities: arr(sec.activities).map(toRow) };
            case "educationSection":
            case "certificationsSection":
                return {
                    key,
                    type,
                    items: (Array.isArray(sec.items) ? (sec.items as unknown[]) : []).map((it, i) =>
                        toRow(typeof it === "string" ? it : (it as Raw), i),
                    ),
                };
            default:
                return { key, type: "legacy", legacyType: type, raw: sec };
        }
    });
}

const rowOut = (r: Row, withDate: boolean, withDesc: boolean) => ({
    _key: r.key,
    title: r.title,
    ...(withDate ? { date: r.date } : {}),
    ...(withDesc ? { desc: r.desc } : {}),
});

/** 편집 상태 → 서버로 보낼 JSON (서버가 다시 검증·정리한다) */
export function toPayload(states: SectionState[]) {
    return states.map((st) => {
        switch (st.type) {
            case "aboutSection":
                return { _key: st.key, _type: st.type, text: st.text };
            case "discographySection":
                return {
                    _key: st.key,
                    _type: st.type,
                    years: st.years.map((y) => ({ _key: y.key, year: y.year, tracks: y.tracks.map((t) => rowOut(t, false, true)) })),
                };
            case "careerSection":
                return { _key: st.key, _type: st.type, items: st.items.map((r) => rowOut(r, true, true)) };
            case "awardsAndActivitiesSection":
                return {
                    _key: st.key,
                    _type: st.type,
                    awards: st.awards.map((r) => rowOut(r, true, false)),
                    activities: st.activities.map((r) => rowOut(r, true, false)),
                };
            case "legacy":
                // 내용은 서버가 기존 문서에서 직접 다시 읽는다 (클라이언트가 보낸 값은 쓰지 않음)
                return { _key: st.key, _type: st.legacyType, legacy: true };
            default:
                return { _key: st.key, _type: st.type, items: st.items.map((r) => r.title) };
        }
    });
}

/** 예전 형식(수상/대외활동) 섹션을 새 형식(수상·대외활동)으로 옮긴 결과를 만든다 */
export function migrateLegacy(states: SectionState[], legacyKey: string): SectionState[] {
    const idx = states.findIndex((x) => x.key === legacyKey && x.type === "legacy");
    if (idx === -1) return states;
    const legacy = states[idx] as Extract<SectionState, { type: "legacy" }>;
    if (legacy.legacyType !== "awardsSection" && legacy.legacyType !== "activitiesSection") return states;
    const rows = arr(legacy.raw.items).map(toRow).map((r) => ({ ...r, key: newKey() }));
    const target = legacy.legacyType === "awardsSection" ? "awards" : "activities";

    const withoutLegacy = states.filter((_, i) => i !== idx);
    const existing = withoutLegacy.findIndex((x) => x.type === "awardsAndActivitiesSection");
    if (existing !== -1) {
        return withoutLegacy.map((x, i) =>
            i === existing && x.type === "awardsAndActivitiesSection" ? { ...x, [target]: [...x[target], ...rows] } : x,
        );
    }
    const created: SectionState = {
        key: newKey(),
        type: "awardsAndActivitiesSection",
        awards: target === "awards" ? rows : [],
        activities: target === "activities" ? rows : [],
    };
    return [...withoutLegacy.slice(0, idx), created, ...withoutLegacy.slice(idx)];
}
