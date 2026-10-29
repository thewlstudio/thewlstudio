"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent, validateManageUploadForm } from "@/lib/manage-upload";
import { sanitizeSections } from "@/lib/crew-sections-server";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { labelsEulReul } from "@/lib/josa";
import { applyOrder, moveOrder, type OrderRow } from "@/lib/manage-reorder";
import { CONTENT_ORDER } from "@/lib/content-order";
import { managedSlug, managedWriteError, requireManagedDocument } from "@/lib/manage-target";
import { isManagedDocumentId } from "@/lib/manage-document-id";
import { externalHttpUrl } from "@/lib/content-urls";
import { publicDetailPath } from "@/lib/public-routes";
import { arrayKeyError, managedArrayKey } from "@/lib/manage-array-keys";
import { reportError } from "@/lib/error-reporting";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LINKS = 10;
const asRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

function refresh(slug?: string) {
    updateTag("crew");
    revalidatePath("/crew");
    const detail = publicDetailPath("crew", slug);
    if (detail) revalidatePath(detail);
    revalidatePath("/sitemap.xml");
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
        return { error: `${labelsEulReul(missing)} 입력해 주세요.`, missing };
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
    existingLinks: unknown[] = [],
): Promise<{ links: unknown[] } | { error: string; field: FieldError }> {
    const count = Number(formData.get("linkCount") ?? 0);
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_LINKS) {
        return { error: `소셜 링크는 최대 ${MAX_LINKS}개까지 넣을 수 있어요. 링크 정보를 확인한 뒤 다시 시도해 주세요.`, field: { id: "linkUrl_0", label: "소셜 링크" } };
    }
    const keyError = arrayKeyError(Array.from({ length: count }, (_, i) => ({ _key: formData.get(`linkKey_${i}`) })), "소셜 링크");
    if (keyError) return { error: keyError, field: { id: "linkUrl_0", label: "소셜 링크" } };
    const links: unknown[] = [];
    for (let i = 0; i < count; i++) {
        const url = String(formData.get(`linkUrl_${i}`) ?? "").trim();
        if (!url) continue;
        if (!externalHttpUrl(url)) {
            return {
                error: `링크 ${i + 1}번의 주소가 올바르지 않아요. 브라우저 주소창의 주소를 복사해 붙여넣어 주세요.`,
                field: { id: `linkUrl_${i}`, label: `링크 ${i + 1}번 주소` },
            };
        }
        const uploaded = await uploadImageIfPresent(client, formData.get(`linkIconFile_${i}`));
        const keep = String(formData.get(`linkIconKeep_${i}`) ?? "").trim();
        const rawKey = formData.get(`linkKey_${i}`);
        const prevKey = typeof rawKey === "string" ? rawKey : "";
        const previous = existingLinks.map(asRecord).find((link) => link?._key === prevKey);
        const previousIcon = asRecord(previous?.iconImage);
        const previousAsset = asRecord(previousIcon?.asset);
        const keptIcon = previousAsset?._ref === keep ? previousIcon : null;
        // 같은 행·같은 에셋을 유지할 때만 서버 원본의 crop/hotspot 등을 보존한다.
        const iconImage =
            uploaded ??
            (keep ? keptIcon ?? { _type: "image" as const, asset: { _type: "reference" as const, _ref: keep } } : undefined);
        // 기존 행은 원래 _key를 유지한다(새로 추가한 행만 새 키 발급)
        links.push({ _key: previous ? prevKey : managedArrayKey(prevKey), url, ...(iconImage ? { iconImage } : {}) });
    }
    return { links };
}

export async function saveCrew(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        validateManageUploadForm(formData);
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 크루를 찾지 못했어요. 목록에서 다시 골라 주세요." };

        const parsed = parseBasic(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.missing };
        const current = await requireManagedDocument(client, documentId, "crew");

        const patch: Record<string, unknown> = { ...parsed.fields };

        // 프로필 섹션: 폼이 sectionsJson을 보낸 경우에만 배열 전체를 교체한다.
        // (보내지 않으면 patch에 넣지 않아 기존 섹션이 그대로 보존된다)
        const sectionsJson = formData.get("sectionsJson");
        if (formData.has("sectionsJson")) {
            let payload: unknown;
            try {
                if (typeof sectionsJson !== "string" || !sectionsJson) throw new Error();
                payload = JSON.parse(sectionsJson);
            } catch {
                return { ok: false, error: "프로필 정보를 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.", fields: [{ id: "sections", label: "프로필 섹션" }] };
            }
            const existing = Array.isArray(current.sections) ? current.sections : [];
            const cleaned = sanitizeSections(payload, existing ?? []);
            if ("error" in cleaned) {
                return { ok: false, error: cleaned.error, fields: [{ id: "sections", label: "프로필 섹션" }] };
            }
            patch.sections = cleaned.sections;
        }
        // 프로필 내용 오류는 링크 아이콘이나 대표 사진을 올리기 전에 반환한다.
        const parsedLinks = await parseLinks(client, formData, Array.isArray(current.links) ? current.links : []);
        if ("error" in parsedLinks) {
            return { ok: false, error: parsedLinks.error, fields: [parsedLinks.field] };
        }
        patch.links = parsedLinks.links;
        const uploaded = await uploadImageIfPresent(client, formData.get("imageFile"));
        if (uploaded) patch.image = uploaded;

        await client.patch(documentId).ifRevisionId(current._rev).set(patch).commit();
        refresh(managedSlug(current));
        return { ok: true };
    } catch (err) {
        reportError("saveCrew", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

export async function createCrew(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        validateManageUploadForm(formData);
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
            return { ok: false, error: `${labelsEulReul(missing)} 입력해 주세요.`, fields: missing };
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
        reportError("createCrew", err);
        return { ok: false, error: managedWriteError(err) };
    }
    redirect(`/manage/crew/${documentId}?created=1`);
}

export async function moveCrewOrder(documentId: string, direction: "up" | "down"): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!isManagedDocumentId(documentId) || (direction !== "up" && direction !== "down")) return { ok: false, error: "옮길 항목과 방향을 확인하지 못했어요. 목록에서 다시 골라 주세요." };
        const client = getWriteClient();
        const all = await client.fetch<OrderRow[]>(
            `*[_type == "crew" && !(trashed == true)] | order(${CONTENT_ORDER}) { _id, _rev, order }`,
        );
        const result = await moveOrder(client, all, documentId, direction);
        if (!result.ok) return result;
        refresh();
        return { ok: true };
    } catch (err) {
        reportError("moveCrewOrder", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "크루를 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const client = getWriteClient();
        const current = await requireManagedDocument(client, documentId, "crew");
        await client.patch(documentId).ifRevisionId(current._rev).set({ trashed }).commit();
        refresh(managedSlug(current));
        return { ok: true };
    } catch (err) {
        reportError("setTrashed", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteCrew(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreCrew(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}

/** 목록에서 끌어서 정한 새 순서를 저장한다 */
export async function reorderCrew(ids: string[]): Promise<SaveResult> {
    try {
        await requireAuth();
        const result = await applyOrder(getWriteClient(), `*[_type == "crew" && !(trashed == true)]{ _id, _rev, order }`, {}, ids);
        if (result.ok) refresh();
        return result;
    } catch (err) {
        reportError("reorderCrew", err);
        return { ok: false, error: managedWriteError(err) };
    }
}
