import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSpace, createSpace } from "./actions";
import { saveStudioInfo } from "./info/actions";
import { revalidatePath, updateTag } from "next/cache";
import { studioInfoPayload, studioSpacePayload } from "@/test/studio-payloads";
import { studioInfoShapeError, studioSpaceShapeError } from "@/lib/studio-content-shape";

type Raw = Record<string, unknown>;
const { auth, navigate, client, patch, db } = vi.hoisted(() => ({
    auth: vi.fn(), navigate: vi.fn(),
    client: { getDocument: vi.fn(), assets: { upload: vi.fn() }, create: vi.fn(), fetch: vi.fn(), patch: vi.fn() },
    patch: { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() },
    db: { doc: {} as Raw, fields: {} as Raw, unset: [] as string[] },
}));
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: () => client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigate }));
const redirectSignal = new Error("test redirect");
beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.doc = { _id: "room", _type: "studioSpace", _rev: "v1", name: "기존 이름", images: [{ _key: "saved", asset: { _ref: "image-existing" } }], prices: [{ _key: "p", label: "가격", value: "1000", unit: "원" }], features: ["기존 특징"], notes: ["기존 안내"] };
    db.fields = {};
    db.unset = [];
    auth.mockResolvedValue(undefined);
    client.getDocument.mockImplementation(async () => db.doc);
    client.assets.upload.mockResolvedValue({ _id: "image-uploaded" });
    client.fetch.mockResolvedValue([]);
    client.patch.mockReturnValue(patch);
    patch.ifRevisionId.mockReturnValue(patch);
    patch.set.mockImplementation((fields: Raw) => { db.fields = fields; return patch; });
    patch.unset.mockImplementation((fields: string[]) => { db.unset = fields; return patch; });
    patch.commit.mockImplementation(async () => { Object.assign(db.doc, db.fields, { _rev: "v2" }); for (const field of db.unset) delete db.doc[field]; return db.doc; });
    client.create.mockImplementation(async (fields: Raw) => { db.fields = fields; return { _id: fields._id ?? "created", _type: fields._type, _rev: "v1" }; });
    navigate.mockImplementation(() => { throw redirectSignal; });
});
afterEach(() => vi.restoreAllMocks());
function form(jsonName: string, value: string | undefined): FormData {
    const data = new FormData(); data.set("documentId", "room"); data.set("name", "ROOM A");
    if (value !== undefined) data.set(jsonName, value);
    data.set("spaceImage_new-photo", new File(["mock image"], "photo.png", { type: "image/png" }));
    return data;
}
function noWrites() {
    expect(client.assets.upload).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
    expect(client.create).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
}
const missing = Symbol("missing");
const sourceGroups = [
    { field: "prices", json: "listsJson", action: saveSpace, payload: () => studioSpacePayload({ prices: [{ _key: "saved", label: "기본", value: "1000", unit: "원" }] }) },
    ...["services", "equipment", "memberships"].map((field) => ({ field, json: "dataJson", action: saveStudioInfo, payload: () => studioInfoPayload({ [field]: field === "services" ? [{ _key: "saved", title: "서비스", price: "1000", priceUnit: "원", points: [] }] : field === "equipment" ? [{ _key: "saved", title: "장비", items: [] }] : [{ _key: "saved", num: "1", label: "회원", sub: "Pass", price: "1000" }] }) })),
];
describe.each(sourceGroups)("$field 원본 확장 정보", ({ field, json, action, payload }) => {
    function setup() {
        const input = payload();
        db.doc = { _id: field === "prices" ? "room" : "studioInfo", _type: field === "prices" ? "studioSpace" : "studioInfo", _rev: "v1", ...structuredClone(input) };
        return input;
    }
    it.each([null, false, "", { private: "DO_NOT_ECHO" }])("편집기가 모르는 원본 값 #%#는 저장 전에 차단한다", async (extra) => {
        const input = setup(); (db.doc[field] as Raw[])[0].custom = extra;
        const before = JSON.stringify(db.doc);
        const data = form(json, JSON.stringify(input));
        if (field === "prices") {
            (input.images as Raw[]).push({ _key: "new-photo" }); data.set(json, JSON.stringify(input));
        }
        expect(await action(null, data)).toMatchObject({ ok: false, error: expect.stringContaining("/admin"), fields: [{ id: field }] });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before);
    });
    it("원본의 _type도 실제 저장하지 않는다면 조용히 지우지 않는다", async () => {
        const input = setup(); (db.doc[field] as Raw[])[0]._type = "customRow";
        const result = await action(null, form(json, JSON.stringify(input)));
        expect(result).toMatchObject({ ok: false, fields: [{ id: field }] }); noWrites();
    });
    it("키 없는 원본의 확장 정보는 행 위치로 추측하지 않는다", async () => {
        const input = setup(); const row = (db.doc[field] as Raw[])[0]; delete row._key; row.custom = "원본";
        expect(await action(null, form(json, JSON.stringify(input)))).toMatchObject({ ok: false, fields: [{ id: field }] }); noWrites();
    });
    it("키 없는 원본은 빈 제출 목록도 삭제로 추측하지 않는다", async () => {
        const input = setup(); const row = (db.doc[field] as Raw[])[0]; delete row._key; row.custom = "원본"; input[field] = [];
        expect(await action(null, form(json, JSON.stringify(input)))).toMatchObject({ ok: false, fields: [{ id: field }] }); noWrites();
    });
    it.each(["__proto__", "constructor", "toString"])("특수 필드 %s도 원문 노출 없이 차단한다", async (name) => {
        const input = setup(); Object.defineProperty((db.doc[field] as Raw[])[0], name, { value: "DO_NOT_ECHO", enumerable: true });
        const result = await action(null, form(json, JSON.stringify(input)));
        expect(result).toMatchObject({ ok: false, fields: [{ id: field }] });
        expect(JSON.stringify(result)).not.toContain(name); expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); noWrites();
    });
    it("유효한 원본 키가 제출 목록에서 빠진 명시적 삭제는 허용한다", async () => {
        const input = setup(); (db.doc[field] as Raw[])[0].custom = "원본"; input[field] = [];
        expect(await action(null, form(json, JSON.stringify(input)))).toEqual({ ok: true });
        expect(db.doc[field]).toEqual([]);
    });
    it("클라이언트가 보낸 확장 필드를 원본으로 간주하거나 저장하지 않는다", async () => {
        const input = setup(); (input[field] as Raw[])[0].custom = { fake: true };
        db.doc.topLevelCustom = { keep: true };
        expect(await action(null, form(json, JSON.stringify(input)))).toEqual({ ok: true });
        expect((db.doc[field] as Raw[])[0]).not.toHaveProperty("custom");
        expect(db.doc.topLevelCustom).toEqual({ keep: true });
    });
    it("new-로 시작하는 원본 키도 유지한다", async () => {
        const input = setup(); (input[field] as Raw[])[0]._key = "new-original"; (db.doc[field] as Raw[])[0]._key = "new-original";
        expect(await action(null, form(json, JSON.stringify(input)))).toEqual({ ok: true });
        expect((db.doc[field] as Raw[])[0]._key).toBe("new-original");
    });
});
it("가격 칸 비우기를 원본 확장 필드 삭제로 해석하지 않는다", async () => {
    db.doc.prices = [{ _key: "p", label: "기본", value: "1000", unit: "원", custom: "원본" }];
    const input = studioSpacePayload({ prices: [{ _key: "p", label: "", value: "", unit: "" }] });
    expect(await saveSpace(null, form("listsJson", JSON.stringify(input)))).toMatchObject({ ok: false, fields: [{ id: "prices" }] }); noWrites();
});
it("안내 원본을 한 번만 읽고 검사한 revision으로 패치한다", async () => {
    db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
    expect(await saveStudioInfo(null, form("dataJson", JSON.stringify(studioInfoPayload())))).toEqual({ ok: true });
    expect(client.getDocument).toHaveBeenCalledExactlyOnceWith("studioInfo");
    expect(patch.ifRevisionId).toHaveBeenCalledExactlyOnceWith("v1");
});
it("안내 검증 뒤 동시 변경이 발생하면 덮어쓰지 않는다", async () => {
    db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
    client.getDocument.mockImplementation(async () => structuredClone(db.doc));
    patch.ifRevisionId.mockImplementation((revision: string) => { expect(revision).toBe("v1"); db.doc._rev = "v-later"; db.doc.concurrent = true; return patch; });
    patch.commit.mockRejectedValue({ statusCode: 409 });
    expect(await saveStudioInfo(null, form("dataJson", JSON.stringify(studioInfoPayload())))).toMatchObject({ ok: false, error: expect.stringContaining("내용이 바뀌었어요") });
    expect(db.doc._rev).toBe("v-later"); expect(db.doc.concurrent).toBe(true);
    expect(client.getDocument).toHaveBeenCalledTimes(1); expect(updateTag).not.toHaveBeenCalled();
});
const spaceRows = [
    ...["prices", "images", "features", "notes"].flatMap((field) => [missing, null, "not-array", 1, {}].map((value) => ({ label: `${field} ${String(value)}`, field, make: () => {
        const payload = studioSpacePayload();
        if (value === missing) delete payload[field]; else payload[field] = value;
        return payload;
    } }))),
    ...[null, [], "bad-row", 1, {}].map((value) => ({ label: `가격 항목 ${JSON.stringify(value)}`, field: "prices", make: () => ({ ...studioSpacePayload(), prices: [value] }) })),
    ...["label", "value", "unit"].flatMap((field) => [missing, null, 1, []].map((value) => ({ label: `가격 ${field} ${String(value)}`, field: "prices", make: () => {
        const row: Raw = { _key: "price", label: "기본", value: "1000", unit: "원" };
        if (value === missing) delete row[field]; else row[field] = value;
        return { ...studioSpacePayload(), prices: [row] };
    } }))),
    ...[null, [], "image-row", 1, {}, { _key: null }, { _key: "" }, { _key: 1 }].map((value) => ({ label: `사진 항목 ${JSON.stringify(value)}`, field: "images", make: () => ({ ...studioSpacePayload(), images: [value] }) })),
    ...["features", "notes"].flatMap((field) => [null, {}, [], 1].map((value) => ({ label: `${field} 항목 ${JSON.stringify(value)}`, field, make: () => ({ ...studioSpacePayload(), [field]: [value] }) }))),
];
describe.each([{ label: "공간 수정", action: saveSpace }, { label: "공간 생성", action: createSpace }])("$label의 JSON 구조", ({ action }) => {
    it.each([undefined, "", "{bad", "null", "[]", "1", '"text"', "{}"])("불완전한 최상위 입력 #%#로 목록을 비우지 않는다", async (value) => {
        const before = JSON.stringify(db.doc);
        expect(await action(null, form("listsJson", value))).toMatchObject({ ok: false });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before);
    });
    it.each(spaceRows)("$label은 빈 목록으로 대체하지 않는다", async ({ make, field }) => {
        const before = JSON.stringify(db.doc);
        const payload = make(); const raw = JSON.stringify(payload);
        const result = await action(null, form("listsJson", raw));
        expect(result).toMatchObject({ ok: false, fields: [{ id: field }] });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before); expect(JSON.stringify(payload)).toBe(raw);
    });
});

