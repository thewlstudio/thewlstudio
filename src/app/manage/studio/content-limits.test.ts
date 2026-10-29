import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSpace, createSpace } from "./actions";
import { saveStudioInfo } from "./info/actions";
import { revalidatePath, updateTag } from "next/cache";
import { FALLBACK_INFO } from "@/lib/studio-info";
import { studioSpacePayload, studioInfoPayload } from "@/test/studio-payloads";

type Raw = Record<string, unknown>;
const { auth, navigate, client, patch, db } = vi.hoisted(() => ({
    auth: vi.fn(), navigate: vi.fn(),
    client: { getDocument: vi.fn(), assets: { upload: vi.fn() }, create: vi.fn(), fetch: vi.fn(), patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const redirectSignal = new Error("test redirect");
beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "room", _type: "studioSpace", _rev: "v1", name: "기존 이름", images: [] };
    db.fields = {};
    auth.mockResolvedValue(undefined);
    client.getDocument.mockImplementation(async () => db.doc);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.fetch.mockResolvedValue([]);
    client.patch.mockReturnValue(patch);
    patch.ifRevisionId.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.unset.mockReturnValue(patch);
    patch.commit.mockResolvedValue({ _id: "room" });
    client.create.mockImplementation(async (fields: Raw) => { db.fields = fields; return { _id: "created" }; });
    navigate.mockImplementation(() => { throw redirectSignal; });
});
afterEach(() => vi.restoreAllMocks());
const repeated = (n: number) => Array(n).fill("항목");
const text = (n: number) => "가".repeat(n);

const spaceCases = [
    ...(["name", "subtitle", "description"] as const).map((field) => ({ label: field, max: field === "description" ? 5000 : 300, field, make: (n: number) => ({ [field]: text(n) }), lists: false })),
    ...(["label", "value", "unit"] as const).map((field) => ({ label: `가격 ${field}`, max: 50, field: "prices", make: (n: number) => ({ prices: [{ _key: "price", label: "기본", [field]: text(n) }] }), lists: true })),
    { label: "가격 개수", max: 10, field: "prices", make: (n: number) => ({ prices: Array.from({ length: n }, (_, i) => ({ _key: `price-${i}`, label: `가격 ${i}`, value: "1000" })) }), lists: true },
    ...(["features", "notes"] as const).flatMap((field) => [
        { label: `${field} 개수`, max: 50, field, make: (n: number) => ({ [field]: repeated(n) }), lists: true },
        { label: `${field} 글자 수`, max: 300, field, make: (n: number) => ({ [field]: [text(n)] }), lists: true },
    ]),
    { label: "사진 개수", max: 20, field: "images", make: (n: number) => ({ images: Array.from({ length: n }, (_, i) => ({ _key: `new-photo-${i}` })) }), lists: true },
];
const infoCases = [
    ...Object.entries({ membershipNote: 3000, guidelinesIntro: 3000, parkingWarning: 300, parkingDetail: 3000, parkingFeeLabel: 50, parkingFee: 300, cctvTitle: 300, cctvDetail: 3000, dutyText: 3000, dutyWarning: 300 }).map(([field, max]) => ({ label: field, field, max, make: (n: number) => ({ [field]: text(n) }) })),
    { label: "서비스 개수", field: "services", max: 20, make: (n: number) => ({ services: Array.from({ length: n }, (_, i) => ({ _key: `svc-${i}`, title: "서비스", points: [] })) }) },
    ...Object.entries({ title: 300, price: 100, priceUnit: 100 }).map(([field, max]) => ({ label: `서비스 ${field}`, field: "services", max, make: (n: number) => ({ services: [{ _key: "svc", title: "서비스", [field]: text(n) }] }) })),
    { label: "서비스 안내 개수", field: "services", max: 50, make: (n: number) => ({ services: [{ _key: "svc", title: "서비스", points: repeated(n) }] }) },
    { label: "서비스 안내 길이", field: "services", max: 300, make: (n: number) => ({ services: [{ _key: "svc", title: "서비스", points: [text(n)] }] }) },
    { label: "장비 묶음 개수", field: "equipment", max: 20, make: (n: number) => ({ equipment: Array.from({ length: n }, (_, i) => ({ _key: `eq-${i}`, title: "장비", items: [] })) }) },
    { label: "장비 제목", field: "equipment", max: 300, make: (n: number) => ({ equipment: [{ _key: "eq", title: text(n) }] }) },
    { label: "장비 항목 개수", field: "equipment", max: 50, make: (n: number) => ({ equipment: [{ _key: "eq", title: "장비", items: repeated(n) }] }) },
    { label: "장비 항목 길이", field: "equipment", max: 300, make: (n: number) => ({ equipment: [{ _key: "eq", title: "장비", items: [text(n)] }] }) },
    { label: "멤버십 개수", field: "memberships", max: 20, make: (n: number) => ({ memberships: Array.from({ length: n }, (_, i) => ({ _key: `mem-${i}`, label: "회원권", price: "1000" })) }) },
    ...Object.entries({ num: 10, label: 100, sub: 100, price: 50 }).map(([field, max]) => ({ label: `멤버십 ${field}`, field: "memberships", max, make: (n: number) => ({ memberships: [{ _key: "mem", label: "회원권", price: "1000", [field]: text(n) }] }) })),
    { label: "편의시설 개수", field: "amenities", max: 50, make: (n: number) => ({ amenities: repeated(n) }) },
    { label: "편의시설 길이", field: "amenities", max: 300, make: (n: number) => ({ amenities: [text(n)] }) },
];

function spaceForm(values: Raw, lists: boolean): FormData {
    const form = new FormData();
    form.set("documentId", "room");
    form.set("name", "ROOM A");
    const payload = studioSpacePayload({ images: [{ _key: "new-photo" }], ...(lists ? values : {}) });
    form.set("listsJson", JSON.stringify(payload));
    if (!lists) for (const [key, value] of Object.entries(values)) form.set(key, String(value));
    for (const image of payload.images as { _key: string }[]) form.set(`spaceImage_${image._key}`, new File(["mock image"], "photo.png", { type: "image/png" }));
    return form;
}
function noWrites() {
    expect(client.assets.upload).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
    expect(client.create).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
}
async function runSpace(action: typeof saveSpace, form: FormData) {
    try { return await action(null, form); } catch (error) { if (error !== redirectSignal) throw error; return { ok: true }; }
}
describe.each([{ label: "수정", action: saveSpace }, { label: "생성", action: createSpace }])("Studio 공간 $label 한도", ({ action }) => {
    it.each(spaceCases)("$label — 초과는 저장하지 않고 경계값은 그대로 저장한다", async ({ max, make, lists, field }) => {
        const before = JSON.stringify(db.doc);
        const invalid = await runSpace(action, spaceForm(make(max + 1), lists));
        expect(invalid).toMatchObject({ ok: false, fields: [{ id: field }] });
        expect("error" in invalid && invalid.error).toContain("내용은 저장하지 않았어요");
        noWrites();
        expect(JSON.stringify(db.doc)).toBe(before);
        expect(await runSpace(action, spaceForm(make(max), lists))).toEqual({ ok: true });
        if (field === "images") expect((db.fields.images as unknown[]).length).toBe(max);
        else expect(db.fields).toMatchObject(make(max));
    });
});
describe("Studio 안내 한도", () => {
    it.each(infoCases)("$label — 초과는 저장하지 않고 경계값은 그대로 저장한다", async ({ max, make, field }) => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...FALLBACK_INFO };
        const before = JSON.stringify(db.doc);
        const form = new FormData();
        form.set("dataJson", JSON.stringify(studioInfoPayload(make(max + 1))));
        const invalid = await saveStudioInfo(null, form);
        expect(invalid).toMatchObject({ ok: false, fields: [{ id: field }] });
        expect("error" in invalid && invalid.error).toContain("내용은 저장하지 않았어요");
        noWrites();
        expect(JSON.stringify(db.doc)).toBe(before);
        form.set("dataJson", JSON.stringify(studioInfoPayload(make(max))));
        expect(await saveStudioInfo(null, form)).toEqual({ ok: true });
        expect(db.fields).toMatchObject(make(max));
    });
});

