import { describe, expect, it, vi } from "vitest";
import { contentListLimit, contentTextLimit } from "./content-limits";
import { sanitizeBlocks } from "./work-blocks-server";
import { sanitizeSections } from "./crew-sections-server";
import { workPayloadFixture, crewPayloadFixture } from "@/test/body-payloads";

type Raw = Record<string, unknown>;
const row = (n: number) => ({ _key: `row-${n}`, title: "제목" });
const items = (count: number) => Array.from({ length: count }, (_, i) => row(i));
const blocks = [
    { label: "설명 문단 길이", max: 10000, make: (n: number) => ({ _type: "descriptionBlock", paragraphs: ["가".repeat(n)] }) },
    { label: "설명 문단 수", max: 100, make: (n: number) => ({ _type: "descriptionBlock", paragraphs: Array(n).fill("문단") }) },
    { label: "인사말 문단 길이", max: 10000, make: (n: number) => ({ _type: "signatureMessageBlock", paragraphs: ["가".repeat(n)] }) },
    { label: "인사말 문단 수", max: 100, make: (n: number) => ({ _type: "signatureMessageBlock", paragraphs: Array(n).fill("인사말") }) },
    { label: "서명", max: 300, make: (n: number) => ({ _type: "signatureMessageBlock", signature: "가".repeat(n) }) },
    { label: "트랙 수", max: 100, make: (n: number) => ({ _type: "tracklistBlock", tracks: items(n) }) },
    { label: "트랙 제목", max: 300, make: (n: number) => ({ _type: "tracklistBlock", tracks: [{ ...row(0), title: "가".repeat(n) }] }) },
    { label: "트랙 설명", max: 10000, make: (n: number) => ({ _type: "tracklistBlock", tracks: [{ ...row(0), description: "가".repeat(n) }] }) },
    { label: "사진 설명", max: 300, make: (n: number) => ({ _type: "imageBlock", caption: "가".repeat(n) }) },
    { label: "유튜브 주소", max: 1000, make: (n: number) => ({ _type: "videoEmbedBlock", url: "https://youtu.be/abcdefghijk?note=".padEnd(n, "a") }) },
    { label: "오디오 제목", max: 300, make: (n: number) => ({ _type: "audioBlock", title: "가".repeat(n), artist: "가수" }) },
    { label: "오디오 아티스트", max: 300, make: (n: number) => ({ _type: "audioBlock", title: "제목", artist: "가".repeat(n) }) },
    { label: "크레딧 묶음 수", max: 100, make: (n: number) => ({ _type: "creditGridBlock", sections: Array.from({ length: n }, (_, i) => ({ _key: `s-${i}`, title: "묶음" })) }) },
    { label: "크레딧 묶음 제목", max: 300, make: (n: number) => ({ _type: "creditGridBlock", sections: [{ title: "가".repeat(n) }] }) },
    { label: "크레딧 항목 수", max: 100, make: (n: number) => ({ _type: "creditGridBlock", sections: [{ items: items(n).map((r) => ({ _key: r._key, role: r.title })) }] }) },
    ...(["role", "value", "linkText", "linkUrl"] as const).map((field) => ({
        label: `크레딧 ${field}`, max: field === "value" ? 10000 : field === "linkUrl" ? 1000 : 300,
        make: (n: number) => ({ _type: "creditGridBlock", sections: [{ items: [{ role: "역할", [field]: field === "linkUrl" ? "https://example.com/".padEnd(n, "a") : "가".repeat(n) }] }] }),
    })),
];
const sections = [
    { label: "소개 글", max: 5000, make: (n: number) => ({ _type: "aboutSection", text: "가".repeat(n) }) },
    { label: "음반 연도 수", max: 100, make: (n: number) => ({ _type: "discographySection", years: Array.from({ length: n }, (_, i) => ({ _key: `y-${i}`, year: "2026" })) }) },
    { label: "음반 연도", max: 300, make: (n: number) => ({ _type: "discographySection", years: [{ year: "가".repeat(n) }] }) },
    { label: "음반 트랙 수", max: 100, make: (n: number) => ({ _type: "discographySection", years: [{ tracks: items(n) }] }) },
    ...(["title", "desc"] as const).map((field) => ({ label: `음반 ${field}`, max: 300, make: (n: number) => ({ _type: "discographySection", years: [{ tracks: [{ ...row(0), [field]: "가".repeat(n) }] }] }) })),
    { label: "경력 수", max: 100, make: (n: number) => ({ _type: "careerSection", items: items(n) }) },
    ...(["title", "date", "desc"] as const).map((field) => ({ label: `경력 ${field}`, max: 300, make: (n: number) => ({ _type: "careerSection", items: [{ ...row(0), [field]: "가".repeat(n) }] }) })),
    ...(["awards", "activities"] as const).flatMap((field) => [
        { label: `${field} 수`, max: 100, make: (n: number) => ({ _type: "awardsAndActivitiesSection", [field]: items(n) }) },
        ...(["title", "date"] as const).map((key) => ({ label: `${field} ${key}`, max: 300, make: (n: number) => ({ _type: "awardsAndActivitiesSection", [field]: [{ ...row(0), [key]: "가".repeat(n) }] }) })),
    ]),
    ...(["educationSection", "certificationsSection"] as const).flatMap((type) => [
        { label: `${type} 수`, max: 100, make: (n: number) => ({ _type: type, items: Array(n).fill("항목") }) },
        { label: `${type} 글자 수`, max: 300, make: (n: number) => ({ _type: type, items: ["가".repeat(n)] }) },
    ]),
];

