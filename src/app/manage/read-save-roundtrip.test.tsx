// @vitest-environment jsdom
import { act, isValidElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateTag } from "next/cache";
import SpacePage from "./studio/[id]/page";
import CrewPage from "./crew/[id]/page";
import WorkPage from "./works/[id]/page";
import InstructorPage from "./instructors/[id]/page";
import SpaceForm, { type SpaceFormData } from "./studio/[id]/SpaceForm";
import CrewForm, { type CrewFormData } from "./crew/[id]/CrewForm";
import WorkForm, { type WorkFormData } from "./works/[id]/WorkForm";
import InstructorForm, { type InstructorFormData } from "./instructors/[id]/InstructorForm";

type Raw = Record<string, unknown>;
const { client, patch, db, refresh } = vi.hoisted(() => ({
    client: { fetch: vi.fn(), getDocument: vi.fn(), assets: { upload: vi.fn() }, patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw, removed: [] as string[], revision: "", saves: 0 }, refresh: vi.fn(),
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: async () => {}, isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/client", () => ({ client }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client, isWriteConfigured: () => true }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => ({ refresh }) }));
vi.mock("next/link", () => ({ default: ({ children, onNavigate, ...props }: { children: ReactNode; onNavigate?: unknown }) => { void onNavigate; return <a {...props}>{children}</a>; } }));
vi.mock("./_components/ImageCropper", () => ({ default: () => null }));
let root: Root;
let host: HTMLDivElement;
let lastRefresh: Promise<void> | undefined;
function data(node: ReactNode, type: unknown): unknown {
    if (!isValidElement<Record<string, unknown>>(node)) return undefined;
    if (node.type === type) return node.props.data;
    for (const child of Array.isArray(node.props.children) ? node.props.children : [node.props.children]) {
        const found = data(child as ReactNode, type); if (found) return found;
    }
}
async function paint() {
    const params = { params: Promise.resolve({ id: "document" }) };
    if (db.doc._type === "studioSpace") root.render(<SpaceForm data={data(await SpacePage(params), SpaceForm) as SpaceFormData} />);
    else if (db.doc._type === "work") root.render(<WorkForm data={data(await WorkPage(params), WorkForm) as WorkFormData} />);
    else if (db.doc._type === "instructor") root.render(<InstructorForm data={data(await InstructorPage(params), InstructorForm) as InstructorFormData} />);
    else root.render(<CrewForm data={data(await CrewPage(params), CrewForm) as CrewFormData} />);
}
async function changeInput(selector: string, value: string) {
    await act(async () => {
        const input = host.querySelector<HTMLInputElement>(selector)!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
const changeName = (value: string) => changeInput("#name", value);
async function submit() {
    await act(async () => host.querySelector<HTMLFormElement>("form[data-manage-form]")!.requestSubmit());
    await act(async () => { await lastRefresh; });
}
async function click(label: string) {
    const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    expect(button, label).toBeTruthy(); await act(async () => button.click());
}
const photo = (key: string, ref: string) => ({ _key: key, _type: "image", asset: { _type: "reference", _ref: ref }, crop: { top: 0.1, bottom: 0, left: 0, right: 0 }, hotspot: { x: 0.4 }, attribution: "원본 정보" });
function studio() {
    db.doc = { _id: "document", _type: "studioSpace", _rev: "v1", name: "ROOM", prices: [], features: [], notes: [], images: [photo("visible", "image-visible"), photo("unresolved", "image-unresolved")] };
}
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.resetAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true); HTMLElement.prototype.scrollIntoView = vi.fn();
    db.doc = {}; db.fields = {}; db.removed = []; db.saves = 0; lastRefresh = undefined;
    client.fetch.mockImplementation(async () => {
        const raw = structuredClone(db.doc);
        if (raw._type === "work") return { ...raw, sourceSlug: raw.slug, slug: (raw.slug as Raw | undefined)?.current, sourceBlocks: raw.contentBlocks, imageUrl: null };
        if (raw._type === "studioSpace") return { ...raw, sourceImages: raw.images, sourcePrices: raw.prices, images: (raw.images as Raw[]).map((row) => ({ _key: row._key, url: row._key === "visible" ? "/visible.jpg" : null })) };
        if (raw._type === "instructor") return { ...raw, imageUrl: null, modalImageUrl: null, bgImageUrl: null };
        return { ...raw, sourceLinks: raw.links, slug: "crew", imageUrl: null, links: (raw.links as { _key: string; url: string; iconImage?: { asset?: { _ref?: string } } }[]).map((row) => ({ _key: row._key, url: row.url, iconRef: row.iconImage?.asset?._ref })) };
    });
    client.getDocument.mockImplementation(async () => structuredClone(db.doc));
    client.patch.mockReturnValue(patch);
    patch.ifRevisionId.mockImplementation((revision: string) => { db.revision = revision; return patch; });
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.unset.mockImplementation((fields: string[]) => { db.removed = fields; return patch; });
    patch.commit.mockImplementation(async () => {
        if (db.revision !== db.doc._rev) throw Object.assign(new Error("conflict"), { statusCode: 409 });
        db.saves++; db.doc = { ...db.doc, ...structuredClone(db.fields), _rev: `v${db.saves + 1}` };
        for (const field of db.removed) delete db.doc[field]; return db.doc;
    });
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
    refresh.mockImplementation(() => { lastRefresh = paint(); return lastRefresh; });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe("실제 조회 페이지→폼→저장→재조회 원본 보존", () => {
    it.each(["instructor", "crew", "work", "studioSpace"])("%s 커밋 응답이 불명확해도 성공 표시 없이 입력·dirty를 유지한다", async (type) => {
        const shared = { _id: "document", _type: type, _rev: "v1", isActive: false };
        db.doc = type === "instructor" ? { ...shared, instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: ["소개"], process: ["과정"] }
            : type === "work" ? { ...shared, title: "작품", artist: "가수", releaseDate: "2026. 11. 03.", slug: { current: "work" }, contentBlocks: [] }
            : type === "crew" ? { ...shared, name: "CREW", koName: "크루", role: "역할", sections: [], links: [] }
            : { ...shared, name: "ROOM", images: [], prices: [], features: [], notes: [] };
        const before = structuredClone(db.doc); await act(async () => { await paint(); });
        const selector = type === "instructor" ? "#instructorName" : type === "work" ? "#title" : "#name";
        await changeInput(selector, "확인되지 않은 수정"); patch.commit.mockResolvedValue(null); await submit();
        expect(host.textContent).toContain("변경 요청의 결과를 확인하지 못했어요"); expect(host.querySelector<HTMLInputElement>(selector)?.value).toBe("확인되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        expect(patch.commit).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it("실제 저장 뒤 캐시만 실패하면 완료 사실을 안내하고 자동 재저장하지 않는다", async () => {
        db.doc = { _id: "document", _type: "work", _rev: "v1", title: "작품", artist: "가수", releaseDate: "2026. 11. 03.", slug: { current: "work" }, contentBlocks: [] };
        await act(async () => { await paint(); }); await changeInput("#title", "저장된 수정");
        vi.mocked(updateTag).mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); }); await submit();
        expect(db.doc.title).toBe("저장된 수정"); expect(db.doc._rev).toBe("v2"); expect(host.textContent).toContain("변경은 완료됐지만"); expect(host.textContent).not.toContain("DO_NOT_ECHO");
        expect(host.querySelector<HTMLInputElement>("#title")?.value).toBe("저장된 수정"); expect(db.saves).toBe(1); expect(patch.commit).toHaveBeenCalledTimes(1); expect(refresh).not.toHaveBeenCalled();
    });
    it("Studio 생성 전 순서 조회 형식 오류는 입력·dirty를 유지하고 업로드·이동하지 않는다", async () => {
        db.doc = { _id: "unchanged", _type: "studioSpace", _rev: "v1", images: [] }; const before = structuredClone(db.doc);
        await act(async () => root.render(<SpaceForm mode="create" data={{ _id: "", kind: "room", isActive: true, name: "ROOM", subtitle: "", description: "", images: [], prices: [], features: [], notes: [] }} />));
        await changeName("추가되지 않은 공간"); await submit();
        expect(host.textContent).toContain("표시 순서를 확인하지 못해");
        expect(host.querySelector<HTMLInputElement>("#name")?.value).toBe("추가되지 않은 공간");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it.each(["work", "studioSpace"])("%s 사진 원본이 조회 뒤 손상돼도 자동 제외하지 않고 입력·dirty를 유지한다", async (type) => {
        db.doc = type === "work" ? { _id: "document", _type: type, _rev: "v1", title: "작품", artist: "가수", releaseDate: "2026. 11. 03.", slug: { current: "work" }, contentBlocks: [{ _key: "photo", _type: "imageBlock", image: photo("source", "image-original") }] }
            : { _id: "document", _type: type, _rev: "v1", name: "ROOM", prices: [], features: [], notes: [], images: [photo("photo", "image-original")] };
        await act(async () => { await paint(); });
        if (type === "work") (db.doc.contentBlocks as Raw[])[0].image = "DO_NOT_ECHO"; else (db.doc.images as Raw[])[0].asset = "DO_NOT_ECHO";
        const before = structuredClone(db.doc); const selector = type === "work" ? "#title" : "#name";
        await changeInput(selector, "저장되지 않은 수정"); await submit();
        expect(host.textContent).toContain("기존 사진 참조를 읽지 못해"); expect(host.textContent).not.toContain("DO_NOT_ECHO");
        expect(host.querySelector<HTMLInputElement>(selector)?.value).toBe("저장되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        const errorLink = host.querySelector<HTMLAnchorElement>(`a[href="#${type === "work" ? "blocks" : "images"}"]`)!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click()); expect(document.activeElement).toBe(host.querySelector(type === "work" ? "#blocks" : "#images"));
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it.each(["instructor", "crew", "work", "studioSpace"])("%s 잘못된 공개 값은 원본·dirty를 유지하고 보이는 선택 묶음으로 안내한다", async (type) => {
        const shared = { _id: "document", _type: type, _rev: "v1", isActive: false };
        db.doc = type === "instructor" ? { ...shared, instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: ["소개"], process: ["과정"] }
            : type === "work" ? { ...shared, title: "작품", artist: "가수", releaseDate: "2026. 11. 03.", slug: { current: "work" }, contentBlocks: [] }
            : type === "crew" ? { ...shared, name: "CREW", koName: "크루", role: "역할", sections: [], links: [] }
            : { ...shared, name: "ROOM", images: [], prices: [], features: [], notes: [] };
        const before = structuredClone(db.doc); await act(async () => { await paint(); });
        const selector = type === "instructor" ? "#instructorName" : type === "work" ? "#title" : "#name";
        await changeInput(selector, "저장되지 않은 수정");
        host.querySelector<HTMLInputElement>('input[name="isActive"]')!.value = "invalid-value";
        await submit();
        expect(host.textContent).toContain("공개 상태: 입력 형식을 확인하지 못해");
        expect(host.querySelector<HTMLInputElement>(selector)?.value).toBe("저장되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        const errorLink = host.querySelector<HTMLAnchorElement>('a[href="#visibility"]')!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click());
        expect(document.activeElement).toBe(host.querySelector("#visibility"));
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it("사진 위치 오류는 숨은 전송 필드가 아니라 보이는 선택 묶음으로 이동한다", async () => {
        db.doc = { _id: "document", _type: "instructor", _rev: "v1", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: ["소개"], process: ["과정"], imagePosition: "object-top" };
        const before = structuredClone(db.doc); await act(async () => { await paint(); });
        await changeInput("#instructorName", "저장되지 않은 수정"); host.querySelector<HTMLInputElement>('input[name="imagePosition"]')!.value = "unsupported-class";
        await submit();
        const errorLink = host.querySelector<HTMLAnchorElement>('a[href="#photo-position"]')!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click()); expect(document.activeElement).toBe(host.querySelector("#photo-position"));
        expect(host.querySelector<HTMLInputElement>("#instructorName")?.value).toBe("저장되지 않은 수정");
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it("Crew 링크의 추가 원본 필드 오류는 입력·dirty·원본과 오류 연결을 유지한다", async () => {
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: [], links: [{ _key: "link", url: "https://example.com", custom: "DO_NOT_ECHO" }] };
        const before = structuredClone(db.doc); await act(async () => { await paint(); });
        await changeName("저장되지 않은 수정"); await submit();
        expect(host.textContent).toContain("이 편집기에서 다루지 않는 원본 정보"); expect(host.textContent).not.toContain("DO_NOT_ECHO");
        expect(host.querySelector<HTMLInputElement>("#name")?.value).toBe("저장되지 않은 수정");
        const errorLink = host.querySelector<HTMLAnchorElement>('a[href="#linkUrl_0"]')!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click());
        expect(document.activeElement).toBe(host.querySelector("#linkUrl_0"));
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled(); expect(db.saves).toBe(0); expect(db.doc).toEqual(before);
    });
    it("Crew 마지막 링크를 지운 뒤 원본 확인 오류가 나도 목록 묶음으로 안내한다", async () => {
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: [], links: [{ _key: "link", url: "https://example.com" }] };
        await act(async () => { await paint(); });
        const remove = Array.from(host.querySelectorAll("button")).find((node) => node.textContent === "이 링크 지우기")!;
        await act(async () => remove.click());
        // 화면을 읽은 뒤 원본이 키 없는 확장 형식으로 바뀐 상황. 다른 행으로 추측하지 않는다.
        db.doc.links = [{ url: "https://example.com", custom: "DO_NOT_ECHO" }]; const before = structuredClone(db.doc);
        await submit();
        expect(host.querySelector("#linkUrl_0")).toBeNull(); expect(host.querySelector("#links")).toBeTruthy();
        expect(host.textContent).toContain("이 편집기에서 다루지 않는 원본 정보");
        const errorLink = host.querySelector<HTMLAnchorElement>('a[href="#links"]')!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click());
        expect(document.activeElement).toBe(host.querySelector("#links"));
        expect(client.patch).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it("강사 이름 반복 저장에서 소개·과정·사진 원본과 최상위 확장 정보가 남는다", async () => {
        const images = { image: photo("one", "image-one"), modalImage: photo("two", "image-two"), bgImage: photo("three", "image-three") };
        const about = ["소개 한 줄", "English 소개 🎵"]; const process = ["첫 단계", "두 번째 단계"];
        db.doc = { _id: "document", _type: "instructor", _rev: "v1", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about, process, ...images, custom: { keep: true } };
        await act(async () => { await paint(); });
        for (const name of ["첫 수정", "두 번째 수정"]) { await changeInput("#instructorName", name); await submit(); expect(db.doc).toMatchObject({ about, process, ...images, custom: { keep: true } }); }
        expect(db.saves).toBe(2); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it.each(["about", "process"])("강사 %s 원본이 조회 뒤 손상돼도 입력·dirty를 유지하고 덮어쓰지 않는다", async (field) => {
        db.doc = { _id: "document", _type: "instructor", _rev: "v1", instructorName: "강사", category: "VOCAL", subtitle: "소개", lessonInfo: "수업", about: ["소개"], process: ["과정"] };
        await act(async () => { await paint(); });
        db.doc[field] = [{ custom: "DO_NOT_ECHO" }]; const before = structuredClone(db.doc);
        await changeInput("#instructorName", "저장되지 않은 수정"); await submit();
        expect(host.textContent).toContain("원본 형식을 읽지 못해"); expect(host.textContent).not.toContain("DO_NOT_ECHO");
        expect(host.querySelector<HTMLInputElement>("#instructorName")?.value).toBe("저장되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        const errorLink = host.querySelector<HTMLAnchorElement>(`a[href="#${field}"]`)!;
        expect(errorLink).toBeTruthy(); await act(async () => errorLink.click());
        expect(document.activeElement).toBe(host.querySelector(`#${field}`));
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); expect(db.doc).toEqual(before);
    });
    it("Studio 가격 추가 필드 오류는 실제 조회·폼·액션에서 입력과 원본을 유지한다", async () => {
        studio(); db.doc.prices = [{ _key: "price", label: "기본", value: "1000", unit: "원", custom: "DO_NOT_ECHO" }];
        const before = structuredClone(db.doc); await act(async () => { await paint(); });
        await changeName("저장되지 않은 수정"); await submit();
        expect(host.textContent).toContain("이 편집기에서 다루지 않는 원본 정보");
        expect(host.textContent).not.toContain("DO_NOT_ECHO");
        expect(host.querySelector<HTMLInputElement>("#name")?.value).toBe("저장되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        expect(host.querySelector("#prices")).toBeTruthy();
        expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled(); expect(db.saves).toBe(0); expect(db.doc).toEqual(before);
    });
    it("Studio 가격의 new- 원본 키는 이름 반복 저장 뒤에도 유지한다", async () => {
        studio(); db.doc.prices = [{ _key: "new-original", label: "기본", value: "1000", unit: "원" }];
        const original = structuredClone(db.doc.prices); await act(async () => { await paint(); });
        for (const name of ["첫 수정", "두 번째 수정"]) { await changeName(name); await submit(); expect(db.doc.prices).toEqual(original); }
        expect(db.saves).toBe(2); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it.each(["work", "crew"])("%s 일반 본문 추가 필드 오류는 실제 폼의 입력·dirty 상태와 서버 원본을 유지한다", async (type) => {
        const content = type === "work" ? [{ _key: "body", _type: "descriptionBlock", paragraphs: ["본문"], custom: "PRIVATE_EXTRA_VALUE" }] : [{ _key: "body", _type: "aboutSection", text: "소개", custom: "PRIVATE_EXTRA_VALUE" }];
        db.doc = type === "work" ? { _id: "document", _type: type, _rev: "v1", title: "작품", artist: "가수", releaseDate: "2026. 11. 02.", slug: { current: "work" }, contentBlocks: content } : { _id: "document", _type: type, _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: content, links: [] };
        const before = JSON.stringify(db.doc); await act(async () => { await paint(); });
        const selector = type === "work" ? "#title" : "#name";
        await changeInput(selector, "저장되지 않은 수정"); await submit();
        expect(host.textContent).toContain("이 편집기에서 다루지 않는 원본 정보");
        expect(host.querySelector<HTMLInputElement>(selector)?.value).toBe("저장되지 않은 수정");
        expect(Array.from(host.querySelectorAll("button")).some((node) => node.textContent?.includes("변경 버리기"))).toBe(true);
        expect(host.querySelector(type === "work" ? "#blocks" : "#sections")).toBeTruthy();
        expect(JSON.stringify(db.doc)).toBe(before); expect(client.patch).not.toHaveBeenCalled(); expect(client.assets.upload).not.toHaveBeenCalled();
        expect(db.saves).toBe(0); expect(refresh).not.toHaveBeenCalled();
    });
    it("Works 제목을 반복 저장해도 일반 본문과 중첩 new- 원본 키가 바뀌지 않는다", async () => {
        const original = [
            { _key: "new-description", _type: "descriptionBlock", paragraphs: ["기존 본문"] },
            { _key: "tracks", _type: "tracklistBlock", tracks: [{ _key: "new-track", title: "곡", description: "설명" }] },
            { _key: "credit", _type: "creditGridBlock", sections: [{ _key: "new-group", title: "크레딧", items: [{ _key: "new-item", role: "역할", value: "내용" }] }] },
        ];
        db.doc = { _id: "document", _type: "work", _rev: "v1", title: "작품", artist: "가수", releaseDate: "2026. 10. 29.", slug: { current: "work" }, contentBlocks: structuredClone(original) };
        await act(async () => { await paint(); });
        for (const title of ["첫 수정", "두 번째 수정"]) { await changeInput("#title", title); await submit(); expect(db.doc.contentBlocks).toEqual(original); }
        expect(db.saves).toBe(2); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Crew 이름을 반복 저장해도 일반 소개·경력·음반·수상·활동 키가 바뀌지 않는다", async () => {
        const original = [
            { _key: "new-about", _type: "aboutSection", text: "소개" },
            { _key: "disc", _type: "discographySection", years: [{ _key: "new-year", year: "2026", tracks: [{ _key: "new-track", title: "곡" }] }] },
            { _key: "career", _type: "careerSection", items: [{ _key: "new-career", title: "경력" }] },
            { _key: "combined", _type: "awardsAndActivitiesSection", awards: [{ _key: "new-award", title: "수상" }], activities: [{ _key: "new-activity", title: "활동" }] },
        ];
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: structuredClone(original), links: [] };
        await act(async () => { await paint(); });
        for (const name of ["첫 수정", "두 번째 수정"]) { await changeName(name); await submit(); expect(db.doc.sections).toEqual(original); }
        expect(db.saves).toBe(2); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Crew 미지원·전환 불가 원본은 다른 필드의 반복 저장에서도 그대로 남는다", async () => {
        const original = [
            { _key: "opaque", _type: "futureSection", items: [null, { title: { untouched: true } }], custom: "보존 정보" },
            { _key: "old", _type: "awardsSection", items: [{ title: "옛 수상", date: "2020", desc: "원본 설명" }], custom: "추가 정보" },
        ];
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: structuredClone(original), links: [] };
        await act(async () => { await paint(); });
        expect(host.textContent).toContain("자동으로 옮기지 않았어요"); expect(host.textContent).toContain("원본 설명");
        for (const value of ["첫 수정", "두 번째 수정"]) { await changeName(value); await submit(); expect(db.doc.sections).toEqual(original); }
        expect(db.saves).toBe(2); expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it("Crew 옛 문자열 활동은 명시적 전환 후 실제 저장·재조회에서도 새 형식을 유지한다", async () => {
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: [{ _key: "old", _type: "activitiesSection", items: ["옛 활동"] }], links: [] };
        await act(async () => { await paint(); });
        const migrate = Array.from(host.querySelectorAll("button")).find((node) => node.textContent === "새 형식으로 옮기기")!;
        expect(migrate).toBeTruthy(); await act(async () => migrate.click()); await submit();
        expect(db.doc.sections).toMatchObject([{ _type: "awardsAndActivitiesSection", awards: [], activities: [{ title: "옛 활동" }] }]);
        const stored = structuredClone(db.doc.sections);
        await changeName("이름 수정"); await submit(); expect(db.doc.sections).toEqual(stored); expect(db.saves).toBe(2);
    });
    it("Studio 다른 필드를 두 번 저장해도 URL 없는 사진 참조·crop·메타데이터가 남는다", async () => {
        studio(); const original = structuredClone(db.doc.images);
        await act(async () => { await paint(); });
        for (const value of ["첫 수정", "두 번째 수정"]) { await changeName(value); await submit(); expect(db.doc.images).toEqual(original); }
        expect(host.textContent).toContain("기존 사진 정보는 유지돼요");
        expect(client.assets.upload).not.toHaveBeenCalled(); expect(db.saves).toBe(2);
    });
    it("Studio URL 없는 사진도 재정렬하고 명시적으로 삭제할 수 있다", async () => {
        studio(); await act(async () => { await paint(); });
        await click("사진 2 앞으로"); await submit();
        expect((db.doc.images as Raw[]).map((row) => row._key)).toEqual(["unresolved", "visible"]);
        await click("사진 1 지우기"); await submit();
        expect((db.doc.images as Raw[]).map((row) => row._key)).toEqual(["visible"]);
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
    it.each(["new-source", "legacy-source", "normal-source"])("Crew 원본 키 %s와 아이콘 crop·hotspot을 반복 저장에서도 유지한다", async (_key) => {
        const iconImage = { _type: "image", asset: { _type: "reference", _ref: "image-original" }, crop: { top: 0.2 }, hotspot: { x: 0.3 }, extra: "원본 정보" };
        const original = [{ _key, url: "https://example.com", iconImage }];
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: [], links: original };
        await act(async () => { await paint(); });
        for (const value of ["첫 수정", "두 번째 수정"]) { await changeName(value); await submit(); expect(db.doc.links).toEqual(original); }
        expect(client.assets.upload).not.toHaveBeenCalled(); expect(db.saves).toBe(2);
    });
    it("Crew 새 링크는 원본 키를 위장하지 않고 첫 저장에서만 서버 키를 발급받는다", async () => {
        db.doc = { _id: "document", _type: "crew", _rev: "v1", name: "CREW", koName: "크루", role: "역할", sections: [], links: [{ _key: "new-source", url: "https://example.com" }] };
        await act(async () => { await paint(); });
        const add = Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "+ 링크 추가")!;
        expect(add).toBeTruthy(); await act(async () => add.click());
        await changeInput("#linkUrl_1", "https://new.example.com");
        expect(host.querySelector('input[name="linkKey_1"]')).toBeNull();
        await submit();
        const firstKeys = (db.doc.links as Raw[]).map((row) => row._key);
        expect(firstKeys[0]).toBe("new-source");
        expect(firstKeys[1]).toMatch(/^[0-9a-f-]+$/);
        await changeName("재저장"); await submit();
        expect((db.doc.links as Raw[]).map((row) => row._key)).toEqual(firstKeys);
        expect(client.assets.upload).not.toHaveBeenCalled();
    });
});
