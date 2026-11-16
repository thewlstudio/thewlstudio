import { describe, expect, it, vi } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";
import { sanitizeSections } from "./crew-sections-server";
import { toPayload as workPayload, toState as workState } from "./work-blocks";
import { toPayload as crewPayload, toState as crewState } from "./crew-sections";

type Raw = Record<string, unknown>;
const extra = { custom: { value: "PRIVATE_EXTRA_VALUE" } };
const work = (type: string, fields: Raw): Raw[] => [{ _key: "root", _type: type, ...fields }];
const crew = work;
const workCases = [
    { label: "설명", raw: work("descriptionBlock", { paragraphs: ["내용"], ...extra }) },
    { label: "서명", raw: work("signatureMessageBlock", { paragraphs: ["내용"], signature: "이름", ...extra }) },
    { label: "트랙 묶음", raw: work("tracklistBlock", { tracks: [{ _key: "track", title: "곡" }], ...extra }) },
    { label: "트랙 항목", raw: work("tracklistBlock", { tracks: [{ _key: "track", title: "곡", ...extra }] }) },
    { label: "크레딧 블록", raw: work("creditGridBlock", { sections: [{ _key: "group", title: "묶음", items: [] }], ...extra }) },
    { label: "크레딧 묶음", raw: work("creditGridBlock", { sections: [{ _key: "group", title: "묶음", items: [], ...extra }] }) },
    { label: "크레딧 항목", raw: work("creditGridBlock", { sections: [{ _key: "group", title: "묶음", items: [{ _key: "credit", role: "역할", ...extra }] }] }) },
    { label: "사진 블록", raw: work("imageBlock", { image: { _type: "image", asset: { _ref: "image-original" } }, caption: "설명", ...extra }) },
    { label: "영상 블록", raw: work("videoEmbedBlock", { url: "https://youtu.be/R86SFBXqEdM", ...extra }) },
    { label: "중첩 객체 종류", raw: work("tracklistBlock", { tracks: [{ _key: "track", _type: "trackItem", title: "곡" }] }) },
];
const crewCases = [
    { label: "소개", raw: crew("aboutSection", { text: "소개", ...extra }) },
    { label: "음반 섹션", raw: crew("discographySection", { years: [{ _key: "year", year: "2026", tracks: [] }], ...extra }) },
    { label: "음반 연도", raw: crew("discographySection", { years: [{ _key: "year", year: "2026", tracks: [], ...extra }] }) },
    { label: "음반 트랙", raw: crew("discographySection", { years: [{ _key: "year", year: "2026", tracks: [{ _key: "track", title: "곡", ...extra }] }] }) },
    { label: "경력 섹션", raw: crew("careerSection", { items: [{ _key: "row", title: "경력" }], ...extra }) },
    { label: "경력 항목", raw: crew("careerSection", { items: [{ _key: "row", title: "경력", ...extra }] }) },
    { label: "수상·활동 섹션", raw: crew("awardsAndActivitiesSection", { awards: [{ _key: "award", title: "수상" }], activities: [], ...extra }) },
    { label: "수상 항목", raw: crew("awardsAndActivitiesSection", { awards: [{ _key: "award", title: "수상", desc: "PRIVATE_EXTRA_VALUE" }], activities: [] }) },
    { label: "활동 항목", raw: crew("awardsAndActivitiesSection", { awards: [], activities: [{ _key: "activity", title: "활동", ...extra }] }) },
    { label: "학력", raw: crew("educationSection", { items: ["학교"], ...extra }) },
    { label: "자격증", raw: crew("certificationsSection", { items: ["자격증"], ...extra }) },
];

