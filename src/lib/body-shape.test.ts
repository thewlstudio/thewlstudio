import { describe, expect, it, vi } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";
import { sanitizeSections } from "./crew-sections-server";
import { toPayload, toState, migrateLegacy } from "./crew-sections";

type Raw = Record<string, unknown>;
const absent = Symbol("absent");
const badValues = [absent, null, 1, {}, []];
const work = {
    description: { _key: "d", _type: "descriptionBlock", paragraphs: ["기존 문단"] },
    message: { _key: "m", _type: "signatureMessageBlock", paragraphs: ["인사말"], signature: "서명" },
    tracks: { _key: "t", _type: "tracklistBlock", tracks: [{ _key: "track", title: "제목", description: "설명" }] },
    image: { _key: "image", _type: "imageBlock", caption: "사진 설명" },
    video: { _key: "v", _type: "videoEmbedBlock", url: "https://youtu.be/abcdefghijk" },
    audio: { _key: "audio", _type: "audioBlock", title: "제목", artist: "가수" },
    credit: { _key: "c", _type: "creditGridBlock", sections: [{ _key: "s", title: "제목", items: [{ _key: "i", role: "역할", value: "내용", linkText: "링크", linkUrl: "https://example.com" }] }] },
};
const crew = {
    about: { _key: "a", _type: "aboutSection", text: "소개" },
    disc: { _key: "d", _type: "discographySection", years: [{ _key: "y", year: "2026", tracks: [{ _key: "t", title: "제목", desc: "설명" }] }] },
    career: { _key: "c", _type: "careerSection", items: [{ _key: "r", date: "2026", title: "경력", desc: "설명" }] },
    awards: { _key: "w", _type: "awardsAndActivitiesSection", awards: [{ _key: "a", date: "2026", title: "수상" }], activities: [] },
    education: { _key: "e", _type: "educationSection", items: ["학교"] },
    certificates: { _key: "q", _type: "certificationsSection", items: ["자격증"] },
};
function changed(source: Raw, path: string[], value: unknown) {
    const copy = structuredClone(source); let target = copy;
    for (const part of path.slice(0, -1)) target = target[part] as Raw;
    if (value === absent) delete target[path.at(-1)!]; else target[path.at(-1)!] = value;
    return copy;
}
const workFields = [
    [work.description, ["paragraphs"]], [work.message, ["paragraphs"]], [work.message, ["signature"]],
    [work.tracks, ["tracks"]], [work.tracks, ["tracks", "0", "title"]], [work.tracks, ["tracks", "0", "description"]],
    [work.image, ["caption"]], [work.video, ["url"]], [work.audio, ["title"]], [work.audio, ["artist"]],
    [work.credit, ["sections"]], [work.credit, ["sections", "0", "title"]], [work.credit, ["sections", "0", "items"]],
    ...["role", "value", "linkText", "linkUrl"].map((field) => [work.credit, ["sections", "0", "items", "0", field]] as const),
] as const;
const crewFields = [
    [crew.about, ["text"]], [crew.disc, ["years"]], [crew.disc, ["years", "0", "year"]], [crew.disc, ["years", "0", "tracks"]],
    [crew.disc, ["years", "0", "tracks", "0", "title"]], [crew.disc, ["years", "0", "tracks", "0", "desc"]],
    [crew.career, ["items"]], ...["title", "date", "desc"].map((field) => [crew.career, ["items", "0", field]] as const),
    [crew.awards, ["awards"]], [crew.awards, ["activities"]], [crew.awards, ["awards", "0", "title"]], [crew.awards, ["awards", "0", "date"]],
    [crew.education, ["items"]], [crew.certificates, ["items"]],
] as const;
// 배열 필드의 []는 올바른 명시적 비우기이므로 잘못된 값 목록에서 제외한다.
const cases = (entries: readonly (readonly [Raw, readonly string[]])[]) => entries.flatMap(([source, path]) => {
    let value: unknown = source; for (const part of path) value = (value as Raw)[part];
    return badValues.filter((bad) => !(Array.isArray(value) && Array.isArray(bad))).map((bad) => ({ label: `${source._type} ${path.join(".")} ${String(bad)}`, payload: changed(source, [...path], bad) }));
});
describe("Works 본문 구조", () => {
    it.each(cases(workFields))("$label를 빈 값으로 정리하지 않는다", async ({ payload }) => {
        const upload = vi.fn(async () => ({ asset: { _ref: "new-image" } }));
        const result = await sanitizeBlocks([payload], [{ ...work.audio, audioFile: { asset: { _ref: "file-old" } } }], upload);
        expect(result).toHaveProperty("error"); expect(upload).not.toHaveBeenCalled();
    });
    it.each([null, 1, "bad", []])("잘못된 최상위 행 #%#는 건너뛰지 않는다", async (row) => {
        expect(await sanitizeBlocks([row], [], async () => null)).toHaveProperty("error");
    });
    it.each([null, 1, {}, []])("문단 안의 값 #%#를 빈 문자열로 바꾸지 않는다", async (value) => {
        expect(await sanitizeBlocks([{ ...work.description, paragraphs: [value] }], [], async () => null)).toHaveProperty("error");
    });
});
describe("Crew 본문 구조", () => {
    it.each(cases(crewFields))("$label를 빈 값으로 정리하지 않는다", ({ payload }) => {
        expect(sanitizeSections([payload], [])).toHaveProperty("error");
    });
    it.each([null, 1, "bad", []])("잘못된 최상위 행 #%#는 건너뛰지 않는다", (row) => {
        expect(sanitizeSections([row], [])).toHaveProperty("error");
    });
    it.each([null, 1, {}, []])("학력 문자열 #%#를 빈 값으로 바꾸지 않는다", (value) => {
        expect(sanitizeSections([{ ...crew.education, items: [value] }], [])).toHaveProperty("error");
    });
});