const infoRows = [
    ...["services", "equipment", "memberships", "amenities"].flatMap((field) => [missing, null, "bad", {}].map((value) => ({ label: `${field} ${String(value)}`, field, make: () => {
        const payload = studioInfoPayload(); if (value === missing) delete payload[field]; else payload[field] = value; return payload;
    } }))),
    ...["membershipNote", "guidelinesIntro", "parkingWarning", "parkingDetail", "parkingFeeLabel", "parkingFee", "cctvTitle", "cctvDetail", "dutyText", "dutyWarning"].flatMap((field) => [missing, null, 1, []].map((value) => ({ label: `${field} ${String(value)}`, field, make: () => {
        const payload = studioInfoPayload(); if (value === missing) delete payload[field]; else payload[field] = value; return payload;
    } }))),
    ...["services", "equipment", "memberships"].flatMap((field) => [null, [], 1, "bad", {}].map((value) => ({ label: `${field} 항목 ${JSON.stringify(value)}`, field, make: () => ({ ...studioInfoPayload(), [field]: [value] }) }))),
    ...([ ["services", "title"], ["services", "price"], ["services", "priceUnit"], ["services", "points"], ["equipment", "title"], ["equipment", "items"], ["memberships", "num"], ["memberships", "label"], ["memberships", "sub"], ["memberships", "price"] ] as const).flatMap(([group, field]) => [missing, null, 1].map((value) => ({ label: `${group} ${field} ${String(value)}`, field: group, make: () => {
        const payload = studioInfoPayload(); const rows = payload[group] as Raw[];
        if (value === missing) delete rows[0][field]; else rows[0][field] = value;
        return payload;
    } }))),
    ...([ ["services", "points"], ["equipment", "items"] ] as const).flatMap(([group, field]) => [null, {}, 1].map((value) => ({ label: `${group} ${field} 항목 ${JSON.stringify(value)}`, field: group, make: () => {
        const payload = studioInfoPayload(); (payload[group] as Raw[])[0][field] = [value]; return payload;
    } }))),
    ...[null, {}, [], 1].map((value) => ({ label: `편의시설 항목 ${JSON.stringify(value)}`, field: "amenities", make: () => ({ ...studioInfoPayload(), amenities: [value] }) })),
];
describe("Studio 안내 JSON 구조", () => {
    it.each([undefined, "", "{bad", "null", "[]", "1", '"text"', "{}"])("불완전한 최상위 입력 #%#로 설정을 비우지 않는다", async (value) => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
        const before = JSON.stringify(db.doc);
        expect(await saveStudioInfo(null, form("dataJson", value))).toMatchObject({ ok: false });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before);
    });
    it.each(infoRows)("$label은 빈 값으로 저장하지 않는다", async ({ make, field }) => {
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
        const before = JSON.stringify(db.doc);
        const result = await saveStudioInfo(null, form("dataJson", JSON.stringify(make())));
        expect(result).toMatchObject({ ok: false, fields: [{ id: field }] });
        noWrites(); expect(JSON.stringify(db.doc)).toBe(before);
    });
});

