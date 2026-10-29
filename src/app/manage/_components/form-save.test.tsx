// @vitest-environment jsdom
import { previewTarget } from "@/lib/preview-path";
import { act, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkForm, { type WorkFormData } from "../works/[id]/WorkForm";
import CrewForm from "../crew/[id]/CrewForm";
import InstructorForm from "../instructors/[id]/InstructorForm";
import SpaceForm, { type SpaceFormData } from "../studio/[id]/SpaceForm";
import ContactForm from "../contact/ContactForm";
import StudioInfoForm from "../studio/info/StudioInfoForm";
import WorkBlocksEditor from "../works/[id]/WorkBlocksEditor";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { FALLBACK_INFO } from "@/lib/studio-info";
import { sanitizeBlocks } from "@/lib/work-blocks-server";
import { sanitizeSections } from "@/lib/crew-sections-server";
import { arrayKeyError } from "@/lib/manage-array-keys";
import { studioInfoLimitError, studioSpaceLimitError } from "@/lib/studio-content-limits";
import { studioInfoShapeError, studioSpaceShapeError } from "@/lib/studio-content-shape";
import * as imageUpload from "./imageUpload";

const { save, refresh, router } = vi.hoisted(() => {
    const refresh = vi.fn();
    return { save: vi.fn(), refresh, router: { refresh } };
});
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router }));
vi.mock("next/link", () => ({ default: ({ children, onNavigate, ...props }: { children: ReactNode; onNavigate?: unknown }) => {
    void onNavigate;
    return <a {...props}>{children}</a>;
} }));
vi.mock("../works/actions", () => ({ saveWork: save, createWork: save }));
vi.mock("../crew/actions", () => ({ saveCrew: save, createCrew: save }));
vi.mock("../instructors/actions", () => ({ saveInstructor: save, createInstructor: save }));
vi.mock("../studio/actions", () => ({ saveSpace: save, createSpace: save }));
vi.mock("../contact/actions", () => ({ saveSettings: save }));
vi.mock("../studio/info/actions", () => ({ saveStudioInfo: save }));
vi.mock("./ImageCropper", () => ({ default: ({ inputId }: { inputId: string }) => <button type="button" data-crop-input={inputId}>사진 자르기</button> }));

const work: WorkFormData = {
    _id: "work-1", _rev: "v1", isActive: true, title: "기존 작품", artist: "아티스트", slug: "album", releaseDate: "2026-10-26",
    imageUrl: null, youtubeUrl: "", instagramId: "", instagramUrl: "", blocks: [],
};
const space: SpaceFormData = {
    _id: "room-1", _rev: "v1", kind: "room", isActive: true, name: "ROOM A", subtitle: "", description: "",
    prices: [], features: [], notes: [], images: [],
};

class SaveBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <p data-error-boundary>화면 오류</p> : this.props.children; }
}

