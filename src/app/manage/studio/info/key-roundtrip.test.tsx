// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioInfoForm from "./StudioInfoForm";
import { FALLBACK_INFO, mergeInfoForManage } from "@/lib/studio-info";

type Raw = Record<string, unknown>;
const { client, patch, db, refresh } = vi.hoisted(() => ({
    client: { getDocument: vi.fn(), create: vi.fn(), patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw, revision: "", saves: 0 }, refresh: vi.fn(),
}));
// 실제 폼·서버 액션·정리·고정 문서 저장을 실행하고 인증/저장소/새로고침만 대체한다.
vi.mock("@/lib/manage-auth", () => ({ requireAuth: vi.fn(async () => {}) }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => ({ refresh }) }));
vi.mock("next/link", () => ({ default: ({ children, onNavigate, ...props }: { children: ReactNode; onNavigate?: unknown }) => { void onNavigate; return <a {...props}>{children}</a>; } }));

let host: HTMLDivElement;
let root: Root;
const groups = [
    { id: "services", label: "서비스", add: "+ 서비스 추가", title: "svc-title-" },
    { id: "equipment", label: "장비 묶음", add: "+ 장비 묶음 추가", title: "eq-title-" },
    { id: "memberships", label: "회원권", add: "+ 회원권 추가", title: "mem-label-" },
] as const;
const keys = ["new-existing-source", `${"long-prefix-".repeat(4)}원본 % [key] `];
const rows = (id: string) => db.doc[id] as Raw[];
const savedKeys = (id: string) => rows(id).map((row) => row._key);
const payload = () => JSON.parse(host.querySelector<HTMLInputElement>('input[name="dataJson"]')!.value) as Record<string, Raw[]>;
function draw() { root.render(<StudioInfoForm data={mergeInfoForManage(db.doc)} revision={db.doc._rev as string} />); }
async function labelClick(label: string) {
    const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    expect(button, label).toBeTruthy(); await act(async () => button.click());
}
async function textClick(text: string) {
    const button = Array.from(host.querySelectorAll("button")).find((el) => el.textContent === text)!;
    expect(button, text).toBeTruthy(); await act(async () => button.click());
}
async function change(selector: string, value: string) {
    const field = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    expect(field, selector).toBeTruthy();
    await act(async () => {
        const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(field, value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
async function submit() { await act(async () => host.querySelector<HTMLFormElement>("form[data-manage-form]")!.requestSubmit()); }
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    db.doc = {
        _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...FALLBACK_INFO,
        services: keys.map((_key, i) => ({ _key, title: `서비스 ${i}`, price: "1000", priceUnit: "원", points: [`내용 ${i}`] })),
        equipment: keys.map((_key, i) => ({ _key, title: `장비 ${i}`, items: [`장비명 ${i}`] })),
        memberships: keys.map((_key, i) => ({ _key, num: String(i + 1), label: `회원권 ${i}`, sub: "Pass", price: "1000" })),
    };
    db.fields = {}; db.saves = 0;
    client.getDocument.mockImplementation(async () => db.doc._id ? structuredClone(db.doc) : undefined);
    client.create.mockImplementation(async (fields: Raw) => {
        db.saves++; db.doc = { ...structuredClone(fields), _rev: "v1" }; return db.doc;
    });
    client.patch.mockReturnValue(patch);
    patch.ifRevisionId.mockImplementation((revision: string) => { db.revision = revision; return patch; });
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.commit.mockImplementation(async () => {
        if (db.revision !== db.doc._rev) throw { statusCode: 409 };
        db.saves++; db.doc = { ...db.doc, ...structuredClone(db.fields), _rev: `v${db.saves + 1}` }; return db.doc;
    });
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
    refresh.mockImplementation(draw);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe("Studio 안내의 실제 폼→액션→재조회 키 왕복", () => {
    it.each(groups)("$id — 재정렬·반복 저장·삭제·추가 후에도 원본과 새 키를 구분한다", async ({ id, label, add, title }) => {
        const original = structuredClone(db.doc);
        await act(async () => draw());
        expect(payload()[id].map((row) => row._key)).toEqual(keys);
        await labelClick(`${label} 2 위로`);
        expect(payload()[id].map((row) => row._key)).toEqual([...keys].reverse());
        await submit(); expect(savedKeys(id)).toEqual([...keys].reverse());
        expect(payload()[id].map((row) => row._key)).toEqual(savedKeys(id));
        await change("#membershipNote", "두 번째 저장"); await submit();
        expect(savedKeys(id)).toEqual([...keys].reverse());
        await labelClick(`${label} 1 지우기`); await textClick(add);
        expect(payload()[id]).toHaveLength(2);
        expect(payload()[id][0]._key).toBe(keys[0]);
        expect(Object.hasOwn(payload()[id][1], "_key")).toBe(false);
        await change(`[id^="${title}new-"]`, "새 항목");
        if (id === "memberships") await change('[id^="mem-price-new-"]', "2000");
        await submit();
        const afterCreate = savedKeys(id);
        expect(afterCreate[0]).toBe(keys[0]);
        expect(typeof afterCreate[1]).toBe("string"); expect(afterCreate[1]).not.toMatch(/^new-/);
        expect(payload()[id].map((row) => row._key)).toEqual(afterCreate);
        await change("#membershipNote", "새 키 재저장"); await submit();
        expect(savedKeys(id)).toEqual(afterCreate);
        for (const group of groups.filter((group) => group.id !== id)) expect(db.doc[group.id]).toEqual(original[group.id]);
        expect(refresh).toHaveBeenCalledTimes(4); expect(db.saves).toBe(4);
    });
    it("서로 다른 배열이 같은 키를 써도 카드 접기·펼치기 상태는 독립적이다", async () => {
        await act(async () => draw());
        await labelClick("서비스 1 펼치기");
        expect(host.querySelector('button[aria-label="서비스 1 접기"]')).toBeTruthy();
        expect(host.querySelector('button[aria-label="장비 묶음 1 펼치기"]')).toBeTruthy();
        expect(host.querySelector('button[aria-label="회원권 1 펼치기"]')).toBeTruthy();
        const ids = Array.from(host.querySelectorAll("[id]")).map((el) => el.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.some((id) => id.includes(keys[1]))).toBe(false);
    });
    it("원본 키가 없는 기본 항목은 처음 저장 때만 서버에서 키를 발급받는다", async () => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...FALLBACK_INFO };
        await act(async () => draw());
        expect(payload().services.every((row) => !Object.hasOwn(row, "_key"))).toBe(true);
        await change("#membershipNote", "첫 저장"); await submit();
        const first = savedKeys("services");
        expect(first.every((key) => typeof key === "string" && !key.startsWith("new-"))).toBe(true);
        await change("#membershipNote", "두 번째 저장"); await submit();
        expect(savedKeys("services")).toEqual(first);
    });
    it("고정 문서가 아예 없어도 생성 후 재조회에서 서버 발급 키를 유지한다", async () => {
        db.doc = {};
        await act(async () => draw());
        await change("#membershipNote", "최초 생성"); await submit();
        expect(client.create).toHaveBeenCalledTimes(1);
        expect(db.doc).toMatchObject({ _id: "studioInfo", _type: "studioInfo" });
        const first = savedKeys("services");
        expect(payload().services.map((row) => row._key)).toEqual(first);
        await change("#membershipNote", "생성 후 수정"); await submit();
        expect(savedKeys("services")).toEqual(first);
        expect(client.create).toHaveBeenCalledTimes(1); expect(patch.commit).toHaveBeenCalledTimes(1);
    });
    it.each(groups)("$id의 기존 중복 키는 UI에서 충돌시키거나 자동 재발급하지 않고 저장을 막는다", async ({ id, label }) => {
        rows(id)[1]._key = rows(id)[0]._key;
        const before = structuredClone(db.doc);
        await act(async () => draw());
        await change("#membershipNote", "중복 키 저장 시도"); await submit();
        expect(db.saves).toBe(0); expect(db.doc).toEqual(before);
        expect(host.textContent).toContain("중복되어 저장하지 않았어요");
        expect(host.textContent).toContain("저장하지 않은 변경사항");
        expect(refresh).not.toHaveBeenCalled();
        await labelClick(`${label} 2 지우기`); await submit();
        expect(savedKeys(id)).toEqual([keys[0]]); expect(db.saves).toBe(1);
    });
});