describe("Works 기존 한도 초과는 잘라 저장하지 않는다", () => {
    it.each(blocks)("$label — 한도 초과 오류, 경계값 보존", async ({ max, make }) => {
        const upload = vi.fn(async () => null);
        const payload = workPayloadFixture([{ _key: "existing", ...make(max + 1) }]);
        const before = JSON.stringify(payload);
        const boundAudio = payload.filter((block) => block._type === "audioBlock").map((block) => ({ ...block, audioFile: { asset: { _ref: "file-existing" } } }));
        const invalid = await sanitizeBlocks(payload, boundAudio, upload);
        expect(invalid).toHaveProperty("error");
        expect("error" in invalid && invalid.error).toContain("내용은 저장하지 않았어요");
        expect(upload).not.toHaveBeenCalled();
        expect(JSON.stringify(payload)).toBe(before);
        const valid = { _key: "existing", ...make(max) };
        const previous = [{ ...valid, image: { asset: { _ref: "image-existing" } }, audioFile: { asset: { _ref: "file-existing" } } }];
        const result = await sanitizeBlocks(workPayloadFixture([valid]), previous, upload);
        expect(result).toHaveProperty("blocks");
        const saved = "blocks" in result ? result.blocks as Raw[] : [];
        expect(saved).toHaveLength(1);
        // 서버가 추가하는 키나 메타데이터 외에는 제출한 모든 값이 남는다.
        expect(saved[0]).toMatchObject(valid);
    });
    it("뒤쪽 블록의 길이 오류도 앞쪽 사진을 업로드하기 전에 반환한다", async () => {
        const upload = vi.fn(async () => ({ asset: { _ref: "new-image" } }));
        expect(await sanitizeBlocks(workPayloadFixture([{ _key: "new-photo", _type: "imageBlock" }, { _key: "d", _type: "descriptionBlock", paragraphs: ["가".repeat(10001)] }]), [], upload)).toHaveProperty("error");
        expect(upload).not.toHaveBeenCalled();
    });
    it("서식 블록 원본에는 편집 가능한 블록의 길이 제한을 새로 적용하지 않는다", async () => {
        const original = { _key: "preserved", _type: "freeformTextBlock", content: "가".repeat(10001) };
        expect(await sanitizeBlocks([{ _key: original._key, _type: original._type }], [original], async () => null)).toEqual({ blocks: [original] });
    });
    it("문단 CRLF 정규화 뒤 경계를 검사하고 정상 내용을 그대로 보존한다", async () => {
        const paragraph = "가\r\n".repeat(5000);
        expect(await sanitizeBlocks([{ _key: "d", _type: "descriptionBlock", paragraphs: [paragraph] }], [], async () => null)).toEqual({ blocks: [{ _key: "d", _type: "descriptionBlock", paragraphs: ["가\n".repeat(5000)] }] });
    });
});

describe("Crew 기존 한도 초과는 잘라 저장하지 않는다", () => {
    it.each(sections)("$label — 한도 초과 오류, 경계값 보존", ({ max, make }) => {
        const payload = crewPayloadFixture([{ _key: "existing", ...make(max + 1) }]);
        const before = JSON.stringify(payload);
        const invalid = sanitizeSections(payload, []);
        expect(invalid).toHaveProperty("error");
        expect("error" in invalid && invalid.error).toContain("내용은 저장하지 않았어요");
        expect(JSON.stringify(payload)).toBe(before);
        const valid = { _key: "existing", ...make(max) };
        const result = sanitizeSections(crewPayloadFixture([valid]), []);
        expect(result).toHaveProperty("sections");
        const saved = "sections" in result ? result.sections as Raw[] : [];
        expect(saved).toHaveLength(1);
        expect(saved[0]).toMatchObject(valid);
    });
    it("예전 형식은 원본을 보존하고 새 한도를 적용하지 않는다", () => {
        const original = { _key: "legacy", _type: "awardsSection", items: items(101) };
        expect(sanitizeSections([{ _key: original._key, _type: original._type }], [original])).toEqual({ sections: [original] });
    });
    it("소개 글은 기존 앞뒤 공백·CRLF 정규화를 유지한다", () => {
        const value = `  ${"가\r\n".repeat(2499)}가가  `;
        expect(sanitizeSections([{ _key: "about", _type: "aboutSection", text: value }], [])).toEqual({ sections: [{ _key: "about", _type: "aboutSection", text: value.replace(/\r\n/g, "\n").trim() }] });
    });
    it("한 줄 항목은 기존과 같이 내부 CRLF를 그대로 세며 넘으면 거부한다", () => {
        expect(sanitizeSections(crewPayloadFixture([{ _key: "career", _type: "careerSection", items: [{ title: `a${"\r\n".repeat(150)}b` }] }]), [])).toHaveProperty("error");
    });
});

describe("공통 한도 도우미", () => {
    it("문자열·배열이 아닌 입력을 임의로 바꾸지 않는다", () => {
        for (const value of [null, undefined, 1, {}, true]) {
            expect(contentTextLimit(value, 1, "글")).toBeNull();
            expect(contentListLimit(value, 1, "목록")).toBeNull();
        }
    });
});