let root: Root;
let host: HTMLDivElement;
const field = (id: string) => host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
const form = () => host.querySelector<HTMLFormElement>("form[data-manage-form]")!;
async function render(node: ReactNode) { await act(async () => { root.render(node); }); }
async function input(id: string, value: string) {
    await act(async () => {
        const el = field(id);
        // React가 설치한 value 추적기를 거치지 않는 실제 사용자 입력을 모사한다.
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
async function click(text: string) {
    const button = Array.from(host.querySelectorAll("button")).find((el) => el.textContent === text);
    expect(button, text).toBeTruthy();
    await act(async () => { button!.click(); });
}
async function submit() { await act(async () => { form().requestSubmit(); }); }

function publicPreview(area: "works" | "crew", slug: string, mode: "create" | "edit" = "edit") {
    return area === "works" ? <WorkForm data={{ ...work, slug }} mode={mode} /> : <CrewForm data={{ _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "프로듀서", slug, imageUrl: null, links: [], sections: [] }} mode={mode} />;
}
describe.each(["works", "crew"] as const)("%s 저장된 공개 화면 링크", (area) => {
    it.each(["With_you_n@di", "한글-제목", "100%-live", "literal%2Fname", "a?b#c", "plus+space value"])("원문 slug %s를 경로 한 조각으로 인코딩한다", async (slug) => {
        await render(publicPreview(area, slug));
        const link = Array.from(host.querySelectorAll("a")).find((node) => node.textContent?.includes("홈페이지에서 미리보기"))!;
        const publicPath = `/${area}/${encodeURIComponent(slug)}`;
        expect(link.getAttribute("href")).toBe(`/manage/preview?to=${encodeURIComponent(publicPath)}`);
        // 진입 경로가 이 주소를 그대로 해석해 같은 홈페이지 화면으로 보낸다
        expect(previewTarget(new URL(link.getAttribute("href")!, "https://x.example").searchParams.get("to"))).toBe(publicPath);
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
        expect(link.textContent).toContain("저장한 내용 기준");
    });
    it.each(["", "bad/path", "..", "bad\\path", "bad\nslug", "\ud800"])("잘못된 slug #%#는 활성 링크 대신 주소 확인 안내를 표시한다", async (slug) => {
        await render(publicPreview(area, slug));
        expect(Array.from(host.querySelectorAll("a")).some((node) => node.textContent?.includes("홈페이지에서 미리보기"))).toBe(false);
        expect(host.textContent).toContain("공개 주소를 확인하지 못했어요.");
    });
    it("아직 만들지 않은 문서에는 저장된 공개 화면 링크를 표시하지 않는다", async () => {
        await render(publicPreview(area, "new-page", "create"));
        expect(Array.from(host.querySelectorAll("a")).some((node) => node.textContent?.includes("홈페이지에서 미리보기"))).toBe(false);
    });
});

describe("관리자 오디오 미리 듣기의 URL", () => {
    it.each(["javascript:alert(1)", "data:audio/mpeg;base64,AAA", "file:///audio.mp3", "//other.example/audio.mp3", "https://user:pass@example.com/audio.mp3"])("%s는 재생 src에 넣지 않고 원본 편집 정보는 유지한다", async (audioUrl) => {
        const initial = [{ key: "audio", type: "audioBlock" as const, title: "기존 제목", artist: "기존 아티스트", audioUrl }];
        const before = JSON.stringify(initial);
        await render(<WorkBlocksEditor initial={initial} onDirty={() => {}} />);
        expect(host.querySelector("audio")).toBeNull();
        expect(host.textContent).toContain("오디오 파일이 연결돼 있지 않아요.");
        expect(host.querySelector<HTMLInputElement>('[aria-label="오디오 제목"]')?.value).toBe("기존 제목");
        expect(JSON.stringify(initial)).toBe(before);
    });
    it("기존 HTTPS 오디오는 자동 재생이나 선다운로드 없이 유지한다", async () => {
        const audioUrl = "https://cdn.sanity.io/files/project/production/song.mp3";
        await render(<WorkBlocksEditor initial={[{ key: "audio", type: "audioBlock", title: "제목", artist: "아티스트", audioUrl }]} onDirty={() => {}} />);
        const audio = host.querySelector("audio")!;
        expect(audio.getAttribute("src")).toBe(audioUrl);
        expect(audio.getAttribute("preload")).toBe("none");
        expect(audio.hasAttribute("autoplay")).toBe(false);
    });
});

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    save.mockResolvedValue({ ok: false, error: "인증이 필요해요. 다시 로그인해 주세요." });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:test-image");
    URL.revokeObjectURL = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe("조회 시 미리보기가 없는 원본 행", () => {
    it("Studio URL이 없는 사진도 저장 JSON에 남기고 보존 안내를 표시한다", async () => {
        await render(<SpaceForm data={{ ...space, images: [{ key: "unresolved", url: null }] }} />);
        const payload = JSON.parse(host.querySelector<HTMLInputElement>('input[name="listsJson"]')!.value);
        expect(payload.images).toEqual([{ _key: "unresolved" }]);
        expect(host.textContent).toContain("기존 사진 정보는 유지돼요");
    });
    it.each(["new-source", "legacy-source"])("Crew 원본 키 %s를 접두사로 새 항목처럼 판단하지 않는다", async (sourceKey) => {
        const data = { _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "역할", slug: "crew", imageUrl: null, sections: [], links: [{ key: "legacy-0", sourceKey, url: "https://example.com", iconRef: "" }] };
        await render(<CrewForm data={data} />);
        expect(host.querySelector<HTMLInputElement>('input[name="linkKey_0"]')?.value).toBe(sourceKey);
    });
});

describe("Studio 안내 원본 키의 폼 직렬화", () => {
    it.each(["services", "equipment", "memberships"] as const)("%s의 원본 키를 화면 내부 키로 바꾸지 않는다", async (group) => {
        const data = { ...FALLBACK_INFO, [group]: FALLBACK_INFO[group].map((row, i) => ({ ...row, _key: `source-${i}` })) };
        await render(<StudioInfoForm data={data} revision="v1" />);
        const payload = JSON.parse(host.querySelector<HTMLInputElement>('input[name="dataJson"]')!.value);
        expect(payload[group].map((row: { _key?: string }) => row._key)).toEqual(data[group].map((_row, i) => `source-${i}`));
    });
});

describe("Studio 실제 폼의 JSON 스냅샷", () => {
    it.each(["space", "info"] as const)("%s — 실제 폼이 내보내는 완전한 JSON은 구조 검사를 통과한다", async (area) => {
        const info = area === "info";
        const check = info ? studioInfoShapeError : studioSpaceShapeError;
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            expect(check(JSON.parse(String(data.get(info ? "dataJson" : "listsJson"))))).toBeNull();
            return { ok: true };
        });
        await render(info ? <StudioInfoForm data={FALLBACK_INFO} revision="v1" /> : <SpaceForm data={{ ...space, prices: [{ key: "price", label: "기본", value: "1000", unit: "원" }], features: ["특징"], notes: ["안내"], images: [{ key: "image", url: "/existing.jpg" }] }} />);
        await input(info ? "membershipNote" : "name", "수정한 내용");
        await submit(); expect(save).toHaveBeenCalledTimes(1);
    });
    it.each(["space", "info"] as const)("%s — 구조 오류 응답 후 원문과 dirty를 유지하고 해당 영역으로 이동한다", async (area) => {
        const info = area === "info";
        const jsonKey = info ? "dataJson" : "listsJson";
        const id = info ? "services" : "images";
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            const payload = JSON.parse(String(data.get(jsonKey))); delete payload[id];
            const error = info ? studioInfoShapeError(payload) : studioSpaceShapeError(payload);
            return { ok: false, ...error };
        });
        await render(info ? <StudioInfoForm data={FALLBACK_INFO} revision="v1" /> : <SpaceForm data={space} />);
        await input(info ? "membershipNote" : "name", "수정한 내용");
        const before = host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value;
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain("입력 형식을 읽지 못해 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value).toBe(before);
        expect(field(info ? "membershipNote" : "name").value).toBe("수정한 내용");
        const link = host.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
        await act(async () => link.click()); expect(document.activeElement).toBe(host.querySelector(`#${id}`));
        expect(refresh).not.toHaveBeenCalled();
    });
});

