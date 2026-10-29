import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import StudioInfoForm from "./StudioInfoForm";
import { FALLBACK_INFO } from "@/lib/studio-info";

const { fetch, authenticated } = vi.hoisted(() => ({ fetch: vi.fn(), authenticated: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: authenticated }));
vi.mock("@/sanity/lib/writeClient", () => ({ isWriteConfigured: () => true }));
vi.mock("./StudioInfoForm", () => ({ default: function FormPlaceholder() { return null; } }));

function formData(node: ReactNode): Record<string, unknown> | undefined {
    if (!isValidElement<Record<string, unknown>>(node)) return undefined;
    if (node.type === StudioInfoForm) return node.props.data as Record<string, unknown>;
    const children = node.props.children;
    for (const child of Array.isArray(children) ? children : [children]) {
        const found = formData(child as ReactNode); if (found) return found;
    }
}
beforeEach(() => { vi.resetAllMocks(); authenticated.mockResolvedValue(true); });
afterEach(() => vi.restoreAllMocks());
describe("Studio 안내 페이지의 원본 키 조회", () => {
    it.each(["services", "equipment", "memberships"] as const)("%s 키를 실제 조회 필드와 폼 데이터에 포함한다", async (group) => {
        const raw = { ...FALLBACK_INFO, _id: "studioInfo", _type: "studioInfo", _rev: "v1", [group]: FALLBACK_INFO[group].map((row, i) => ({ ...row, _key: `source-${i}` })) };
        fetch.mockImplementation(async (query: string) => {
            const source = structuredClone(raw);
            // GROQ 투영에서 키를 요청하지 않으면 실제 응답처럼 키를 제외한다.
            const wholeArray = new RegExp(`\\b${group}\\s*,`).test(query);
            if (!wholeArray && !new RegExp(`${group}\\[\\]\\{[^}]*\\b_key\\b`).test(query)) {
                for (const row of source[group]) delete (row as { _key?: string })._key;
            }
            return source;
        });
        const data = formData(await Page())!;
        expect(data).toBeTruthy();
        expect((data[group] as { _key?: string }[]).map((row) => row._key)).toEqual(raw[group].map((_row, i) => `source-${i}`));
    });
});
