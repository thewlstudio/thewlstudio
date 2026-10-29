// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkDetailClient, { AudioPlayerBlock } from "./WorkDetailClient";
import CrewClient from "../../crew/CrewClient";
import type { AudioBlock, WorkDetail } from "@/types/sanity";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("next-sanity", () => ({ PortableText: () => null }));
vi.mock("next/image", async () => {
    const { createElement } = await import("react");
    return { default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }) };
});
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock("motion/react", async () => {
    const { createElement } = await import("react");
    const ignored = new Set(["initial", "animate", "transition", "viewport", "variants", "whileInView"]);
    const cache = new Map<string, (props: Record<string, unknown>) => ReactNode>();
    return { motion: new Proxy({}, { get: (_, key: string) => {
        if (!cache.has(key)) cache.set(key, (props) => createElement(key, Object.fromEntries(Object.entries(props).filter(([name]) => !ignored.has(name))), props.children as ReactNode));
        return cache.get(key);
    } }) };
});

const block = (key = "first", title = "첫 번째 곡", audioUrl = "https://cdn.sanity.io/files/project/production/first.mp3"): AudioBlock => ({ _key: key, _type: "audioBlock", title, artist: "아티스트", audioUrl });
let root: Root;
let host: HTMLDivElement;
let icon: HTMLLinkElement;
let media: WeakMap<HTMLMediaElement, { paused: boolean; duration: number; error: MediaError | null }>;
const data = (audio: HTMLMediaElement) => {
    let value = media.get(audio);
    if (!value) { value = { paused: true, duration: NaN, error: null }; media.set(audio, value); }
    return value;
};
const audio = (index = 0) => host.querySelectorAll("audio")[index];
const button = (index = 0) => host.querySelectorAll("button")[index];
const range = (index = 0) => host.querySelectorAll<HTMLInputElement>('input[type="range"]')[index];
async function render(node: ReactNode = <AudioPlayerBlock block={block()} />) { await act(async () => root.render(node)); }
async function click(index = 0) { await act(async () => button(index).click()); }
async function event(type: string, index = 0) { await act(async () => audio(index).dispatchEvent(new Event(type))); }
async function metadata(duration: number, index = 0) { data(audio(index)).duration = duration; await event("loadedmetadata", index); }
async function seek(value: string, index = 0) {
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(range(index), value);
        range(index).dispatchEvent(new Event("input", { bubbles: true }));
    });
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    media = new WeakMap();
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(function (this: HTMLMediaElement) { return data(this).paused; });
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockImplementation(function (this: HTMLMediaElement) { return data(this).duration; });
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function (this: HTMLMediaElement) { data(this).error = null; data(this).duration = NaN; this.currentTime = 0; });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
        data(this).paused = false;
        this.dispatchEvent(new Event("playing"));
        return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
        data(this).paused = true;
        this.dispatchEvent(new Event("pause"));
    });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    document.title = "홈페이지 원래 제목";
    icon = document.createElement("link");
    icon.rel = "icon";
    icon.setAttribute("href", "/favicon.ico");
    document.head.append(icon);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    try {
        await act(async () => root.unmount());
        // jsdom이 focus/selectionchange에 예약한 0ms 작업은 재생기의 타이머가 아니다.
        await act(async () => vi.advanceTimersByTime(0));
        expect(vi.getTimerCount()).toBe(0);
    } finally {
        host.remove();
        icon.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    }
});

