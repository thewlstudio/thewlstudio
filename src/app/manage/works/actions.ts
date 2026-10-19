"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { uploadImageIfPresent } from "@/lib/manage-upload";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function refresh(slug?: string) {
    updateTag("work");
    revalidatePath("/works");
    if (slug) revalidatePath(`/works/${slug}`);
    revalidatePath("/manage/works");
}

function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

type Parsed = {
    fields: { title: string; artist: string; releaseDate: string };
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
        return { error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`, fields: missing };
    }

    const m = ISO_DATE_RE.exec(dateRaw);
    const parsed = m ? new Date(`${dateRaw}T00:00:00Z`) : null;
    if (!m || !parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateRaw) {
        return { error: "발매일이 올바르지 않습니다. 달력에서 날짜를 골라 주세요.", fields: [{ id: "releaseDate", label: "발매일" }] };
    }

    for (const [id, label, value] of [
        ["youtubeUrl", "유튜브 주소", youtubeUrl],
        ["instagramUrl", "인스타그램 주소", instagramUrl],
    ] as const) {
        if (value && !isHttpUrl(value)) {
            return { error: `${label}가 올바르지 않습니다. https://로 시작하는 주소를 넣어 주세요.`, fields: [{ id, label }] };
        }
    }

    return {
        fields: { title, artist, releaseDate: `${m[1]}. ${m[2]}. ${m[3]}.` },
        optional: { youtubeUrl, instagramId, instagramUrl },
    };
}

export async function saveWork(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();
        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) return { ok: false, error: "수정할 작품을 찾을 수 없습니다." };

        const parsed = parseBasic(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.fields };

        const patch: Record<string, unknown> = { ...parsed.fields };
        const unset: string[] = [];
        // 선택 항목은 비우면 필드 자체를 지운다 (.set은 빈 문자열을 그대로 저장하므로)
        for (const [key, value] of Object.entries(parsed.optional)) {
            if (value) patch[key] = value;
            else unset.push(key);
        }
        const uploaded = await uploadImageIfPresent(client, formData.get("imageFile") as File | null);
        if (uploaded) patch.coverImage = uploaded;

        // contentBlocks 등 이 화면이 다루지 않는 필드는 patch에 넣지 않아 그대로 보존된다
        let p = client.patch(documentId).set(patch);
        if (unset.length > 0) p = p.unset(unset);
        await p.commit();

        const slug = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, { id: documentId });
        refresh(slug ?? undefined);
        return { ok: true };
    } catch (err) {
        console.error("[saveWork]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}

export async function createWork(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
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
            return { ok: false, error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`, fields: missing };
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
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
    redirect(`/manage/works/${documentId}`);
}

async function setTrashed(documentId: string, trashed: boolean): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) return { ok: false, error: "작품을 찾을 수 없습니다." };
        const client = getWriteClient();
        await client.patch(documentId).set({ trashed }).commit();
        const slug = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, { id: documentId });
        refresh(slug ?? undefined);
        return { ok: true };
    } catch (err) {
        console.error("[setTrashed:work]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}

/** 소프트 삭제 — 문서는 지우지 않고 trashed만 세운다 */
export async function deleteWork(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, true);
}

export async function restoreWork(documentId: string): Promise<SaveResult> {
    return setTrashed(documentId, false);
}