describe("Studio 한도 오류 후 입력 영역으로 이동", () => {
    const cases = [
        { id: "features", info: false, spaceData: { ...space, features: ["가".repeat(301)] } },
        { id: "prices", info: false, spaceData: { ...space, prices: [{ key: "p", label: "기본", value: "가".repeat(51), unit: "원" }] } },
        { id: "images", info: false, spaceData: { ...space, images: Array.from({ length: 21 }, (_, i) => ({ key: `image-${i}`, url: "/existing.jpg" })) } },
        { id: "amenities", info: true, infoData: { ...FALLBACK_INFO, amenities: Array(51).fill("편의시설") } },
        { id: "services", info: true, infoData: { ...FALLBACK_INFO, services: [{ title: "서비스", price: "1000", priceUnit: "원", points: ["가".repeat(301)] }] } },
    ];
    it.each(cases)("$id — 원문·dirty 유지, 오류 요약에서 실제 묶음으로 포커스 이동", async ({ id, info, spaceData, infoData }) => {
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            const error = info ? studioInfoLimitError(JSON.parse(String(data.get("dataJson")))) : studioSpaceLimitError(Object.fromEntries(data), JSON.parse(String(data.get("listsJson"))));
            return error ? { ok: false, ...error } : { ok: true };
        });
        await render(info ? <StudioInfoForm data={infoData!} revision="v1" /> : <SpaceForm data={spaceData!} />);
        await input(info ? "membershipNote" : "name", "수정한 내용");
        const jsonKey = info ? "dataJson" : "listsJson";
        const before = host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value;
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain("내용은 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value).toBe(before);
        expect(field(info ? "membershipNote" : "name").value).toBe("수정한 내용");
        const link = host.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
        expect(link).toBeTruthy();
        await act(async () => link.click());
        expect(document.activeElement).toBe(host.querySelector(`#${id}`));
        expect(refresh).not.toHaveBeenCalled();
    });
});

