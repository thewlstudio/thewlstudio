"use server";

import { randomUUID } from "crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent } from "@/lib/manage-upload";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const LIMITS = { prices: 10, list: 50, images: 20, line: 300, text: 5000 } as const;

function refresh() {
    updateTag("studioSpace");
    revalidatePath("/studio");
    revalidatePath("/manage/studio");
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").slice(0, max) : "");
const lines = (v: unknown) =>
    (Array.isArray(v) ? v.slice(0, LIMITS.list) : []).map((x) => str(x, LIMITS.line).trim()).filter(Boolean);
const key = (v: unknown) => (typeof v === "string" && v && !v.startsWith("new-") ? v.slice(0, 40) : randomUUID().slice(0, 12));

/** 공통 필드 검증 — 저장·생성에서 함께 쓴다 */
function parseCommon(formData: FormData):
    | { ok: true; name: string; subtitle: string; description: string; isActive: boolean; prices: unknown[]; features: string[]; notes: string[]; imagesIn: Raw[] }
    | { ok: false; error: string; fields: FieldError[] } {
    const name = str(formData.get("name"), LIMITS.line).trim();
    if (!name) return { ok: false, error: "이름을 입력해 주세요.", fields: [{ id: "name", label: "이름" }] };

    let payload: Raw = {};
    try {
        const parsed = JSON.parse(String(formData.get("listsJson") ?? "{}"));
        if (isObj(parsed)) payload = parsed;
    } catch {
        return { ok: false, error: "입력 내용을 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요.", fields: [] };
    }

    const prices = (Array.isArray(payload.prices) ? payload.prices.slice(0, LIMITS.prices) : [])
        .filter(isObj)
        .map((p) => ({ _key: key(p._key), label: str(p.label, 50).trim(), value: str(p.value, 50).trim(), unit: str(p.unit, 50).trim() }))
        .filter((p) => p.label || p.value);

    return {
        ok: true,
        name,
        subtitle: str(formData.get("subtitle"), LIMITS.line).trim(),
        description: str(formData.get("description"), LIMITS.text).trim(),
        isActive: String(formData.get("isActive") ?? "true") === "true",
        prices,
        features: lines(payload.features),
        notes: lines(payload.notes),
        imagesIn: (Array.isArray(payload.images) ? payload.images.slice(0, LIMITS.images) : []).filter(isObj),
    };
}

export async function saveSpace(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };

        const c = parseCommon(formData);
        if (!c.ok) return c;

        const existing = await client.fetch<{ images?: Raw[] } | null>(`*[_id == $id][0]{ images }`, { id: documentId });
        if (!existing) return { ok: false, error: "수정할 공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const prevImages = Array.isArray(existing.images) ? existing.images : [];

        // 사진: 기존 _key는 기존 이미지를 그대로 유지(핫스팟 등 포함), 새 사진은 업로드된 파일이 있어야 한다
        const images: unknown[] = [];
        for (const item of c.imagesIn) {
            const clientKey = typeof item._key === "string" ? item._key : "";
            const prev = prevImages.find((p) => p._key === clientKey);
            const uploaded = clientKey ? await uploadImageIfPresent(client, formData.get(`spaceImage_${clientKey}`) as File | null) : null;
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

        let p = client.patch(documentId).set(patch);
        if (unset.length > 0) p = p.unset(unset);
        await p.commit();
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[saveSpace]", err);
        return { ok: false, error: err instanceof Error ? err.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요." };
    }
}

export async function createSpace(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        const client = getWriteClient();
        const kind = String(formData.get("kind") ?? "room") === "lobby" ? "lobby" : "room";
        const c = parseCommon(formData);
        if (!c.ok) return c;

        const images: unknown[] = [];
        for (const item of c.imagesIn) {
            const clientKey = typeof item._key === "string" ? item._key : "";
            const uploaded = clientKey ? await uploadImageIfPresent(client, formData.get(`spaceImage_${clientKey}`) as File | null) : null;
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
        console.error("[createSpace]", err);
        return { ok: false, error: err instanceof Error ? err.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요." };
    }
    redirect(`/manage/studio/${documentId}?created=1`);
}

/** 같은 종류(연습실끼리, 로비끼리) 안에서 위/아래로 한 칸 이동 */
export async function moveSpaceOrder(documentId: string, direction: "up" | "down"): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();
        const target = await client.fetch<{ kind?: string } | null>(`*[_id == $id][0]{ kind }`, { id: documentId });
        if (!target) return { ok: false, error: "공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const kind = target.kind === "lobby" ? "lobby" : "room";
        const all = await client.fetch<Array<{ _id: string; order: number }>>(
            `*[_type == "studioSpace" && !(trashed == true) && select(kind == "lobby" => "lobby", "room") == $kind] | order(order asc) { _id, order }`,
            { kind },
        );
        const index = all.findIndex((s) => s._id === documentId);
        if (index === -1) return { ok: false, error: "공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= all.length) return { ok: false, error: "더 옮길 곳이 없어요." };
        const a = all[index];
        const b = all[swapIndex];
        await client.transaction().patch(a._id, { set: { order: b.order } }).patch(b._id, { set: { order: a.order } }).commit();
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[moveSpaceOrder]", err);
        return { ok: false, error: err instanceof Error ? err.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요." };
    }
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "공간을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        await getWriteClient().patch(documentId).set({ trashed }).commit();
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[setTrashed:space]", err);
        return { ok: false, error: err instanceof Error ? err.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요." };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteSpace(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreSpace(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}