describe("중첩 행·참조 경계", () => {
    it.each([null, 1, "bad", []])("Works 중첩 행 #%#는 버리지 않는다", async (bad) => {
        for (const payload of [
            { ...work.tracks, tracks: [bad] },
            { ...work.credit, sections: [bad] },
            { ...work.credit, sections: [{ ...work.credit.sections[0], items: [bad] }] },
        ]) expect(await sanitizeBlocks([payload], [], async () => null)).toHaveProperty("error");
    });
    it.each([null, 1, "bad", []])("Crew 중첩 행 #%#는 버리지 않는다", (bad) => {
        for (const payload of [
            { ...crew.disc, years: [bad] }, { ...crew.disc, years: [{ ...crew.disc.years[0], tracks: [bad] }] },
            { ...crew.career, items: [bad] }, { ...crew.awards, awards: [bad] }, { ...crew.awards, activities: [bad] },
        ]) expect(sanitizeSections([payload], [])).toHaveProperty("error");
    });
    it.each([undefined, null, "", 1])("사진·오디오·보존 블록의 잘못된 키 #%#를 다른 에셋으로 연결하지 않는다", async (bad) => {
        for (const source of [work.image, work.audio, { _type: "freeformTextBlock", _key: "free" }]) {
            const payload = { ...source, _key: bad };
            if (bad === undefined) delete payload._key;
            expect(await sanitizeBlocks([payload], [source], async () => null)).toHaveProperty("error");
        }
    });
    it("Crew의 알 수 없는 종류는 키뿐 아니라 종류까지 원본과 같아야 한다", () => {
        expect(sanitizeSections([{ _key: "old", _type: "otherLegacy" }], [{ _key: "old", _type: "awardsSection", items: [] }])).toHaveProperty("error");
    });
    it("새 알 수 없는 블록·섹션을 조용히 버리고 성공 처리하지 않는다", async () => {
        const payload = [{ _key: "unknown", _type: "unknownType" }];
        expect(await sanitizeBlocks(payload, [], async () => null)).toHaveProperty("error");
        expect(sanitizeSections(payload, [])).toHaveProperty("error");
    });
    it("보존 블록 누락도 앞쪽 이미지 업로드 전에 거부한다", async () => {
        const upload = vi.fn(async () => ({ asset: { _ref: "new-image" } }));
        expect(await sanitizeBlocks([{ ...work.image, _key: "new-photo" }], [{ _key: "free", _type: "freeformTextBlock", content: [] }], upload)).toHaveProperty("error");
        expect(upload).not.toHaveBeenCalled();
    });
    it("선택하지 않은 새 사진·명시적으로 비운 문단·트랙은 기존처럼 정리한다", async () => {
        expect(await sanitizeBlocks([
            { ...work.image, _key: "new-photo", caption: "" },
            { ...work.description, paragraphs: ["", "   "] },
            { ...work.tracks, tracks: [{ _key: "t", title: "", description: "" }] },
        ], [], async () => null)).toEqual({ blocks: [] });
        expect(sanitizeSections([{ ...crew.about, text: " " }, { ...crew.career, items: [] }], [])).toEqual({ sections: [] });
    });
    it("Crew 예전 수상 섹션을 명시적으로 새 형식으로 옮기는 동작은 유지한다", () => {
        const existing = [{ _key: "legacy", _type: "awardsSection", items: [{ _key: "row", title: "수상", date: "2026" }] }];
        const payload = toPayload(migrateLegacy(toState(existing), "legacy"));
        const result = sanitizeSections(payload, existing);
        expect(result).toMatchObject({ sections: [{ _type: "awardsAndActivitiesSection", awards: [{ title: "수상", date: "2026" }], activities: [] }] });
    });
});
