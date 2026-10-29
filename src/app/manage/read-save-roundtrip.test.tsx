// @vitest-environment jsdom
import { act, isValidElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SpacePage from "./studio/[id]/page";
import CrewPage from "./crew/[id]/page";
import SpaceForm, { type SpaceFormData } from "./studio/[id]/SpaceForm";
import CrewForm, { type CrewFormData } from "./crew/[id]/CrewForm";

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
        if (raw._type === "studioSpace") return { ...raw, sourceImages: raw.images, sourcePrices: raw.prices, images: (raw.images as Raw[]).map((row) => ({ _key: row._key, url: row._key === "visible" ? "/visible.jpg" : null })) };
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