describe("배열 키 오류 후 폼 입력 보존", () => {
    it.each(["studio-price", "crew-link"] as const)("%s — 오류 요약이 실제 입력을 가리키고 자동 초기화하지 않는다", async (area) => {
        const isPrice = area === "studio-price";
        const id = isPrice ? "price-label-original" : "linkUrl_0";
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            const rows = isPrice ? JSON.parse(String(data.get("listsJson"))).prices : [{ _key: data.get("linkKey_0") }];
            const error = arrayKeyError([rows[0], rows[0]], isPrice ? "가격" : "소셜 링크");
            return { ok: false, error, fields: [{ id, label: isPrice ? "가격" : "소셜 링크" }] };
        });
        await render(isPrice ? <SpaceForm data={{ ...space, prices: [{ key: "original", label: "기본", value: "1000", unit: "원" }] }} /> : <CrewForm data={{ _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "역할", slug: "crew", imageUrl: null, links: [{ key: "original", url: "https://example.com", iconRef: "" }], sections: [] }} />);
        await input("name", "수정한 이름");
        const before = field(id).value;
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain("중복되어 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(field("name").value).toBe("수정한 이름");
        expect(field(id).value).toBe(before);
        const link = host.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
        expect(link).toBeTruthy();
        await act(async () => link.click());
        expect(document.activeElement).toBe(field(id));
        expect(refresh).not.toHaveBeenCalled();
    });
});

describe("Works·Crew 본문 구조 오류 후 입력 보존", () => {
    it.each(["works", "crew"] as const)("%s — 서버 구조 오류 뒤 원문과 수정 동선을 유지한다", async (area) => {
        const isWork = area === "works";
        const jsonKey = isWork ? "blocksJson" : "sectionsJson";
        const id = isWork ? "blocks" : "sections";
        const raw = isWork ? [{ _key: "body", _type: "descriptionBlock", paragraphs: ["입력한 본문"] }] : [{ _key: "body", _type: "aboutSection", text: "입력한 소개" }];
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            const payload = JSON.parse(String(data.get(jsonKey)));
            if (isWork) payload[0].paragraphs = null; else delete payload[0].text;
            const result = isWork ? await sanitizeBlocks(payload, raw, async () => null) : sanitizeSections(payload, raw);
            return "error" in result ? { ok: false, error: result.error, fields: [{ id, label: "본문 내용" }] } : { ok: true };
        });
        await render(isWork ? <WorkForm data={{ ...work, blocks: raw }} /> : <CrewForm data={{ _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "역할", slug: "crew", imageUrl: null, links: [], sections: raw }} />);
        await input(isWork ? "title" : "name", "수정한 이름");
        const before = host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value;
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain("입력 형식을 읽지 못해 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value).toBe(before);
        expect(field(isWork ? "title" : "name").value).toBe("수정한 이름");
        const link = host.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
        await act(async () => link.click()); expect(document.activeElement).toBe(host.querySelector(`#${id}`));
        expect(refresh).not.toHaveBeenCalled();
    });
});