describe("공개 오디오 플레이어", () => {
    it("여러 재생기의 동일한 버튼·슬라이더를 곡 이름의 그룹으로 구분한다", async () => {
        await render(<><AudioPlayerBlock block={block('one', '첫 번째 곡')} /><AudioPlayerBlock block={block('two', '두 번째 곡')} /></>);
        const groups = host.querySelectorAll('[role="group"]');
        expect(Array.from(groups).map((node) => node.getAttribute('aria-label'))).toEqual(['첫 번째 곡 재생기', '두 번째 곡 재생기']);
        expect(groups[0].querySelector('button')).toBe(button(0));
        expect(groups[1].querySelector('input')).toBe(range(1));
    });
    it("재생 위치는 투명 입력이어도 24px 조작 영역과 보이는 포커스 경계를 제공한다", async () => {
        await render();
        await metadata(120);
        const input = range(), target = input.parentElement!;
        expect(target.classList.contains('h-6')).toBe(true);
        expect(target.classList.contains('focus-within:outline-2')).toBe(true);
        expect(input.classList.contains('h-full')).toBe(true);
        expect(input.classList.contains('opacity-0')).toBe(true);
        expect(button().type).toBe('button');
        input.focus(); expect(document.activeElement).toBe(input);
        await seek('50');
        expect(audio().currentTime).toBe(60);
    });
    it("실제 재생이 시작된 뒤에만 재생 상태·탭 제목·파비콘을 변경한다", async () => {
        let finish!: () => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
        await render();
        await click();
        expect(button().getAttribute("aria-label")).toBe("재생 취소");
        expect(document.title).toBe("홈페이지 원래 제목");
        expect(icon.getAttribute("href")).toBe("/favicon.ico");
        await act(async () => { data(audio()).paused = false; audio().dispatchEvent(new Event("playing")); finish(); });
        expect(button().getAttribute("aria-label")).toBe("일시정지");
        expect(document.title).toBe("▶ Playing: 첫 번째 곡");
        expect(icon.getAttribute("href")).toMatch(/^data:image\/svg/);
        await click();
        expect(document.title).toBe("홈페이지 원래 제목");
        expect(icon.getAttribute("href")).toBe("/favicon.ico");
    });
    it("재생 거절을 처리하고 실패 안내 후 재시도할 수 있다", async () => {
        vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
        await render();
        await click();
        expect(button().getAttribute("aria-label")).toBe("재생");
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("재생하지 못했어요");
        expect(document.title).toBe("홈페이지 원래 제목");
        await click();
        expect(host.querySelector('[role="alert"]')).toBeNull();
        expect(button().getAttribute("aria-label")).toBe("일시정지");
    });
    it("동기 재생 예외도 화면 오류나 처리되지 않은 promise로 남기지 않는다", async () => {
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => { throw new Error("unsupported"); });
        await render();
        await click();
        expect(host.querySelector('[role="alert"]')).not.toBeNull();
        expect(document.title).toBe("홈페이지 원래 제목");
    });
    it("미디어 오류 뒤 재시도는 파일을 다시 로드한 뒤 재생한다", async () => {
        await render();
        const el = audio();
        Object.defineProperty(el, "error", { configurable: true, get: () => data(el).error });
        data(audio()).error = { code: 2, message: "network error" } as MediaError;
        await event("error");
        await click();
        expect(HTMLMediaElement.prototype.load).toHaveBeenCalledTimes(1);
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
        expect(button().getAttribute("aria-label")).toBe("일시정지");
        expect(host.querySelector('[role="alert"]')).toBeNull();
    });
    it("빠르게 두 번 눌러 취소하면 늦은 재생 성공이 다시 재생시키지 않는다", async () => {
        let finish!: () => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
        await render();
        await act(async () => { button().click(); button().click(); });
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
        await act(async () => { data(audio()).paused = false; finish(); });
        expect(audio().paused).toBe(true);
        expect(button().getAttribute("aria-label")).toBe("재생");
        expect(document.title).toBe("홈페이지 원래 제목");
    });
    it("다른 곡을 누르면 이전 곡을 멈추고 늦은 이전 응답·pause가 새 곡의 탭 표시를 지우지 않는다", async () => {
        let finish!: () => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
        await render(<><AudioPlayerBlock block={block()} /><AudioPlayerBlock block={block("second", "두 번째 곡")} /></>);
        await click(0);
        await click(1);
        expect(document.title).toBe("▶ Playing: 두 번째 곡");
        await act(async () => { data(audio()).paused = false; audio().dispatchEvent(new Event("playing")); finish(); });
        expect(audio().paused).toBe(true);
        expect(document.title).toBe("▶ Playing: 두 번째 곡");
        expect(button(1).getAttribute("aria-label")).toBe("일시정지");
        await click(1);
        expect(document.title).toBe("홈페이지 원래 제목");
        expect(icon.getAttribute("href")).toBe("/favicon.ico");
    });
    it("이전 play 실패가 그 뒤의 정상 재생 상태를 덮어쓰지 않는다", async () => {
        let fail!: (error: Error) => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; }));
        await render();
        await click();
        await click();
        await click();
        await act(async () => fail(new DOMException("old", "AbortError")));
        expect(button().getAttribute("aria-label")).toBe("일시정지");
        expect(host.querySelector('[role="alert"]')).toBeNull();
    });
    it("브라우저의 pause·error·ended 이벤트를 UI와 탭 표시에 반영한다", async () => {
        await render();
        await click();
        await act(async () => audio().pause());
        expect(button().getAttribute("aria-label")).toBe("재생");
        await click();
        await event("error");
        expect(host.querySelector('[role="alert"]')).not.toBeNull();
        expect(document.title).toBe("홈페이지 원래 제목");
        await click();
        await metadata(20);
        audio().currentTime = 18;
        await event("timeupdate");
        expect(audio().volume).toBeCloseTo(0.4);
        await event("ended");
        expect(range().value).toBe("0");
        expect(audio().currentTime).toBe(0);
        expect(audio().volume).toBe(1);
        expect(document.title).toBe("홈페이지 원래 제목");
    });
    it.each([NaN, Infinity, 0])("메타데이터 길이 %s에서는 탐색을 비활성화하고 잘못된 진행률을 만들지 않는다", async (duration) => {
        await render();
        await metadata(duration);
        audio().currentTime = 1;
        await event("timeupdate");
        expect(range().disabled).toBe(true);
        expect(range().value).toBe("0");
        expect(host.innerHTML).not.toContain("NaN%");
        expect(host.innerHTML).not.toContain("Infinity%");
    });
    it("유효한 길이가 로드되면 탐색할 수 있고 진행률은 범위를 벗어나지 않는다", async () => {
        await render();
        await metadata(100);
        expect(range().disabled).toBe(false);
        await seek("50");
        expect(audio().currentTime).toBe(50);
        audio().currentTime = 120;
        await event("timeupdate");
        expect(range().value).toBe("100");
        audio().currentTime = -1;
        await event("timeupdate");
        expect(range().value).toBe("0");
    });
    it("재생 중 제목 수정은 오디오를 멈추지 않고 탭 문구만 갱신한다", async () => {
        await render();
        await click();
        await render(<AudioPlayerBlock block={block("first", "수정한 제목")} />);
        expect(audio().paused).toBe(false);
        expect(button().getAttribute("aria-label")).toBe("일시정지");
        expect(document.title).toBe("▶ Playing: 수정한 제목");
    });
    it("재생 요청 중 제목이 바뀌어도 늦은 성공이 이전 제목을 되살리지 않는다", async () => {
        let finish!: () => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
        await render();
        await click();
        await render(<AudioPlayerBlock block={block("first", "최신 제목")} />);
        await act(async () => { data(audio()).paused = false; audio().dispatchEvent(new Event("playing")); finish(); });
        expect(document.title).toBe("▶ Playing: 최신 제목");
    });
    it("원본 오디오 주소 변경 시 이전 재생 상태·진행률을 이어받지 않는다", async () => {
        await render();
        await metadata(100);
        await click();
        audio().currentTime = 40;
        await event("timeupdate");
        await render(<AudioPlayerBlock block={block("first", "새 파일", "https://cdn.sanity.io/files/project/production/new.mp3")} />);
        expect(button().getAttribute("aria-label")).toBe("재생");
        expect(range().value).toBe("0");
        expect(range().disabled).toBe(true);
        expect(document.title).toBe("홈페이지 원래 제목");
    });
    it("화면 해제 뒤 성공한 재생은 멈추고 새 페이지의 메타데이터를 덮어쓰지 않는다", async () => {
        let finish!: () => void;
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
        await render();
        const old = audio();
        await click();
        await render(<p>새 페이지</p>);
        document.title = "새 페이지 제목";
        await act(async () => { data(old).paused = false; finish(); });
        expect(old.paused).toBe(true);
        expect(document.title).toBe("새 페이지 제목");
    });
    it("다른 코드가 바꾼 제목·파비콘은 재생 정리 시 원래 값으로 덮어쓰지 않는다", async () => {
        await render();
        await click();
        document.title = "다음 페이지";
        icon.href = "/new.ico";
        await render(<p>새 페이지</p>);
        expect(document.title).toBe("다음 페이지");
        expect(icon.getAttribute("href")).toBe("/new.ico");
    });
    it("동작 줄이기에서는 파비콘을 반복 애니메이션하지 않고 StrictMode 정리도 안전하다", async () => {
        vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
        await render(<StrictMode><AudioPlayerBlock block={block()} /></StrictMode>);
        await click();
        const href = icon.getAttribute("href");
        await act(async () => vi.advanceTimersByTime(1200));
        expect(icon.getAttribute("href")).toBe(href);
        expect(vi.getTimerCount()).toBe(0);
        await click();
        expect(document.title).toBe("홈페이지 원래 제목");
    });
});

