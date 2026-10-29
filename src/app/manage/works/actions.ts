"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent, validateManageUploadForm } from "@/lib/manage-upload";
import { sanitizeBlocks } from "@/lib/work-blocks-server";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { labelsEulReul } from "@/lib/josa";
import { managedSlug, managedWriteError, requireManagedDocument } from "@/lib/manage-target";
import { externalHttpUrl } from "@/lib/content-urls";
import { publicDetailPath } from "@/lib/public-routes";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function refresh(slug?: string) {
    updateTag("work");
    revalidatePath("/works");
    const detail = publicDetailPath("works", slug);
    if (detail) revalidatePath(detail);
    revalidatePath("/sitemap.xml");
    revalidatePath("/manage/works");
}

type Parsed = {
    fields: { isActive: boolean; title: string; artist: string; releaseDate: string };
    optional: { youtubeUrl: string; instagramId: string; instagramUrl: string };
};

/** 공통 입력 검증. 날짜는 <input type="date">의 YYYY-MM-DD를 사이트가 쓰는 "YYYY. MM. DD." 문자열로 바꾼다. */
function parseBasic(formData: FormData): Parsed | { error: string; fields: FieldError[] } {
    const title = String(formData.get("title") ?? "").trim();
    const artist = String(formData.get("artist") ?? "").trim();
    const dateRaw = String(formData.get("releaseDate") ?? "").trim();
    const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
    const instagramId = String(formData.get("instagramId") ?? "").trim();
    const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();

    const missing: FieldError[] = [];
    if (!title) missing.push({ id: "title", label: "앨범(작품) 제목" });
    if (!artist) missing.push({ id: "artist", label: "아티스트" });
    if (!dateRaw) missing.push({ id: "releaseDate", label: "발매일" });
    if (missing.length > 0) {
        return { error: `${labelsEulReul(missing)} 입력해 주세요.`, fields: missing };
    }

    const m = ISO_DATE_RE.exec(dateRaw);
    const parsed = m ? new Date(`${dateRaw}T00:00:00Z`) : null;
    if (!m || !parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateRaw) {
        return { error: "발매일이 올바르지 않아요. 달력에서 날짜를 골라 주세요.", fields: [{ id: "releaseDate", label: "발매일" }] };
    }

    for (const [id, label, value] of [
        ["youtubeUrl", "유튜브 주소", youtubeUrl],
        ["instagramUrl", "인스타그램 주소", instagramUrl],
    ] as const) {
        if (value && !externalHttpUrl(value)) {
            return { error: `${label}가 올바르지 않아요. 브라우저 주소창의 주소를 복사해 붙여넣어 주세요.`, fields: [{ id, label }] };
        }
    }

    return {
        fields: { isActive: String(formData.get("isActive") ?? "true") === "true", title, artist, releaseDate: `${m[1]}. ${m[2]}. ${m[3]}.` },
        optional: { youtubeUrl, instagramId, instagramUrl },
    };
}

export async function saveWork(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        validateManageUploadForm(formData);
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 작품을 찾지 못했어요. 목록에서 다시 골라 주세요." };

        const parsed = parseBasic(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.fields };
        const current = await requireManagedDocument(client, documentId, "work");

        const patch: Record<string, unknown> = { ...parsed.fields };
        const unset: string[] = [];
        // 선택 항목은 비우면 필드 자체를 지운다 (.set은 빈 문자열을 그대로 저장하므로)
        for (const [key, value] of Object.entries(parsed.optional)) {
            if (value) patch[key] = value;
            else unset.push(key);
        }
        // 상세 내용 블록: 폼이 blocksJson을 보낸 경우에만 배열 전체를 교체한다.
        // (보내지 않으면 patch에 넣지 않아 기존 블록이 그대로 보존된다)
        const blocksJson = formData.get("blocksJson");
        if (formData.has("blocksJson")) {
            let payload: unknown;
            try {
                if (typeof blocksJson !== "string" || !blocksJson) throw new Error();
                payload = JSON.parse(blocksJson);
            } catch {
                return { ok: false, error: "상세 내용 정보를 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.", fields: [{ id: "blocks", label: "상세 페이지 내용" }] };
            }
            const existing = Array.isArray(current.contentBlocks) ? current.contentBlocks : [];
            const cleaned = await sanitizeBlocks(payload, existing ?? [], (clientKey) =>
                uploadImageIfPresent(client, formData.get(`blockImage_${clientKey}`)),
            );
            if ("error" in cleaned) {
                return { ok: false, error: cleaned.error, fields: [{ id: "blocks", label: "상세 페이지 내용" }] };
            }
            patch.contentBlocks = cleaned.blocks;
        }
        const uploaded = await uploadImageIfPresent(client, formData.get("imageFile"));
        if (uploaded) patch.coverImage = uploaded;

        // 이 화면이 다루지 않는 필드는 patch에 넣지 않아 그대로 보존된다
        let p = client.patch(documentId).ifRevisionId(current._rev).set(patch);
        if (unset.length > 0) p = p.unset(unset);
        await p.commit();

        refresh(managedSlug(current));
        return { ok: true };
    } catch (err) {
        console.error("[saveWork]", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

export async function createWork(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        validateManageUploadForm(formData);
        const client = getWriteClient();

        const parsed = parseBasic(formData);
        const missing: FieldError[] = "error" in parsed ? [...parsed.fields] : [];
        const slug = String(formData.get("slug") ?? "").trim();
        if (!slug) missing.push({ id: "slug", label: "주소(영문)" });
        else if (!SLUG_RE.test(slug)) {
            return {
                ok: false,
                error: "주소는 영문 소문자, 숫자, 하이픈(-), 밑줄(_)만 쓸 수 있어요. (예: folkfolio-2)",
                fields: [{ id: "slug", label: "주소(영문)" }],
            };
        }
        const imageFile = formData.get("imageFile") as File | null;
        if (!imageFile || imageFile.size === 0) missing.push({ id: "imageFile", label: "커버 이미지" });
        if ("error" in parsed) {
            return { ok: false, error: parsed.error, fields: missing };
        }
        if (missing.length > 0) {
            return { ok: false, error: `${labelsEulReul(missing)} 입력해 주세요.`, fields: missing };
        }

        const dup = await client.fetch<number>(`count(*[_type == "work" && slug.current == $slug])`, { slug });
        if (dup > 0) {
            return { ok: false, error: "이미 쓰고 있는 주소예요. 다른 주소를 입력해 주세요.", fields: [{ id: "slug", label: "주소(영문)" }] };
        }

        const coverImage = await uploadImageIfPresent(client, imageFile);
        const created = await client.create({
            _type: "work",
            ...parsed.fields,
            ...Object.fromEntries(Object.entries(parsed.optional).filter(([, v]) => v)),
            slug: { _type: "slug", current: slug },
            coverImage,
        });
        documentId = created._id;
        refresh(slug);
    } catch (err) {
        console.error("[createWork]", err);
        return { ok: false, error: managedWriteError(err) };
    }
    redirect(`/manage/works/${documentId}?created=1`);
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "작품을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        const client = getWriteClient();
        const current = await requireManagedDocument(client, documentId, "work");
        await client.patch(documentId).ifRevisionId(current._rev).set({ trashed }).commit();
        refresh(managedSlug(current));
        return { ok: true };
    } catch (err) {
        console.error("[setTrashed:work]", err);
        return { ok: false, error: managedWriteError(err) };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteWork(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreWork(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}