describe("본문 한도 오류 후 편집 상태 보존", () => {
    it.each(["works", "crew"] as const)("%s — 초과 내용을 지우지 않고 오류 요약과 수정 동선을 유지한다", async (area) => {
        const isWork = area === "works";
        const id = isWork ? "blocks" : "sections";
        const jsonKey = isWork ? "blocksJson" : "sectionsJson";
        const longText = "가".repeat(isWork ? 10001 : 5001);
        const raw = isWork ? [{ _key: "d", _type: "descriptionBlock", paragraphs: [longText] }] : [{ _key: "a", _type: "aboutSection", text: longText }];
        save.mockImplementation(async (_prev: unknown, data: FormData) => {
            const payload = JSON.parse(String(data.get(jsonKey)));
            const result = isWork ? await sanitizeBlocks(payload, raw, async () => null) : sanitizeSections(payload, raw);
            return "error" in result ? { ok: false, error: result.error, fields: [{ id, label: "본문 내용" }] } : { ok: true };
        });
        await render(isWork ? <WorkForm data={{ ...work, blocks: raw }} /> : <CrewForm data={{ _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "역할", slug: "crew", imageUrl: null, links: [], sections: raw }} />);
        await input(isWork ? "title" : "name", "수정한 기본 정보");
        const json = host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!;
        const before = json.value;
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(host.textContent).toContain("내용은 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.querySelector<HTMLInputElement>(`input[name="${jsonKey}"]`)!.value).toBe(before);
        expect(field(isWork ? "title" : "name").value).toBe("수정한 기본 정보");
        const summaryLink = host.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
        expect(summaryLink).toBeTruthy();
        await act(async () => summaryLink.click());
        expect(document.activeElement).toBe(host.querySelector(`#${id}`));
        expect(refresh).not.toHaveBeenCalled();
    });
});

describe("6개 관리 폼의 실패 복구", () => {
    const cases = [
        { name: "강사", id: "instructorName", node: <InstructorForm data={{ _id: "i1", _rev: "v1", isActive: true, instructorName: "강사", category: "VOCAL", subtitle: "클래스 소개", lessonInfo: "레슨 안내", about: ["레슨 소개"], process: ["커리큘럼"], imagePosition: "object-top", portfolioUrl: "", portfolioText: "", portfolioBtn: "", imageUrl: null, modalImageUrl: null, bgImageUrl: null }} /> },
        { name: "Crew", id: "name", node: <CrewForm data={{ _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "프로듀서", slug: "crew", imageUrl: null, links: [], sections: [] }} /> },
        { name: "Works", id: "title", node: <WorkForm data={work} /> },
        { name: "공간", id: "name", node: <SpaceForm data={space} /> },
        { name: "연락처", id: "phone", node: <ContactForm data={FALLBACK_SETTINGS} revision="v1" /> },
        { name: "스튜디오 안내", id: "membershipNote", node: <StudioInfoForm data={FALLBACK_INFO} revision="v1" /> },
    ];
    it("강사 사진별 자르기 버튼은 해당 사진 입력 옆에 하나씩만 있다", async () => {
        await render(cases[0].node);
        for (const id of ["imageFile", "modalImageFile", "bgImageFile"]) {
            expect(host.querySelectorAll(`[data-crop-input="${id}"]`)).toHaveLength(1);
            expect(field(id).parentElement?.querySelector("[data-crop-input]")?.getAttribute("data-crop-input")).toBe(id);
        }
    });
    const photoCases = [
        { name: "강사 목록 사진", id: "imageFile", node: cases[0].node },
        { name: "강사 팝업 사진", id: "modalImageFile", node: cases[0].node },
        { name: "강사 배경 사진", id: "bgImageFile", node: cases[0].node },
        { name: "Crew 사진", id: "imageFile", node: cases[1].node },
        { name: "Works 커버", id: "imageFile", node: cases[2].node },
        { name: "Works 이미지 블록", id: "img-existing", node: <WorkForm data={{ ...work, blocks: [{ _type: "imageBlock", _key: "existing", imageUrl: "/existing.jpg" }] }} /> },
        { name: "Studio 갤러리", id: "spaceImage-existing", node: <SpaceForm data={{ ...space, images: [{ key: "existing", url: "/existing.jpg" }] }} /> },
    ];
    it.each(photoCases)("$name — 실제 폼에서도 사진 준비 중 저장을 차단한다", async ({ id, node }) => {
        let finish!: (value: { file: File }) => void;
        vi.spyOn(imageUpload, "prepareImageFile").mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        await render(node);
        const selected = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
        const el = field(id) as HTMLInputElement;
        expect(el).toBeTruthy();
        Object.defineProperty(el, "files", { configurable: true, value: [selected] });
        await act(async () => el.dispatchEvent(new Event("change", { bubbles: true })));
        expect(host.textContent).toContain("사진을 준비하는 중");
        await submit();
        expect(save).not.toHaveBeenCalled();
        await act(async () => finish({ file: selected }));
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
    });
    it.each(cases)("$name — 인증 실패 뒤 입력과 dirty가 남고 자동 reset은 발생하지 않는다", async ({ id, node }) => {
        await render(node);
        const reset = vi.fn();
        form().addEventListener("reset", reset);
        await input(id, "수정한 내용");
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(field(id).value).toBe("수정한 내용");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.textContent).toContain("로그인이 만료돼서");
        expect(reset).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
    });
    it.each(cases)("$name — 통신 예외에도 폼을 유지하고 결과 확인을 안내한다", async ({ id, node }) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        save.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        await render(<SaveBoundary>{node}</SaveBoundary>);
        const reset = vi.fn();
        form().addEventListener("reset", reset);
        const files = Array.from(form().querySelectorAll('input[type="file"]'));
        await input(id, "서버 응답을 못 받은 내용");
        await submit();
        expect(host.querySelector("[data-error-boundary]")).toBeNull();
        expect(field(id)?.value).toBe("서버 응답을 못 받은 내용");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(host.textContent).toContain("처리 결과를 확인하지 못했어요");
        expect(refresh).not.toHaveBeenCalled();
        expect(reset).not.toHaveBeenCalled();
        const remainingFiles = Array.from(form().querySelectorAll('input[type="file"]'));
        expect(remainingFiles).toHaveLength(files.length);
        remainingFiles.forEach((element, index) => expect(element).toBe(files[index]));
        expect(save).toHaveBeenCalledTimes(1);
        await submit();
        expect(save).toHaveBeenCalledTimes(2);
    });

    it("서버 필드 오류 뒤 값을 고쳐 같은 폼에서 다시 제출할 수 있다", async () => {
        save.mockResolvedValue({ ok: false, error: "주소가 올바르지 않아요.", fields: [{ id: "youtubeUrl", label: "유튜브 주소" }] });
        await render(<WorkForm data={work} />);
        await input("title", "새 작품");
        await input("youtubeUrl", "잘못된 주소");
        await submit();
        expect(field("title").value).toBe("새 작품");
        expect(field("youtubeUrl").value).toBe("잘못된 주소");
        await input("youtubeUrl", "https://youtu.be/abcdefghijk");
        await submit();
        expect(save).toHaveBeenCalledTimes(2);
        expect((save.mock.calls[1][1] as FormData).get("title")).toBe("새 작품");
        expect((save.mock.calls[1][1] as FormData).get("youtubeUrl")).toBe("https://youtu.be/abcdefghijk");
    });

    it.each(["서버 오류 응답", "통신 예외"])("생성 실패(%s) 뒤에도 입력·선택 파일을 유지하며 자동 reset을 호출하지 않는다", async (failure) => {
        if (failure === "통신 예외") save.mockRejectedValueOnce(new TypeError("offline"));
        await render(<WorkForm data={{ ...work, title: "", artist: "", releaseDate: "" }} mode="create" />);
        await input("title", "새 앨범");
        await input("artist", "새 아티스트");
        await input("releaseDate", "2026-10-26");
        await input("slug", "new-album");
        const fileInput = field("imageFile") as HTMLInputElement;
        const selected = new File(["image bytes"], "cover.png", { type: "image/png" });
        // jsdom에는 파일 선택 창이 없으므로 선택 결과만 주입한다.
        Object.defineProperty(fileInput, "files", { configurable: true, value: [selected] });
        await act(async () => { fileInput.dispatchEvent(new Event("change", { bubbles: true })); });
        const reset = vi.fn();
        form().addEventListener("reset", reset);
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
        expect(reset).not.toHaveBeenCalled();
        expect(field("title").value).toBe("새 앨범");
        expect(field("slug").value).toBe("new-album");
        expect(fileInput.files?.[0]).toBe(selected);
        expect(host.textContent).toContain("새 이미지를 골랐어요");
    });

    it("클라이언트 필수 검사 실패는 저장을 호출하지 않고 입력을 보존한다", async () => {
        await render(<WorkForm data={work} />);
        await input("title", "");
        await input("artist", "바꾼 아티스트");
        await submit();
        expect(save).not.toHaveBeenCalled();
        expect(field("artist").value).toBe("바꾼 아티스트");
        expect(field("title").getAttribute("aria-invalid")).toBe("true");
    });

    it("저장 중에는 편집·버리기를 비활성화하고 연속 제출/Ctrl+S를 무시한다", async () => {
        let finish!: (value: { ok: false; error: string }) => void;
        save.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(<WorkForm data={work} />);
        await input("title", "작성 중");
        await submit();
        expect(field("title").matches(":disabled")).toBe(true);
        expect(host.querySelector("fieldset")!.disabled).toBe(true);
        await act(async () => {
            form().requestSubmit();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, cancelable: true }));
        });
        expect(save).toHaveBeenCalledTimes(1);
        await act(async () => { finish({ ok: false, error: "다시 시도해 주세요." }); });
        expect(field("title").matches(":disabled")).toBe(false);
        expect(field("title").value).toBe("작성 중");
    });
});

