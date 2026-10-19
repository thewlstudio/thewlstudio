"use server";

import { randomUUID } from "crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent } from "@/lib/manage-upload";
import { sanitizeSections } from "@/lib/crew-sections-server";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LINKS = 10;

function refresh(slug?: string) {
    updateTag("crew");
    revalidatePath("/crew");
    if (slug) revalidatePath(`/crew/${slug}`);
    revalidatePath("/manage/crew");
}

type ParsedBasic = {
    fields: { isActive: boolean; name: string; koName: string; role: string };
};

function parseBasic(formData: FormData): ParsedBasic | { error: string; missing: FieldError[] } {
    const name = String(formData.get("name") ?? "").trim();
    const koName = String(formData.get("koName") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    const missing: FieldError[] = [];
    if (!name) missing.push({ id: "name", label: "영문 이름" });
    if (!koName) missing.push({ id: "koName", label: "한글 이름" });
    if (!role) missing.push({ id: "role", label: "직책/역할" });
    if (missing.length > 0) {
        return { error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`, missing };
    }
    return {
        fields: { isActive: String(formData.get("isActive") ?? "true") === "true", name, koName, role },
    };
}

/**
 * 소셜 링크 행들을 읽어 Sanity 배열로 만든다.
 * 행마다 linkUrl_i / linkIconKeep_i(기존 아이콘 참조) / linkIconFile_i(새 아이콘).
 * URL이 빈 행은 버린다. 잘못된 URL은 오류로 돌려준다.
 */
async function parseLinks(
    client: ReturnType<typeof getWriteClient>,
    formData: FormData,
): Promise<{ links: unknown[] } | { error: string; field: FieldError }> {
    const count = Math.min(Number(formData.get("linkCount") ?? 0) || 0, MAX_LINKS);
    const links: unknown[] = [];
    for (let i = 0; i < count; i++) {
        const url = String(formData.get(`linkUrl_${i}`) ?? "").trim();
        if (!url) continue;
        try {
            const u = new URL(url);
            if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
        } catch {
            return {
                error: `링크 ${i + 1}번의 주소가 올바르지 않습니다. https://로 시작하는 주소를 넣어 주세요.`,
                field: { id: `linkUrl_${i}`, label: `링크 ${i + 1}번 주소` },
            };
        }
        const uploaded = await uploadImageIfPresent(client, formData.get(`linkIconFile_${i}`) as File | null);
        const keep = String(formData.get(`linkIconKeep_${i}`) ?? "").trim();
        const iconImage =
            uploaded ??
            (keep ? { _type: "image" as const, asset: { _type: "reference" as const, _ref: keep } } : undefined);
        // 기존 행은 원래 _key를 유지한다(새로 추가한 행만 새 키 발급)
        const prevKey = String(formData.get(`linkKey_${i}`) ?? "").trim();
        links.push({ _key: prevKey || randomUUID().slice(0, 12), url, ...(iconImage ? { iconImage } : {}) });
    }
    return { links };
}

export async function saveCrew(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 크루를 찾을 수 없습니다." };

        const parsed = parseBasic(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.missing };

        const parsedLinks = await parseLinks(client, formData);
        if ("error" in parsedLinks) {
            return { ok: false, error: parsedLinks.error, fields: [parsedLinks.field] };
        }

        const patch: Record<string, unknown> = { ...parsed.fields, links: parsedLinks.links };

        // 프로필 섹션: 폼이 sectionsJson을 보낸 경우에만 배열 전체를 교체한다.
        // (보내지 않으면 patch에 넣지 않아 기존 섹션이 그대로 보존된다)
        const sectionsJson = formData.get("sectionsJson");
        if (typeof sectionsJson === "string" && sectionsJson) {
            let payload: unknown;
            try {
                payload = JSON.parse(sectionsJson);
            } catch {
                return { ok: false, error: "섹션 정보를 읽지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요." };
            }
            const existing = await client.fetch<Record<string, unknown>[] | null>(
                `*[_id == $id][0].sections`,
                { id: documentId },
            );
            const cleaned = sanitizeSections(payload, existing ?? []);
            if ("error" in cleaned) {
                return { ok: false, error: cleaned.error, fields: [{ id: "sections", label: "프로필 섹션" }] };
            }
            patch.sections = cleaned.sections;
        }
        const uploaded = await uploadImageIfPresent(client, formData.get("imageFile") as File | null);
        if (uploaded) patch.image = uploaded;

        await client.patch(documentId).set(patch).commit();
        const slug = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, { id: documentId });
        refresh(slug ?? undefined);
        return { ok: true };
    } catch (err) {
        console.error("[saveCrew]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}

export async function createCrew(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        const client = getWriteClient();

        const parsed = parseBasic(formData);
        const missing: FieldError[] = "error" in parsed ? [...parsed.missing] : [];
        const slug = String(formData.get("slug") ?? "").trim();
        if (!slug) missing.push({ id: "slug", label: "주소(영문)" });
        else if (!SLUG_RE.test(slug)) {
            return {
                ok: false,
                error: "주소는 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요. (예: vocal-scon)",
                fields: [{ id: "slug", label: "주소(영문)" }],
            };
        }
        const imageFile = formData.get("imageFile") as File | null;
        if (!imageFile || imageFile.size === 0) missing.push({ id: "imageFile", label: "프로필 사진" });
        if (missing.length > 0 || "error" in parsed) {
            return { ok: false, error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`, fields: missing };
        }

        const dup = await client.fetch<number>(`count(*[_type == "crew" && slug.current == $slug])`, { slug });
        if (dup > 0) {
            return { ok: false, error: "이미 쓰고 있는 주소예요. 다른 주소를 입력해 주세요.", fields: [{ id: "slug", label: "주소(영문)" }] };
        }

        const parsedLinks = await parseLinks(client, formData);
        if ("error" in parsedLinks) return { ok: false, error: parsedLinks.error, fields: [parsedLinks.field] };

        const [image, orders] = await Promise.all([
            uploadImageIfPresent(client, imageFile),
            client.fetch<number[]>(`*[_type == "crew" && defined(order)].order`),
        ]);
        const order = orders.length > 0 ? Math.max(...orders) + 1 : 0;

        const created = await client.create({
            _type: "crew",
            ...parsed.fields,
            slug: { _type: "slug", current: slug },
            order,
            image,
            links: parsedLinks.links,
        });
        documentId = created._id;
        refresh(slug);
    } catch (err) {
        console.error("[createCrew]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
    redirect(`/manage/crew/${documentId}`);
}

export async function moveCrewOrder(documentId: string, direction: "up" | "down"): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();
        const all = await client.fetch<Array<{ _id: string; order: number }>>(
            `*[_type == "crew" && !(trashed == true)] | order(order asc) { _id, order }`,
        );
        const index = all.findIndex((c) => c._id === documentId);
        if (index === -1) return { ok: false, error: "크루를 찾을 수 없습니다." };
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= all.length) return { ok: false, error: "더 이상 이동할 수 없습니다." };
        const a = all[index];
        const b = all[swapIndex];
        await client
            .transaction()
            .patch(a._id, { set: { order: b.order } })
            .patch(b._id, { set: { order: a.order } })
            .commit();
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[moveCrewOrder]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "크루를 찾을 수 없습니다." };
        const client = getWriteClient();
        await client.patch(documentId).set({ trashed }).commit();
        const slug = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, { id: documentId });
        refresh(slug ?? undefined);
        return { ok: true };
    } catch (err) {
        console.error("[setTrashed]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteCrew(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreCrew(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}