describe("서버 원본 추가 필드 손실 방지", () => {
    it.each(workCases)("Works $label 재작성은 업로드 전에 차단한다", async ({ raw }) => {
        const payload = workPayload(workState(raw)); const before = JSON.stringify({ raw, payload }); const upload = vi.fn(async () => null);
        const result = await sanitizeBlocks(payload, raw, upload);
        expect(result).toHaveProperty("error"); expect(JSON.stringify(result)).toContain("/admin"); expect(JSON.stringify(result)).not.toContain("PRIVATE_EXTRA_VALUE");
        expect(upload).not.toHaveBeenCalled(); expect(JSON.stringify({ raw, payload })).toBe(before);
    });
    it.each(crewCases)("Crew $label 재작성은 원본을 그대로 유지하며 차단한다", ({ raw }) => {
        const payload = crewPayload(crewState(raw)); const before = JSON.stringify({ raw, payload });
        const result = sanitizeSections(payload, raw);
        expect(result).toHaveProperty("error"); expect(JSON.stringify(result)).toContain("/admin"); expect(JSON.stringify(result)).not.toContain("PRIVATE_EXTRA_VALUE");
        expect(JSON.stringify({ raw, payload })).toBe(before);
    });
    it("뒤쪽 추가 필드 오류 때문에 앞쪽 사진도 업로드하지 않는다", async () => {
        const raw = workCases[0].raw;
        const upload = vi.fn(async () => ({ asset: { _ref: "image-new" } }));
        const payload = [{ _key: "new-photo", _type: "imageBlock", caption: "새 사진" }, ...workPayload(workState(raw))];
        expect(await sanitizeBlocks(payload, raw, upload)).toHaveProperty("error"); expect(upload).not.toHaveBeenCalled();
    });
    it("원본 전체를 유지하는 오디오와 미지원 블록은 계속 저장할 수 있다", async () => {
        const raw = [{ _key: "audio", _type: "audioBlock", title: "곡", artist: "가수", audioFile: { asset: { _ref: "file-original" } }, ...extra }, { _key: "free", _type: "freeformTextBlock", ...extra }];
        expect(await sanitizeBlocks(workPayload(workState(raw)), raw, async () => null)).toEqual({ blocks: raw });
        const sections = crew("futureSection", extra);
        expect(sanitizeSections(crewPayload(crewState(sections)), sections)).toEqual({ sections });
    });
    it.each([null, false, "", {}])("비어 보이는 추가 필드 #%#도 임의로 지우지 않는다", async (value) => {
        const raw = work("descriptionBlock", { paragraphs: ["내용"], custom: value });
        expect(await sanitizeBlocks(workPayload(workState(raw)), raw, async () => null)).toHaveProperty("error");
    });
    it("원본과 다르게 종류만 바꿔 추가 정보 보호를 피하지 않는다", async () => {
        expect(await sanitizeBlocks([{ _key: "root", _type: "videoEmbedBlock", url: "https://youtu.be/R86SFBXqEdM" }], workCases[0].raw, async () => null)).toHaveProperty("error");
    });
    it("다른 종류의 미디어 필드도 알려진 필드라고 무시하며 삭제하지 않는다", async () => {
        const raw = work("descriptionBlock", { paragraphs: ["내용"], image: { asset: { _ref: "image-original" } } });
        expect(await sanitizeBlocks(workPayload(workState(raw)), raw, async () => null)).toHaveProperty("error");
    });
    it("키가 없는 부모의 하위 추가 정보를 삭제로 추측하지 않는다", async () => {
        const raw = [{ _type: "tracklistBlock", tracks: [{ _key: "track", title: "곡", ...extra }] }];
        expect(await sanitizeBlocks(workPayload(workState(raw)), raw, async () => null)).toHaveProperty("error");
    });
    it("키가 없는 원본 행의 추가 정보도 새 키로 위장해 지우지 않는다", () => {
        const raw = crew("careerSection", { items: [{ title: "경력", ...extra }] });
        expect(sanitizeSections(crewPayload(crewState(raw)), raw)).toHaveProperty("error");
    });
    it("입력 칸을 비웠어도 추가 정보가 있는 원본을 자동 삭제하지 않는다", async () => {
        const raw = workCases[0].raw;
        expect(await sanitizeBlocks([{ _key: "root", _type: "descriptionBlock", paragraphs: [] }], raw, async () => null)).toHaveProperty("error");
    });
    it("유효한 원본 키로 항목을 명시적으로 지우는 계약은 유지한다", async () => {
        for (const entry of workCases) expect(await sanitizeBlocks([], entry.raw, async () => null)).toEqual({ blocks: [] });
        for (const entry of crewCases) expect(sanitizeSections([], entry.raw)).toEqual({ sections: [] });
    });
    it("중첩 항목도 명시적으로 삭제했다면 다른 정상 항목의 저장을 막지 않는다", async () => {
        const raw = work("tracklistBlock", { tracks: [{ _key: "extra", title: "옛 곡", ...extra }, { _key: "keep", title: "남길 곡" }] });
        const state = workState(raw);
        if (state[0].type !== "tracklistBlock") throw new Error("test state failed");
        state[0].tracks = state[0].tracks.filter((track) => track.key === "keep");
        expect(await sanitizeBlocks(workPayload(state), raw, async () => null)).toEqual({ blocks: work("tracklistBlock", { tracks: [{ _key: "keep", title: "남길 곡" }] }) });
    });
    it("클라이언트가 보낸 추가 필드를 서버 원본으로 받아들이지 않는다", async () => {
        const raw = work("descriptionBlock", { paragraphs: ["내용"] });
        expect(await sanitizeBlocks([{ ...workPayload(workState(raw))[0], ...extra }], raw, async () => null)).toEqual({ blocks: raw });
        expect(await sanitizeBlocks([{ _key: "fresh", _type: "descriptionBlock", paragraphs: ["새 내용"], ...extra }], [], async () => null)).toEqual({ blocks: work("descriptionBlock", { _key: "fresh", paragraphs: ["새 내용"] }) });
    });
    it.each(["__proto__", "constructor", "toString"])("추가 필드 이름 %s도 고정 안내만 반환한다", async (field) => {
        const raw = [{ _key: "root", _type: "descriptionBlock", paragraphs: ["내용"], [field]: "PRIVATE_EXTRA_VALUE" }];
        const result = await sanitizeBlocks(workPayload(workState(raw)), raw, async () => null);
        expect(result).toHaveProperty("error"); expect(JSON.stringify(result)).not.toContain("PRIVATE_EXTRA_VALUE"); expect(JSON.stringify(result)).not.toContain(field);
    });
});