describe("기존 정리·필수 값·키 정책 유지", () => {
    it("공간은 CRLF를 통일한 길이로 검사하고 앞뒤 공백·빈 줄 정리를 유지한다", async () => {
        const description = "가\r\n".repeat(2500);
        const form = spaceForm({ features: ["", "   ", " 유지\r\n문구 "], notes: [] }, true);
        form.set("description", description);
        expect(await saveSpace(null, form)).toEqual({ ok: true });
        expect(db.fields).toMatchObject({ description: description.replace(/\r\n/g, "\n").trim(), features: ["유지\n문구"] });
        expect(patch.unset).toHaveBeenCalledWith(expect.arrayContaining(["notes", "subtitle"]));
    });
    it("공간은 기존처럼 앞뒤 공백 제거 전의 길이 한도를 검사한다", async () => {
        const form = spaceForm({}, true);
        form.set("name", ` ${text(300)}`);
        expect(await saveSpace(null, form)).toMatchObject({ ok: false, fields: [{ id: "name" }] });
        noWrites();
    });
    it("안내는 CRLF·앞뒤 공백 정리 후 검사하고 정상 개행을 보존한다", async () => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1" };
        const value = `  ${"가\r\n".repeat(1499)}가가  `;
        const form = new FormData(); form.set("dataJson", JSON.stringify({ ...FALLBACK_INFO, membershipNote: value }));
        expect(await saveStudioInfo(null, form)).toEqual({ ok: true });
        expect(db.fields.membershipNote).toBe(value.replace(/\r\n/g, "\n").trim());
    });
    it("안내에서 명시적으로 비운 문자열·목록을 기본값으로 되살리지 않는다", async () => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1" };
        const values = { ...FALLBACK_INFO, services: [], equipment: [], memberships: [], amenities: [], membershipNote: "" };
        const form = new FormData(); form.set("dataJson", JSON.stringify(values));
        expect(await saveStudioInfo(null, form)).toEqual({ ok: true });
        expect(db.fields).toEqual(values);
    });
    it.each([
        { id: "services", rows: [{ _key: "s", title: "" }] },
        { id: "equipment", rows: [{ _key: "e", title: "" }] },
        { id: "memberships", rows: [{ _key: "m", label: "회원권", price: "" }] },
    ])("$id의 필수 값 검사를 유지한다", async ({ id, rows }) => {
        const form = new FormData(); form.set("dataJson", JSON.stringify(studioInfoPayload({ [id]: rows })));
        expect(await saveStudioInfo(null, form)).toMatchObject({ ok: false, fields: [{ id }] });
        noWrites();
    });
    it.each(["services", "equipment", "memberships"] as const)("안내 %s의 중복 키는 쓰기 전에 거부한다", async (id) => {
        const row = { _key: "same", title: "제목", label: "회원권", price: "1000" };
        const form = new FormData(); form.set("dataJson", JSON.stringify(studioInfoPayload({ [id]: [row, row] })));
        expect(await saveStudioInfo(null, form)).toMatchObject({ ok: false, error: expect.stringContaining("중복"), fields: [{ id }] });
        noWrites();
    });
    it("안내 서버도 긴 키의 공통 접두사를 잘라 충돌시키지 않는다", async () => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1" };
        const services = ["first", "second"].map((suffix) => ({ _key: `${"prefix-".repeat(7)}${suffix}`, title: suffix, price: "", priceUnit: "", points: [] }));
        const form = new FormData(); form.set("dataJson", JSON.stringify({ ...FALLBACK_INFO, services }));
        expect(await saveStudioInfo(null, form)).toEqual({ ok: true });
        expect(db.fields.services).toEqual(services);
    });
    it.each(["save", "create", "info"] as const)("%s는 한도 검사보다 인증을 먼저 수행한다", async (area) => {
        auth.mockRejectedValue(new Error("로그인이 필요해요"));
        const form = spaceForm({ name: text(301) }, false);
        form.set("dataJson", JSON.stringify({ membershipNote: text(3001) }));
        const action = area === "info" ? saveStudioInfo : area === "create" ? createSpace : saveSpace;
        expect(await action(null, form)).toMatchObject({ ok: false, error: "로그인이 필요해요" });
        expect(client.getDocument).not.toHaveBeenCalled();
        noWrites();
    });
});