describe("명시적인 비우기와 정상 스냅샷", () => {
    it("공간 수정에서 네 개의 명시적인 빈 배열은 목록 삭제 의도로 처리한다", async () => {
        expect(await saveSpace(null, form("listsJson", JSON.stringify(studioSpacePayload())))).toEqual({ ok: true });
        expect(db.doc).toMatchObject({ prices: [], features: [], images: [], _rev: "v2" });
        expect(db.doc).not.toHaveProperty("notes");
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(updateTag).toHaveBeenCalledExactlyOnceWith("studioSpace");
    });
    it("공간 생성에서도 완전한 빈 목록 스냅샷을 허용한다", async () => {
        await expect(createSpace(null, form("listsJson", JSON.stringify(studioSpacePayload())))).rejects.toBe(redirectSignal);
        expect(db.fields).toMatchObject({ prices: [], features: [], images: [] });
        expect(client.assets.upload).not.toHaveBeenCalled();
        expect(client.create).toHaveBeenCalledTimes(1);
    });
    it("안내의 명시적인 빈 문자열·배열은 그대로 저장하고 기본값을 복원하지 않는다", async () => {
        const payload = studioInfoPayload();
        for (const field of Object.keys(payload)) payload[field] = Array.isArray(payload[field]) ? [] : "";
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
        expect(await saveStudioInfo(null, form("dataJson", JSON.stringify(payload)))).toEqual({ ok: true });
        expect(db.fields).toEqual(payload);
    });
    it("안내 문구 하나를 명시적으로 비우면서 다른 문구는 유지할 수 있다", async () => {
        const payload = studioInfoPayload({ membershipNote: "" });
        db.doc = { _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...studioInfoPayload() };
        expect(await saveStudioInfo(null, form("dataJson", JSON.stringify(payload)))).toEqual({ ok: true });
        expect(db.fields.membershipNote).toBe(""); expect(db.fields.parkingDetail).toBe(payload.parkingDetail);
    });
    it.each(["save", "create", "info"] as const)("%s는 JSON 파일을 문자열로 강제 변환하지 않는다", async (area) => {
        const data = form(area === "info" ? "dataJson" : "listsJson", undefined);
        data.set(area === "info" ? "dataJson" : "listsJson", new File(["{}"], "data.json", { type: "application/json" }));
        const action = area === "info" ? saveStudioInfo : area === "create" ? createSpace : saveSpace;
        expect(await action(null, data)).toMatchObject({ ok: false }); noWrites();
    });
    it.each(["save", "create", "info"] as const)("%s는 구조 검사보다 인증을 먼저 처리한다", async (area) => {
        auth.mockRejectedValue(new Error("로그인이 필요해요"));
        const action = area === "info" ? saveStudioInfo : area === "create" ? createSpace : saveSpace;
        expect(await action(null, form(area === "info" ? "dataJson" : "listsJson", "{}"))).toMatchObject({ ok: false, error: "로그인이 필요해요" });
        expect(client.getDocument).not.toHaveBeenCalled(); noWrites();
    });
    it("읽지 못한 필드를 예외 없이 거부하며 정상 원본을 변경하지 않는다", () => {
        const space = studioSpacePayload(); const info = studioInfoPayload();
        const before = JSON.stringify([space, info]);
        expect(studioSpaceShapeError(space)).toBeNull(); expect(studioInfoShapeError(info)).toBeNull();
        expect(JSON.stringify([space, info])).toBe(before);
        expect(studioSpaceShapeError(Object.create(space))).toHaveProperty("error");
        expect(studioInfoShapeError(Object.create(info))).toHaveProperty("error");
    });
    it("배열의 빈 슬롯도 문자열이나 정상 행으로 보지 않는다", () => {
        expect(studioSpaceShapeError({ ...studioSpacePayload(), features: Array(1) })).toHaveProperty("error");
        expect(studioSpaceShapeError({ ...studioSpacePayload(), prices: Array(1) })).toHaveProperty("error");
        expect(studioInfoShapeError({ ...studioInfoPayload(), amenities: Array(1) })).toHaveProperty("error");
    });
});
