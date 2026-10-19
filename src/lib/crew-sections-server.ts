import "server-only";
import { randomUUID } from "crypto";
import { LIMITS, isKnownType } from "./crew-sections";

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const line = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, LIMITS.line) : "");
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, LIMITS.text) : "");
/** 클라이언트의 임시 키("new-…")나 빈 키는 새로 발급, 기존 키는 유지 */
const key = (v: unknown) => (typeof v === "string" && v && !v.startsWith("new-") ? v.slice(0, 40) : randomUUID().slice(0, 12));

function rows(v: unknown, opts: { date?: boolean; desc?: boolean }) {
    return list(v, LIMITS.rows)
        .filter(isObj)
        .map((r) => ({ r, title: line(r.title) }))
        .filter((x) => x.title)
        .map(({ r, title }) => ({
            _key: key(r._key),
            ...(opts.date && line(r.date) ? { date: line(r.date) } : {}),
            title,
            ...(opts.desc && line(r.desc) ? { desc: line(r.desc) } : {}),
        }));
}

/**
 * 클라이언트가 보낸 섹션 JSON을 검증·정리해 저장용 배열로 만든다.
 * - 알려진 6종: 필드를 다시 만들고 빈 항목/빈 섹션은 버린다.
 * - 그 밖의 종류(예전 형식 등): 클라이언트 값은 무시하고 기존 문서의 같은 _key 섹션을 그대로 유지한다.
 */
export function sanitizeSections(payload: unknown, existing: Raw[]): { sections: unknown[] } | { error: string } {
    if (!Array.isArray(payload)) return { error: "섹션 정보를 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    if (payload.length > LIMITS.sections) return { error: `섹션은 최대 ${LIMITS.sections}개까지 만들 수 있어요.` };

    const out: unknown[] = [];
    for (const p of payload) {
        if (!isObj(p)) continue;
        const type = p._type;
        if (!isKnownType(type)) {
            const prev = existing.find((e) => e._key === p._key);
            if (prev) out.push(prev);
            continue;
        }
        const _key = key(p._key);
        switch (type) {
            case "aboutSection": {
                const t = text(p.text);
                if (t) out.push({ _key, _type: type, text: t });
                break;
            }
            case "discographySection": {
                const years = list(p.years, LIMITS.rows)
                    .filter(isObj)
                    .map((y) => ({ _key: key(y._key), year: line(y.year), tracks: rows(y.tracks, { desc: true }) }))
                    .filter((y) => y.year || y.tracks.length > 0);
                if (years.length > 0) out.push({ _key, _type: type, years });
                break;
            }
            case "careerSection": {
                const items = rows(p.items, { date: true, desc: true });
                if (items.length > 0) out.push({ _key, _type: type, items });
                break;
            }
            case "awardsAndActivitiesSection": {
                const awards = rows(p.awards, { date: true });
                const activities = rows(p.activities, { date: true });
                if (awards.length + activities.length > 0) out.push({ _key, _type: type, awards, activities });
                break;
            }
            default: {
                // 학력·자격증은 문자열 배열
                const items = list(p.items, LIMITS.rows).map(line).filter(Boolean);
                if (items.length > 0) out.push({ _key, _type: type, items });
            }
        }
    }
    return { sections: out };
}
