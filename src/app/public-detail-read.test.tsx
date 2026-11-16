import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkPage, { generateMetadata as workMetadata } from "./works/[slug]/page";
import CrewPage, { generateMetadata as crewMetadata } from "./crew/[slug]/page";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: read, client: { fetch: vi.fn() } }));
vi.mock("./works/[slug]/WorkDetailClient", () => ({ default: () => null }));
vi.mock("./crew/[slug]/CrewDetailClient", () => ({ default: () => null }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
beforeEach(() => vi.resetAllMocks());
const work = { title: "작품", artist: "아티스트", imageUrl: null, contentBlocks: [] };
const crew = { name: "크루", koName: "이름", role: "역할", imageUrl: null, sections: [] };
const props = () => ({ params: Promise.resolve({ slug: "one" }) });
function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
    return Children.toArray(node).flatMap((child) => isValidElement<Record<string, unknown>>(child) ? [child, ...nodes(child.props.children as ReactNode)] : []);
}
const targets = [
    { kind: "work", page: WorkPage, metadata: workMetadata, base: work, body: "contentBlocks", prop: "initialWork" },
    { kind: "crew", page: CrewPage, metadata: crewMetadata, base: crew, body: "sections", prop: "member" },
];
describe.each(targets)("$kind 본문·공유 정보의 공통 응답 검증", ({ kind, page, metadata, base, body, prop }) => {
    it.each([undefined, false, 0, "", "not-a-document", [], {}])("비정상 문서 #%#를 404나 정상 공유 정보로 숨기지 않는다", async (value) => {
        read.mockResolvedValue(value);
        await expect(page(props())).rejects.toThrow(`Invalid public detail response: ${kind}`);
        await expect(metadata(props())).rejects.toThrow(`Invalid public detail response: ${kind}`);
    });
    it.each([{}, "not-a-list", [null], [1], [{}], [{ _type: 1 }], [{ _type: "" }]])("비정상 본문 #%#가 클라이언트와 메타데이터로 넘어가지 않는다", async (value) => {
        read.mockResolvedValue({ ...base, [body]: value });
        await expect(page(props())).rejects.toThrow("Invalid public detail response");
        await expect(metadata(props())).rejects.toThrow("Invalid public detail response");
    });
    it.each([null, undefined, []])("본문이 없거나 명시적으로 비어 있으면 기존 빈 표시를 유지한다 #%#", async (value) => {
        const document = { ...base, [body]: value }; read.mockResolvedValue(document);
        const node = await page(props());
        expect(nodes(node).find((child) => Object.hasOwn(child.props, prop))?.props[prop]).toBe(document);
        expect(await metadata(props())).toHaveProperty("openGraph");
    });
    it("정상 문서 없음(null)은 본문과 공유 정보 모두 404다", async () => {
        read.mockResolvedValue(null);
        for (const run of [page, metadata]) await expect(run(props())).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    });
    it("조회 실패는 원래 오류로 전달한다", async () => {
        const error = new Error("test-only-network-failure"); read.mockRejectedValue(error);
        await expect(page(props())).rejects.toBe(error);
        await expect(metadata(props())).rejects.toBe(error);
    });
    it("본문의 빈 배열 슬롯을 정상 내용으로 간주하지 않는다", async () => {
        read.mockResolvedValue({ ...base, [body]: new Array(1) });
        await expect(page(props())).rejects.toThrow("Invalid public detail response");
    });
    it("같은 본문 배열의 중복 키와 상속된 타입은 거부한다", async () => {
        for (const value of [[{ _type: "unknown", _key: "same" }, { _type: "unknown", _key: "same" }], [Object.create({ _type: "unknown" })]]) {
            read.mockResolvedValue({ ...base, [body]: value });
            await expect(page(props())).rejects.toThrow("Invalid public detail response");
        }
    });
    it.each(["unknown", "constructor", "__proto__"])("미지원 타입 %s는 추측 변환하지 않고 같은 원본 객체로 전달한다", async (_type) => {
        const unknown = Object.freeze({ _type, _key: "original", payload: Object.freeze({ unrecognized: "원본 그대로" }) });
        const document = Object.freeze({ ...base, [body]: Object.freeze([unknown]) });
        read.mockResolvedValue(document);
        const node = await page(props());
        const output = nodes(node).find((child) => Object.hasOwn(child.props, prop))!.props[prop] as Record<string, unknown>;
        expect(output).toBe(document); expect((output[body] as unknown[])[0]).toBe(unknown);
    });
});

const badWorkBlocks = [
    { _type: "descriptionBlock", paragraphs: "bad" }, { _type: "descriptionBlock", paragraphs: [null] },
    { _type: "signatureMessageBlock", paragraphs: [{}] }, { _type: "signatureMessageBlock", signature: {} },
    { _type: "tracklistBlock", tracks: [null] }, { _type: "tracklistBlock", tracks: [{ description: {} }] },
    { _type: "creditGridBlock", sections: {} }, { _type: "creditGridBlock", sections: [null] },
    { _type: "creditGridBlock", sections: [{ items: [null] }] }, { _type: "creditGridBlock", sections: [{ items: [{ value: {} }] }] },
    { _type: "imageBlock", caption: {} }, { _type: "imageBlock", imageUrl: {} },
    { _type: "videoEmbedBlock", url: {} }, { _type: "audioBlock", audioUrl: {} }, { _type: "audioBlock", title: {} },
];
describe("Works의 알려진 본문 자료형", () => {
    it.each(badWorkBlocks)("잘못된 블록 중첩 값 #%#를 본문·공유 정보 전에 거부한다", async (block) => {
        read.mockResolvedValue({ ...work, contentBlocks: [{ ...block, _key: "one" }] });
        await expect(WorkPage(props())).rejects.toThrow("Invalid public detail response");
        await expect(workMetadata(props())).rejects.toThrow("Invalid public detail response");
    });
    it("8종 블록·자유 서식·오디오의 원본 배열과 추가 정보를 유지한다", async () => {
        const blocks = [
            { _type: "descriptionBlock", _key: "desc", paragraphs: ["문단\n줄바꿈"] },
            { _type: "tracklistBlock", _key: "track", tracks: [{ title: "트랙", description: "설명" }] },
            { _type: "signatureMessageBlock", _key: "signature", paragraphs: ["문구"], signature: "서명" },
            { _type: "creditGridBlock", _key: "credit", sections: [{ title: "크레딧", items: [{ role: "제작", value: "이름", extra: "추가 정보" }] }] },
            { _type: "imageBlock", _key: "image", imageUrl: null, caption: "사진" },
            { _type: "videoEmbedBlock", _key: "video", url: "https://youtu.be/abcdefghijk" },
            { _type: "audioBlock", _key: "audio", audioUrl: null, tracks: [{ legacy: "보존" }] },
            { _type: "freeformTextBlock", _key: "text", content: { _type: "custom", original: "기존 전용 렌더러가 처리" } },
        ];
        const document = { ...work, contentBlocks: blocks }; const before = JSON.stringify(document); read.mockResolvedValue(document);
        const node = await WorkPage(props());
        expect(nodes(node).find((child) => Object.hasOwn(child.props, "initialWork"))?.props.initialWork).toBe(document);
        expect(JSON.stringify(document)).toBe(before);
    });
});

const badCrewSections = [
    { _type: "aboutSection", text: {} }, { _type: "discographySection", years: {} },
    { _type: "discographySection", years: [null] }, { _type: "discographySection", years: [{ tracks: [null] }] },
    { _type: "discographySection", years: [{ tracks: [{ title: {} }] }] },
    { _type: "careerSection", items: "bad" }, { _type: "careerSection", items: [null] }, { _type: "careerSection", items: [{ desc: {} }] },
    { _type: "awardsAndActivitiesSection", awards: [null] }, { _type: "awardsAndActivitiesSection", activities: [{ title: {} }] },
    { _type: "educationSection", items: [{}] }, { _type: "certificationsSection", items: "bad" },
];
describe("Crew의 알려진 본문 자료형과 키 문맥", () => {
    it.each(badCrewSections)("잘못된 섹션 #%#를 본문·공유 정보 전에 거부한다", async (section) => {
        read.mockResolvedValue({ ...crew, sections: [{ ...section, _key: "one" }] });
        await expect(CrewPage(props())).rejects.toThrow("Invalid public detail response");
        await expect(crewMetadata(props())).rejects.toThrow("Invalid public detail response");
    });
    it("6종 섹션과 서로 다른 배열의 같은 키를 그대로 유지한다", async () => {
        const sections = [
            { _type: "aboutSection", _key: "about", text: "소개" },
            { _type: "discographySection", _key: "disco", years: [{ _key: "same", year: "2026", tracks: [{ _key: "same", title: "작품" }] }, { _key: "second", tracks: [{ _key: "same", title: "다른 작품" }] }] },
            { _type: "careerSection", _key: "career", items: [{ _key: "same", title: "경력" }] },
            { _type: "awardsAndActivitiesSection", _key: "awards", awards: [{ _key: "same", title: "수상" }], activities: [{ _key: "same", title: "활동" }] },
            { _type: "educationSection", _key: "edu", items: ["학력"] },
            { _type: "certificationsSection", _key: "cert", items: ["자격"] },
        ];
        const document = { ...crew, sections }; const before = JSON.stringify(document); read.mockResolvedValue(document);
        const node = await CrewPage(props());
        expect(nodes(node).find((child) => Object.hasOwn(child.props, "member"))?.props.member).toBe(document);
        expect(JSON.stringify(document)).toBe(before);
    });
});
