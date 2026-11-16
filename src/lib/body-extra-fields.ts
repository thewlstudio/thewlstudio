import "server-only";

type Raw = Record<string, unknown>;
type Shape = { fields: readonly string[]; children?: Record<string, { label: string; shape: Shape }> };
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const row = (...fields: string[]): Shape => ({ fields: ["_key", ...fields] });
const root = (...fields: string[]): Shape => row("_type", ...fields);
const creditItem = row("role", "value", "linkText", "linkUrl");
const creditGroup: Shape = { ...row("title", "items"), children: { items: { label: "크레딧 항목", shape: creditItem } } };
const crewTrack = row("title", "desc");
const crewYear: Shape = { ...row("year", "tracks"), children: { tracks: { label: "음반 트랙", shape: crewTrack } } };
const award = row("date", "title");

// 여기에는 재작성하면서 실제 저장하는 필드만 적는다. 오디오/미지원 종류는 원본 전체를 유지한다.
const WORK: Record<string, Shape> = {
    descriptionBlock: root("paragraphs"),
    signatureMessageBlock: root("paragraphs", "signature"),
    tracklistBlock: { ...root("tracks"), children: { tracks: { label: "트랙", shape: row("title", "description") } } },
    creditGridBlock: { ...root("sections"), children: { sections: { label: "크레딧 묶음", shape: creditGroup } } },
    imageBlock: root("image", "caption"), videoEmbedBlock: root("url"),
};
const CREW: Record<string, Shape> = {
    aboutSection: root("text"),
    discographySection: { ...root("years"), children: { years: { label: "연도 묶음", shape: crewYear } } },
    careerSection: { ...root("items"), children: { items: { label: "경력", shape: row("date", "title", "desc") } } },
    awardsAndActivitiesSection: { ...root("awards", "activities"), children: { awards: { label: "수상", shape: award }, activities: { label: "활동", shape: award } } },
    educationSection: root("items"), certificationsSection: root("items"),
};

/** 서버 원본의 추가 정보를 잃는 재작성만 막는다. 값을 병합하거나 클라이언트 확장 필드를 저장하지 않는다. */
export function bodyExtraFieldsError(kind: "work" | "crew", payload: unknown[], existing: Raw[]): string | null {
    const shapes = kind === "work" ? WORK : CREW;
    const fail = (label: string) => `${label}: 이 편집기에서 다루지 않는 원본 정보가 있어 저장하지 않았어요. 입력을 따로 보관한 뒤 /admin에서 확인해 주세요.`;
    const inspect = (submitted: unknown, originals: unknown, shapeOf: (source: Raw) => Shape | undefined, label: string, unbound = false): string | null => {
        for (const [index, source] of list(originals).entries()) {
            if (!object(source)) continue;
            const shape = shapeOf(source);
            if (!shape) continue;
            const keyed = Object.hasOwn(source, "_key") && typeof source._key === "string" && !!source._key;
            const matches = !unbound && keyed ? list(submitted).filter((item): item is Raw => object(item) && item._key === source._key) : [];
            // 유효한 원본 키가 제출 목록에서 빠진 경우는 기존의 명시적 삭제 계약이다.
            if (keyed && !matches.length && !unbound) continue;
            const currentLabel = `${label} ${index + 1}`;
            if (Object.keys(source).some((field) => !shape.fields.includes(field))) return fail(currentLabel);
            const candidate = matches[0];
            // 부모를 연결할 수 없다면 하위 원본을 다른 새 행에 붙이거나 삭제로 추측하지 않는다.
            const childUnbound = unbound || !keyed || matches.length !== 1 || !!candidate && Object.hasOwn(source, "_type") && source._type !== candidate._type;
            for (const [field, child] of Object.entries(shape.children ?? {})) {
                const error = inspect(candidate?.[field], source[field], () => child.shape, `${currentLabel} ${child.label}`, childUnbound);
                if (error) return error;
            }
        }
        return null;
    };
    return inspect(payload, existing, (source) => typeof source._type === "string" && Object.hasOwn(shapes, source._type) ? shapes[source._type] : undefined, kind === "work" ? "저장된 블록" : "저장된 섹션");
}
