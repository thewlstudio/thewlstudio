// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import WorkDetailClient from "@/app/works/[slug]/WorkDetailClient";
import CrewDetailClient from "@/app/crew/[slug]/CrewDetailClient";
import { readPublicDetail } from "@/lib/public-detail-read";
import { publicContentKey } from "@/lib/public-content-key";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/CmsImage", () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }) }));
beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { expect(console.error).not.toHaveBeenCalled(); expect(console.warn).not.toHaveBeenCalled(); vi.restoreAllMocks(); });
const work = { title: "작품 제목", artist: "아티스트", slug: "one", imageUrl: null, releaseDate: "2026. 11. 06." };
const crew = { name: "크루 이름", role: "프로듀서", koName: "한글 이름", imageUrl: null };
function host(html: string) { const element = document.createElement("div"); element.innerHTML = html; return element; }
function renderWork(contentBlocks: unknown) {
    const document = readPublicDetail("work", { ...work, contentBlocks })!;
    return host(renderToStaticMarkup(<WorkDetailClient initialWork={document} />));
}
function renderCrew(sections: unknown) {
    const document = readPublicDetail("crew", { ...crew, sections })!;
    return host(renderToStaticMarkup(<CrewDetailClient member={document} path="/crew/one" />));
}
describe("검증된 원본을 실제 상세 렌더러에 연결", () => {
    it.each(["1", "index:1", "source:one", "new-source"])("원본 키 %s와 인덱스 대체 키는 충돌하지 않고 원본 키의 화면 식별은 순서 변경에도 유지된다", (key) => {
        expect(publicContentKey(key, 0)).not.toBe(publicContentKey(undefined, 1));
        expect(publicContentKey(key, 0)).toBe(publicContentKey(key, 5));
    });
    it.each([null, undefined])("없는 원본 키 #%#는 현재 화면의 인덱스 식별만 사용한다", (key) => {
        expect(publicContentKey(key, 1)).toBe("index:1");
    });
    it("Works의 8종 블록이 문단·크레딧·미디어를 기존 방식으로 출력한다", () => {
        const element = renderWork([
            { _type: "descriptionBlock", _key: "desc", paragraphs: ["본문 문단\n다음 줄"] },
            { _type: "tracklistBlock", _key: "tracks", tracks: [{ title: "트랙 제목", description: "트랙 설명" }] },
            { _type: "signatureMessageBlock", _key: "signature", paragraphs: ["서명 문구"], signature: "서명 이름" },
            { _type: "creditGridBlock", _key: "credits", sections: [{ title: "제작 정보", items: [{ role: "프로듀서", value: "크레딧 이름" }] }] },
            { _type: "imageBlock", _key: "image", imageUrl: "/test.jpg", caption: "사진 설명" },
            { _type: "videoEmbedBlock", _key: "video", url: "https://youtu.be/abcdefghijk" },
            { _type: "audioBlock", _key: "audio", audioUrl: "https://example.com/audio.mp3", title: "오디오 제목", artist: "오디오 가수" },
            { _type: "freeformTextBlock", _key: "text", content: [{ _type: "block", _key: "paragraph", children: [{ _type: "span", _key: "span", text: "자유 서식 문구", marks: [] }], markDefs: [] }] },
        ]);
        for (const text of ["본문 문단", "다음 줄", "트랙 제목", "서명 이름", "크레딧 이름", "사진 설명", "오디오 제목", "자유 서식 문구"]) expect(element.textContent).toContain(text);
        expect(element.querySelectorAll("h1")).toHaveLength(1);
        expect(element.querySelector("iframe")?.getAttribute("src")).toBe("https://www.youtube.com/embed/abcdefghijk");
        expect(element.querySelector("audio")?.getAttribute("src")).toBe("https://example.com/audio.mp3");
    });
    it("본문 키가 없는 예전 Works 블록도 화면 내부 인덱스로 경고 없이 표시한다", () => {
        const blocks = Object.freeze([Object.freeze({ _type: "descriptionBlock", paragraphs: Object.freeze(["첫 문단"]) }), Object.freeze({ _type: "signatureMessageBlock", signature: "마지막 서명" })]);
        const before = JSON.stringify(blocks);
        const element = renderWork(blocks);
        expect(element.textContent).toContain("첫 문단"); expect(element.textContent).toContain("마지막 서명");
        expect(JSON.stringify(blocks)).toBe(before);
        expect(Object.hasOwn(blocks[0], "_key")).toBe(false);
    });
    it("Crew 6종 섹션과 문맥이 다른 같은 키를 기존 순서대로 표시한다", () => {
        const element = renderCrew([
            { _type: "aboutSection", _key: "about", text: "소개 본문" },
            { _type: "discographySection", _key: "disco", years: [{ _key: "same", year: "2026", tracks: [{ _key: "same", title: "음반 제목", desc: "음반 설명" }] }] },
            { _type: "careerSection", _key: "career", items: [{ _key: "same", title: "경력 내용", date: "2025" }] },
            { _type: "awardsAndActivitiesSection", _key: "awards", awards: [{ _key: "same", title: "수상 내용" }], activities: [{ _key: "same", title: "활동 내용" }] },
            { _type: "educationSection", _key: "edu", items: ["학력 내용"] },
            { _type: "certificationsSection", _key: "cert", items: ["자격 내용"] },
        ]);
        for (const text of ["소개 본문", "음반 제목", "경력 내용", "수상 내용", "활동 내용", "학력 내용", "자격 내용"]) expect(element.textContent).toContain(text);
        expect(element.querySelectorAll("h1")).toHaveLength(1);
        expect([...element.querySelectorAll("h2")].map((heading) => heading.textContent?.trim())).toEqual(["ABOUT", "DISCOGRAPHY", "CAREER", "AWARDS & ACTIVITIES", "EDUCATION", "CERTIFICATIONS"]);
    });
    it("미지원 타입은 원본을 유지하되 새 형식으로 추측해 출력하지 않는다", () => {
        const unknown = Object.freeze({ _type: "constructor", _key: "unknown", text: "임의로 출력하면 안 되는 내용" });
        const blocks = Object.freeze([unknown, Object.freeze({ _type: "descriptionBlock", _key: "kept", paragraphs: Object.freeze(["표시할 문단"]) })]);
        const element = renderWork(blocks);
        expect(element.textContent).not.toContain(unknown.text); expect(element.textContent).toContain("표시할 문단");
        expect(renderCrew([unknown]).textContent).not.toContain(unknown.text);
        expect(blocks[0]).toBe(unknown);
    });
    it("이미 막아둔 위험한 미디어·크레딧 주소는 검증 후에도 활성화하지 않는다", () => {
        const element = renderWork([
            { _type: "videoEmbedBlock", _key: "video", url: "javascript:alert(1)" },
            { _type: "audioBlock", _key: "audio", audioUrl: "javascript:alert(1)" },
            { _type: "creditGridBlock", _key: "credit", sections: [{ items: [{ value: "남길 이름", linkText: "남길 문구", linkUrl: "javascript:alert(1)" }] }] },
        ]);
        expect(element.querySelector("iframe,audio,[href^='javascript:']")).toBeNull();
        expect(element.textContent).toContain("남길 이름"); expect(element.textContent).toContain("남길 문구");
    });
    it("알려진 섹션의 누락·null 선택 목록도 기존 빈 표시를 유지한다", () => {
        expect(renderWork([{ _type: "descriptionBlock", paragraphs: null }]).querySelector("h1")?.textContent).toBe(work.title);
        expect(renderCrew([{ _type: "discographySection", years: null }, { _type: "educationSection", items: null }]).querySelector("h1")?.textContent).toContain(crew.name);
    });
});
