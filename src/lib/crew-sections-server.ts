import "server-only";
import { LIMITS, isKnownType } from "./crew-sections";
import { contentListLimit, contentTextLimit } from "./content-limits";
import { arrayKeyError, managedArrayKey as key } from "./manage-array-keys";
import { crewSectionsShapeError } from "./body-content-shape";

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const line = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

function rows(v: unknown, opts: { date?: boolean; desc?: boolean }) {
    return list(v)
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

function sectionLimitError(payload: unknown[]): string | null {
    const keyError = arrayKeyError(payload, "프로필 섹션");
    if (keyError) return keyError;
    for (const [index, p] of payload.entries()) {
        if (!isObj(p)) continue;
        const label = `섹션 ${index + 1}`;
        const lineError = (v: unknown, field: string) => contentTextLimit(line(v), LIMITS.line, `${label} ${field}`);
        const count = (v: unknown, field: string) => contentListLimit(v, LIMITS.rows, `${label} ${field}`) || arrayKeyError(v, `${label} ${field}`);
        const rowError = (value: unknown, field: string, date = false, desc = false) => {
            let error = count(value, field);
            for (const row of list(value).filter(isObj)) {
                error ||= lineError(row.title, `${field} 제목`) || (date ? lineError(row.date, `${field} 날짜`) : null) || (desc ? lineError(row.desc, `${field} 설명`) : null);
            }
            return error;
        };
        let error: string | null = null;
        switch (p._type) {
            case "aboutSection": error = contentTextLimit(text(p.text), LIMITS.text, `${label} 소개 글`); break;
            case "discographySection":
                error = count(p.years, "연도 묶음");
                for (const year of list(p.years).filter(isObj)) error ||= lineError(year.year, "연도") || rowError(year.tracks, "트랙", false, true);
                break;
            case "careerSection": error = rowError(p.items, "경력", true, true); break;
            case "awardsAndActivitiesSection": error = rowError(p.awards, "수상", true) || rowError(p.activities, "대외활동", true); break;
            case "educationSection":
            case "certificationsSection":
                error = count(p.items, "항목");
                for (const item of list(p.items)) error ||= lineError(item, "항목");
                break;
        }
        if (error) return error;
    }
    return null;
}

/**
 * 클라이언트가 보낸 섹션 JSON을 검증·정리해 저장용 배열로 만든다.
 * - 알려진 6종: 필드를 다시 만들고 빈 항목/빈 섹션은 버린다.
 * - 그 밖의 종류(예전 형식 등): 클라이언트 값은 무시하고 기존 문서의 같은 _key 섹션을 그대로 유지한다.
 * - 편집 내용의 길이·항목 수 한도를 넘으면 잘라 저장하지 않고 오류를 반환한다.
 */
export function sanitizeSections(payload: unknown, existing: Raw[]): { sections: unknown[] } | { error: string } {
    if (!Array.isArray(payload)) return { error: "섹션 정보를 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    if (payload.length > LIMITS.sections) return { error: `섹션은 최대 ${LIMITS.sections}개까지 만들 수 있어요.` };
    const shapeError = crewSectionsShapeError(payload, existing);
    if (shapeError) return { error: shapeError };
    const limitError = sectionLimitError(payload);
    if (limitError) return { error: limitError };

    const out: unknown[] = [];
    for (const p of payload) {
        if (!isObj(p)) continue;
        const type = p._type;
        if (!isKnownType(type)) {
            const prev = existing.find((e) => e._key === p._key && e._type === type);
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
                const years = list(p.years)
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
                const items = list(p.items).map(line).filter(Boolean);
                if (items.length > 0) out.push({ _key, _type: type, items });
            }
        }
    }
    return { sections: out };
}