describe("저장 성공 후 기준값 동기화", () => {
    it("정규화된 서버 값으로 초기화하고, 다음 변경 버리기는 최근 저장값으로 돌아간다", async () => {
        save.mockResolvedValue({ ok: true });
        await render(<WorkForm data={work} />);
        await input("title", "  새 작품  ");
        await submit();
        expect(refresh).toHaveBeenCalledTimes(1);
        await render(<WorkForm data={{ ...work, _rev: "v2", title: "새 작품" }} />);
        expect(field("title").value).toBe("새 작품");
        expect(host.textContent).toContain("저장했어요.");
        expect(host.textContent).not.toContain("저장하지 않은 변경사항");
        await input("title", "저장 안 한 수정");
        await click("변경 버리기");
        expect(field("title").value).toBe("새 작품");
    });

    it("Works 새 이미지 저장 후 서버 키를 반영하여 파일 없는 두 번째 저장에도 이미지를 유지한다", async () => {
        let persisted: Record<string, unknown>[] = [];
        save.mockImplementation(async (_prev, data: FormData) => {
            const result = await sanitizeBlocks(JSON.parse(String(data.get("blocksJson"))), persisted,
                async () => persisted.length === 0 ? { _type: "image", asset: { _type: "reference", _ref: "image-uploaded" } } : null);
            if ("error" in result) throw new Error(result.error);
            persisted = result.blocks as Record<string, unknown>[];
            return { ok: true };
        });
        await render(<WorkForm data={work} />);
        await click("+ 이미지");
        await submit();
        expect(persisted).toHaveLength(1);
        expect(persisted[0]._key).not.toMatch(/^new-/);
        await render(<WorkForm data={{ ...work, _rev: "v2", blocks: persisted.map((b) => ({ ...b, imageUrl: "/saved.jpg" })) }} />);
        const payload = JSON.parse(String(new FormData(form()).get("blocksJson")));
        expect(payload[0]._key).toBe(persisted[0]._key);
        expect(host.querySelector<HTMLInputElement>('input[type="file"][name^="blockImage_"]')?.files).toHaveLength(0);
        await input("title", "제목만 수정");
        await submit();
        expect(persisted).toHaveLength(1);
        expect(persisted[0].image).toMatchObject({ asset: { _ref: "image-uploaded" } });
    });

    it("Studio 갤러리도 서버 키와 사진 URL을 다시 읽는다", async () => {
        save.mockResolvedValue({ ok: true });
        await render(<SpaceForm data={space} />);
        await click("+ 사진 추가");
        await submit();
        const first = JSON.parse(String((save.mock.calls[0][1] as FormData).get("listsJson")));
        expect(first.images[0]._key).toMatch(/^new-/);
        await render(<SpaceForm data={{ ...space, _rev: "v2", images: [{ key: "saved-key", url: "/saved.jpg" }] }} />);
        await input("name", "ROOM A 수정");
        await submit();
        const next = JSON.parse(String((save.mock.calls[1][1] as FormData).get("listsJson")));
        expect(next.images).toEqual([{ _key: "saved-key" }]);
        expect(host.querySelector('input[name="spaceImage_saved-key"]')).toBeTruthy();
    });

    it("Crew 사용자 아이콘 저장 후 새 참조와 링크 키를 다음 제출에 사용한다", async () => {
        save.mockResolvedValue({ ok: true });
        const crew = { _id: "c1", _rev: "v1", isActive: true, name: "CREW", koName: "크루", role: "프로듀서", slug: "crew", imageUrl: null, links: [{ key: "new-link", url: "https://example.com", iconRef: "" }], sections: [] };
        await render(<CrewForm data={crew} />);
        await submit();
        await render(<CrewForm data={{ ...crew, _rev: "v2", links: [{ key: "saved-link", url: "https://example.com", iconRef: "image-custom-icon" }] }} />);
        await input("name", "CREW 수정");
        await submit();
        const next = save.mock.calls[1][1] as FormData;
        expect(next.get("linkKey_0")).toBe("saved-link");
        expect(next.get("linkIconKeep_0")).toBe("image-custom-icon");
        expect(host.querySelector('input[name="linkIconFile_0"]')).toBeNull();
    });
});