const work: WorkDetail = { title: "작품", artist: "가수", slug: "album", releaseDate: "2026. 10. 26.", imageUrl: null, lqip: null, contentBlocks: [] };
describe("공개 콘텐츠 렌더링의 주소 경계", () => {
    it("긴 작품명·크레딧·링크 문구를 생략하지 않고 좁은 값 열에서 줄바꿈할 수 있게 한다", async () => {
        const value = 'LongArtistWithoutSpaces'.repeat(6);
        await render(<WorkDetailClient initialWork={{ ...work, title: value, contentBlocks: [
            { _key: 'long-credit', _type: 'creditGridBlock', sections: [{ title: 'Credit', items: [{ role: 'Executive Producer', value, linkText: value, linkUrl: 'https://example.com' }] }] },
        ] }} />);
        expect(host.querySelector('main')?.classList.contains('[overflow-wrap:anywhere]')).toBe(true);
        expect(host.querySelector('h1')?.textContent).toBe(value);
        const row = host.querySelector('li')!, column = row.querySelector('div')!;
        expect(column.classList.contains('min-w-0')).toBe(true);
        expect(column.classList.contains('flex-1')).toBe(true);
        expect(column.querySelector('span')?.textContent).toBe(value);
        expect(column.querySelector('a')?.textContent).toBe(value);
    });
    it("본문 시작은 제목 위의 아티스트 링크도 포함해 건너뛰지 않는다", async () => {
        await render(<WorkDetailClient initialWork={{ ...work, instagramId: 'artist' }} />);
        const start = host.querySelector<HTMLElement>('#page-title')!;
        expect(start.tabIndex).toBe(-1);
        expect(start.getAttribute('data-page-path')).toBe('/works/album');
        expect(start.getAttribute('aria-label')).toBe('가수 - 작품');
        expect(start.contains(host.querySelector('a[href="https://instagram.com/artist"]'))).toBe(true);
        expect(start.contains(host.querySelector('h1'))).toBe(true);
    });
    it.each([null, '/cover.jpg'])("상세 커버(%s)의 영상 링크도 사진에 의존하지 않는 이름을 갖는다", async (imageUrl) => {
        await render(<WorkDetailClient initialWork={{ ...work, imageUrl, youtubeUrl: 'https://youtube.com/watch?v=R86SFBXqEdM' }} />);
        const link = host.querySelector<HTMLAnchorElement>('a[aria-label="작품 영상 보기"]')!;
        expect(link.href).toBe('https://youtube.com/watch?v=R86SFBXqEdM');
        expect(link.classList.contains('focus-visible:outline-2')).toBe(true);
        expect(link.querySelector('[aria-hidden="true"]')?.classList.contains('group-focus-within:opacity-100')).toBe(true);
    });
    it("유효한 Shorts·라이브만 임베드하고 위장 도메인은 표시하지 않는다", async () => {
        await render(<WorkDetailClient initialWork={{ ...work, contentBlocks: [
            { _key: "short", _type: "videoEmbedBlock", url: "https://youtube.com/shorts/R86SFBXqEdM" },
            { _key: "live", _type: "videoEmbedBlock", url: "https://youtube.com/live/R86SFBXqEdM" },
            { _key: "fake", _type: "videoEmbedBlock", url: "https://example.com/watch?v=R86SFBXqEdM" },
        ] }} />);
        const embeds = Array.from(host.querySelectorAll("iframe"));
        expect(embeds).toHaveLength(2);
        expect(embeds.every((embed) => embed.src === "https://www.youtube.com/embed/R86SFBXqEdM")).toBe(true);
    });
    it("커버 링크가 없으면 #로 페이지를 이동시키지 않고 잘못된 외부 링크는 href를 만들지 않는다", async () => {
        await render(<WorkDetailClient initialWork={{ ...work, youtubeUrl: "javascript:alert(1)", instagramId: "invalid/name", instagramUrl: "https://user:pass@example.com", contentBlocks: [
            { _key: "credit", _type: "creditGridBlock", sections: [{ items: [{ value: "크레딧", linkText: "잘못된 링크", linkUrl: "javascript:alert(1)" }] }] },
        ] }} />);
        expect(host.querySelectorAll("a[href]")).toHaveLength(0);
        expect(host.textContent).toContain("잘못된 링크");
        expect(host.querySelector('a[href="#"]')).toBeNull();
    });
    it("Crew의 잘못된 소셜 주소는 제외하고 정상 링크만 유지한다", async () => {
        await render(<CrewClient members={[{ name: "멤버", koName: "크루", role: "프로듀서", slug: "crew", imageUrl: null, links: [
            { url: "https://instagram.com/artist", iconUrl: null },
            { url: "javascript:alert(1)", iconUrl: null },
            { url: "https://user:pass@example.com", iconUrl: null },
        ] }]} />);
        const links = Array.from(host.querySelectorAll('a[target="_blank"]'));
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute("href")).toBe("https://instagram.com/artist");
    });
    it("잘못된 오디오 주소는 재생기 src로 전달하지 않는다", async () => {
        await render(<AudioPlayerBlock block={block("bad", "잘못된 파일", "javascript:alert(1)")} />);
        expect(host.querySelector("audio")).toBeNull();
    });
});
