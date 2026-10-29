"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent, validateManageUploadForm } from "@/lib/manage-upload";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { applyOrder, moveOrder, type OrderRow } from "@/lib/manage-reorder";
import { CONTENT_ORDER, STUDIO_CONTENT_ORDER } from "@/lib/content-order";
import { managedWriteError, requireManagedDocument } from "@/lib/manage-target";
import { isManagedDocumentId } from "@/lib/manage-document-id";
import { arrayKeyError, managedArrayKey as key } from "@/lib/manage-array-keys";
import { studioSpaceLimitError } from "@/lib/studio-content-limits";
import { studioSpaceShapeError } from "@/lib/studio-content-shape";
import { reportError } from "@/lib/error-reporting";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

function refresh() {
    updateTag("studioSpace");
    revalidatePath("/studio");
    revalidatePath("/manage/studio");
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n") : "");
const lines = (v: unknown) =>
    (Array.isArray(v) ? v : []).map((x) => str(x).trim()).filter(Boolean);

/** 공통 필드 검증 — 저장·생성에서 함께 쓴다 */
function parseCommon(formData: FormData):
    | { ok: true; name: string; subtitle: string; description: string; isActive: boolean; prices: unknown[]; features: string[]; notes: string[]; imagesIn: Raw[] }
    | { ok: false; error: string; fields: FieldError[] } {
    const name = str(formData.get("name")).trim();
    if (!name) return { ok: false, error: "이름을 입력해 주세요.", fields: [{ id: "name", label: "이름" }] };

    let payload: Raw;
    try {
        const raw = formData.get("listsJson");
        if (typeof raw !== "string" || !raw) throw new Error();
        const parsed: unknown = JSON.parse(raw);
        const shapeError = studioSpaceShapeError(parsed);
        if (shapeError) return { ok: false, ...shapeError };
        payload = parsed as Raw;
    } catch {
        return { ok: false, error: "입력 내용을 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.", fields: [{ id: "name", label: "공간 입력" }] };
    }
    const limitError = studioSpaceLimitError({ name: formData.get("name"), subtitle: formData.get("subtitle"), description: formData.get("description") }, payload);
    if (limitError) return { ok: false, ...limitError };

    for (const [value, label, prefix] of [[payload.prices, "가격", "price-label-"], [payload.images, "공간 사진", "spaceImage-"]] as const) {
        const error = arrayKeyError(value, label);
        if (error) {
            const first = Array.isArray(value) ? value.find((item) => isObj(item) && typeof item._key === "string" && item._key) : null;
            return { ok: false, error, fields: [{ id: first ? `${prefix}${first._key}` : "name", label }] };
        }
    }

    const prices = (Array.isArray(payload.prices) ? payload.prices : [])
        .filter(isObj)
        .map((p) => ({ _key: key(p._key), label: str(p.label).trim(), value: str(p.value).trim(), unit: str(p.unit).trim() }))
        .filter((p) => p.label || p.value);

    return {
        ok: true,
        name,
        subtitle: str(formData.get("subtitle")).trim(),
        description: str(formData.get("description")).trim(),
        isActive: String(formData.get("isActive") ?? "true") === "true",
        prices,
        features: lines(payload.features),
        notes: lines(payload.notes),
        imagesIn: (Array.isArray(payload.images) ? payload.images : []).filter(isObj),
    };
}

export async function saveSpace(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        validateManageUploadForm(formData);
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };

        const c = parseCommon(formData);
        if (!c.ok) return c;

        const existing = await requireManagedDocument(client, documentId, "studioSpace");
        const prevImages = Array.isArray(existing.images) ? existing.images : [];

        // 사진: 기존 _key는 기존 이미지를 그대로 유지(핫스팟 등 포함), 새 사진은 업로드된 파일이 있어야 한다
        const images: unknown[] = [];
        for (const item of c.imagesIn) {
            const clientKey = typeof item._key === "string" ? item._key : "";
            const prev = prevImages.find((p) => p._key === clientKey);
            const uploaded = clientKey ? await uploadImageIfPresent(client, formData.get(`spaceImage_${clientKey}`)) : null;
            const image = uploaded ?? prev;
            if (!image) continue;
            images.push({ ...(isObj(image) ? image : {}), _key: prev ? String(prev._key) : key(clientKey) });
        }

        const patch: Record<string, unknown> = {
            name: c.name,
            isActive: c.isActive,
            prices: c.prices,
            features: c.features,
            images,
        };
        const unset: string[] = [];
        for (const [k, v] of [["subtitle", c.subtitle], ["description", c.description]] as const) {
            if (v) patch[k] = v;
            else unset.push(k);
        }
        if (c.notes.length > 0) patch.notes = c.notes;
        else unset.push("notes");

        let p = client.patch(documentId).ifRevisionId(existing._rev).set(patch);
        if (unset.length > 0) p = p.unset(unset);
        await p.commit();
        refresh();
        return { ok: true };
    } catch (err) {
        reportError("saveSpace", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

export async function createSpace(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        validateManageUploadForm(formData);
        const client = getWriteClient();
        const kind = String(formData.get("kind") ?? "room") === "lobby" ? "lobby" : "room";
        const c = parseCommon(formData);
        if (!c.ok) return c;

        const images: unknown[] = [];
        for (const item of c.imagesIn) {
            const clientKey = typeof item._key === "string" ? item._key : "";
            const uploaded = clientKey ? await uploadImageIfPresent(client, formData.get(`spaceImage_${clientKey}`)) : null;
            if (uploaded) images.push({ ...uploaded, _key: key(clientKey) });
        }

        const orders = await client.fetch<number[]>(`*[_type == "studioSpace" && defined(order)].order`);
        const order = orders.length > 0 ? Math.max(...orders) + 1 : 0;

        const created = await client.create({
            _type: "studioSpace",
            kind,
            name: c.name,
            ...(c.subtitle ? { subtitle: c.subtitle } : {}),
            ...(c.description ? { description: c.description } : {}),
            prices: c.prices,
            features: c.features,
            ...(c.notes.length > 0 ? { notes: c.notes } : {}),
            images,
            order,
            isActive: c.isActive,
            trashed: false,
        });
        documentId = created._id;
        refresh();
    } catch (err) {
        reportError("createSpace", err);
        return { ok: false, error: managedWriteError(err) };
    }
    redirect(`/manage/studio/${documentId}?created=1`);
}

/** 같은 종류(연습실끼리, 로비끼리) 안에서 위/아래로 한 칸 이동 */
export async function moveSpaceOrder(documentId: string, direction: "up" | "down"): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!isManagedDocumentId(documentId) || (direction !== "up" && direction !== "down")) return { ok: false, error: "옮길 항목과 방향을 확인하지 못했어요. 목록에서 다시 골라 주세요." };
        const client = getWriteClient();
        const target = await requireManagedDocument(client, documentId, "studioSpace");
        const kind = target.kind === "lobby" ? "lobby" : "room";
        const all = await client.fetch<OrderRow[]>(
            `*[_type == "studioSpace" && !(trashed == true) && select(kind == "lobby" => "lobby", "room") == $kind] | order(${CONTENT_ORDER}) { _id, _rev, order }`,
            { kind },
        );
        const result = await moveOrder(client, all, documentId, direction);
        if (!result.ok) return result;
        refresh();
        return { ok: true };
    } catch (err) {
        reportError("moveSpaceOrder", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const client = getWriteClient();
        const current = await requireManagedDocument(client, documentId, "studioSpace");
        await client.patch(documentId).ifRevisionId(current._rev).set({ trashed }).commit();
        refresh();
        return { ok: true };
    } catch (err) {
        reportError("setTrashed:space", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteSpace(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreSpace(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}

/** 목록에서 끌어서 정한 순서를 저장한다. 그룹 경계는 서버에서도 확인한다. */
export async function reorderSpaces(ids: string[]): Promise<SaveResult> {
    try {
        await requireAuth();
        const result = await applyOrder(getWriteClient(), `*[_type == "studioSpace" && !(trashed == true)] | order(${STUDIO_CONTENT_ORDER}) { _id, _rev, order, "group": select(kind == "lobby" => "lobby", "room") }`, {}, ids, true);
        if (result.ok) refresh();
        return result;
    } catch (err) {
        reportError("reorderSpaces", err);
        return { ok: false, error: managedWriteError(err) };
    }
}
