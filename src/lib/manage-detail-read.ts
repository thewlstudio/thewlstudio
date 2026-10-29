import "server-only";
import { isKnownType } from "./crew-sections";
import { isEditableType } from "./work-blocks";

type Raw = Record<string, unknown>;
export type DetailDocumentType = "instructor" | "crew" | "work" | "studioSpace";
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) => value === undefined || value === null;
const key = (value: unknown): value is string => typeof value === "string" && !!value.trim();

/** DTO의 빈 값 변환 전에 검사한다. 원본은 수정하지 않고 고정된 항목 이름만 반환한다. */
export function detailReadIssue(type: DetailDocumentType, id: string, raw: unknown): { fields: string[] } | null {
    if (!object(raw) || raw._id !== id || raw._type !== type || !key(raw._rev)) return { fields: ["문서 식별·버전 정보"] };
    const invalid = new Set<string>();
    const scalar = (value: unknown, label: string, kind: "string" | "boolean" = "string") => {
        if (!missing(value) && typeof value !== kind) invalid.add(label);
    };
    const texts = (row: Raw, fields: readonly string[], label: string) => fields.forEach((field) => scalar(row[field], label));
    const strings = (value: unknown, label: string) => {
        if (!missing(value) && (!Array.isArray(value) || Array.from(value).some((item) => typeof item !== "string"))) invalid.add(label);
    };
    const rows = (value: unknown, label: string, visit: (row: Raw) => void, requireKey = false, allowString = false) => {
        if (missing(value)) return;
        if (!Array.isArray(value)) { invalid.add(label); return; }
        const seen = new Set<string>();
        for (const row of value) {
            if (allowString && typeof row === "string") continue;
            if (!object(row)) { invalid.add(label); continue; }
            if (requireKey ? !key(row._key) : !missing(row._key) && !key(row._key)) invalid.add(label);
            if (key(row._key)) {
                if (seen.has(row._key)) invalid.add(label);
                seen.add(row._key);
            }
            visit(row);
        }
    };
    // GROQ의 [] 투영은 잘못된 원본을 null/빈 목록처럼 보이게 할 수 있다.
    // 원본 별칭도 검사하고, 투영 중 행/식별자가 빠지지 않았는지 확인한다.
    const projected = (field: string, source: string, label: string, visit: (value: unknown) => void) => {
        visit(raw[field]);
        if (!Object.hasOwn(raw, source)) return;
        const original = raw[source]; const displayed = raw[field];
        visit(original);
        if (missing(original) && missing(displayed)) return;
        if (!Array.isArray(original) || !Array.isArray(displayed) || original.length !== displayed.length || original.some((row, i) => !object(row) || !object(displayed[i]) || row._key !== displayed[i]._key || row._type !== displayed[i]._type && field === "contentBlocks")) invalid.add(label);
    };
    scalar(raw._updatedAt, "수정 시간");
    scalar(raw.trashed, "휴지통 상태", "boolean");
    if (type !== "work") scalar(raw.isActive, "공개 상태", "boolean");

    if (type === "instructor") {
        for (const [field, label] of Object.entries({ instructorName: "이름", category: "분류", subtitle: "소개 제목", lessonInfo: "레슨 안내", imagePosition: "사진 위치", portfolioUrl: "작업물 주소", portfolioText: "작업물 설명", portfolioBtn: "작업물 버튼", imageUrl: "프로필 사진", modalImageUrl: "상세 사진", bgImageUrl: "배경 사진" })) scalar(raw[field], label);
        strings(raw.about, "소개"); strings(raw.process, "수업 과정");
    } else if (type === "crew") {
        texts(raw, ["name", "koName", "role", "slug", "imageUrl"], "프로필 기본 정보");
        projected("links", "sourceLinks", "프로필 링크", (value) => rows(value, "프로필 링크", (row) => {
            texts(row, ["url", "iconRef"], "프로필 링크");
            if (!missing(row.iconImage) && (!object(row.iconImage) || !object(row.iconImage.asset) || !key(row.iconImage.asset._ref))) invalid.add("프로필 링크");
        }, true));
        rows(raw.sections, "프로필 본문", (section) => {
            if (!key(section._type)) { invalid.add("프로필 본문"); return; }
            if (!isKnownType(section._type) && !key(section._key)) invalid.add("프로필 본문");
            const lines = (value: unknown) => rows(value, "프로필 본문", (row) => texts(row, ["date", "title", "desc"], "프로필 본문"), false, true);
            switch (section._type) {
                case "aboutSection": scalar(section.text, "프로필 본문"); break;
                case "discographySection": rows(section.years, "프로필 본문", (year) => { scalar(year.year, "프로필 본문"); lines(year.tracks); }); break;
                case "careerSection": lines(section.items); break;
                case "awardsAndActivitiesSection": lines(section.awards); lines(section.activities); break;
                case "educationSection": case "certificationsSection": strings(section.items, "프로필 본문"); break;
                case "awardsSection": case "activitiesSection": lines(section.items); break;
                // 알 수 없는 예전 섹션은 내용에 손대지 않고 원본 키로 보존한다.
            }
        });
    } else if (type === "work") {
        texts(raw, ["title", "artist", "slug", "releaseDate", "youtubeUrl", "instagramId", "instagramUrl", "imageUrl"], "작업물 기본 정보");
        projected("contentBlocks", "sourceBlocks", "작업물 본문", (value) => rows(value, "작업물 본문", (block) => {
            if (!key(block._type)) { invalid.add("작업물 본문"); return; }
            if ((!isEditableType(block._type) || block._type === "imageBlock" || block._type === "audioBlock") && !key(block._key)) invalid.add("작업물 본문");
            switch (block._type) {
                case "descriptionBlock": strings(block.paragraphs, "작업물 본문"); break;
                case "signatureMessageBlock": strings(block.paragraphs, "작업물 본문"); scalar(block.signature, "작업물 본문"); break;
                case "tracklistBlock": rows(block.tracks, "작업물 본문", (track) => texts(track, ["title", "description"], "작업물 본문")); break;
                case "creditGridBlock": rows(block.sections, "작업물 본문", (section) => {
                    scalar(section.title, "작업물 본문");
                    rows(section.items, "작업물 본문", (item) => texts(item, ["role", "value", "linkText", "linkUrl"], "작업물 본문"));
                }); break;
                case "imageBlock": texts(block, ["caption", "imageUrl"], "작업물 본문"); break;
                case "videoEmbedBlock": scalar(block.url, "작업물 본문"); break;
                case "audioBlock": texts(block, ["title", "artist", "audioUrl"], "작업물 본문"); break;
                // 자유 서식 등은 해석하지 않고 기존 문서에서 다시 읽어 보존한다.
            }
        }));
    } else {
        texts(raw, ["kind", "name", "subtitle", "description"], "공간 기본 정보");
        strings(raw.features, "공간 특징"); strings(raw.notes, "공간 안내");
        projected("prices", "sourcePrices", "가격 안내", (value) => rows(value, "가격 안내", (row) => texts(row, ["label", "value", "unit"], "가격 안내")));
        projected("images", "sourceImages", "공간 사진", (value) => rows(value, "공간 사진", (row) => scalar(row.url, "공간 사진"), true));
    }
    // slug.current 투영도 잘못된 원본 값을 빈 문자열로 바꾸지 않게 한다.
    if (Object.hasOwn(raw, "sourceSlug") && !missing(raw.sourceSlug)) {
        if (!object(raw.sourceSlug)) invalid.add("페이지 주소");
        else scalar(raw.sourceSlug.current, "페이지 주소");
    }
    return invalid.size ? { fields: [...invalid] } : null;
}
