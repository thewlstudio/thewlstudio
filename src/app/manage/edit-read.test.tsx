import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SpacePage from "./studio/[id]/page";
import CrewPage from "./crew/[id]/page";
import WorkPage from "./works/[id]/page";
import SpaceForm from "./studio/[id]/SpaceForm";
import CrewForm from "./crew/[id]/CrewForm";
import WorkForm from "./works/[id]/WorkForm";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/writeClient", () => ({ isWriteConfigured: () => true }));
vi.mock("./studio/[id]/SpaceForm", () => ({ default: function SpacePlaceholder() { return null; } }));
vi.mock("./crew/[id]/CrewForm", () => ({ default: function CrewPlaceholder() { return null; } }));
vi.mock("./works/[id]/WorkForm", () => ({ default: function WorkPlaceholder() { return null; } }));

function data(node: ReactNode, type: unknown): Record<string, unknown> | undefined {
    if (!isValidElement<Record<string, unknown>>(node)) return undefined;
    if (node.type === type) return node.props.data as Record<string, unknown>;
    for (const child of Array.isArray(node.props.children) ? node.props.children : [node.props.children]) {
        const found = data(child as ReactNode, type); if (found) return found;
    }
}
const params = () => ({ params: Promise.resolve({ id: "document" }) });
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
describe("관리 페이지의 원본 행 보존", () => {
    it.each([null, undefined, ""])("Studio 미리보기 URL #%#가 없어도 사진 행과 순서를 유지한다", async (url) => {
        const raw = { _id: "document", _type: "studioSpace", _rev: "v1", name: "ROOM", images: [{ _key: "first", url: "/first.jpg" }, { _key: "unresolved", url }] };
        const before = JSON.stringify(raw); fetch.mockResolvedValue(raw);
        const model = data(await SpacePage(params()), SpaceForm)!;
        expect(model.images).toEqual([{ key: "first", url: "/first.jpg" }, { key: "unresolved", url: null }]);
        expect(JSON.stringify(raw)).toBe(before);
    });
    it.each(["new-source", "legacy-source", "normal-source"])("Crew 링크 원본 키 %s와 화면 키를 분리한다", async (sourceKey) => {
        fetch.mockResolvedValue({ _id: "document", _type: "crew", _rev: "v1", links: [{ _key: sourceKey, url: "https://example.com", iconRef: "image-original" }] });
        const model = data(await CrewPage(params()), CrewForm)!;
        expect(model.links).toEqual([{ key: "stored-0", sourceKey, url: "https://example.com", iconRef: "image-original" }]);
    });
    it("Crew 원본 키 없는 저장 링크는 새 키로 위장하지 않고 편집을 막는다", async () => {
        fetch.mockResolvedValue({ _id: "document", _type: "crew", _rev: "v1", links: [{ url: "https://example.com" }] });
        expect(data(await CrewPage(params()), CrewForm)).toBeUndefined();
    });
    it("Works는 사진·오디오 URL을 못 읽어도 본문 블록을 그대로 전달한다", async () => {
        const blocks = [{ _key: "photo", _type: "imageBlock", imageUrl: null, image: { asset: { _ref: "image-original" } } }, { _key: "audio", _type: "audioBlock", audioUrl: null, audioFile: { asset: { _ref: "file-original" } } }];
        fetch.mockResolvedValue({ _id: "document", _type: "work", _rev: "v1", contentBlocks: blocks });
        expect(data(await WorkPage(params()), WorkForm)!.blocks).toEqual(blocks);
    });
});
