"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** 여러 줄 텍스트 → 문자열 배열 (빈 줄 제거) */
function linesToArray(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

/** 업로드된 파일이 있으면 Sanity 에셋으로 올리고 참조 객체를 돌려준다 */
async function uploadImageIfPresent(
    client: ReturnType<typeof getWriteClient>,
    file: File | null,
) {
    if (!file || file.size === 0) return null;

    if (!file.type.startsWith("image/")) {
        throw new Error(`이미지 파일만 올릴 수 있습니다. (받은 형식: ${file.type || "알 수 없음"})`);
    }
    // 과도한 용량 방지 (Sanity 업로드 실패 및 비용 폭증 예방)
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
        throw new Error(
            `사진 용량이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 10MB 이하로 줄여서 올려주세요.`,
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, { filename: file.name });

    return {
        _type: "image" as const,
        asset: { _type: "reference" as const, _ref: asset._id },
    };
}

/** 텍스트류 공통 필드를 파싱하고 필수값을 검증한다 (생성/수정 공용) */
function parseAndValidateFields(formData: FormData): { fields: Record<string, unknown> } | { error: string } {
    const instructorName = String(formData.get("instructorName") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const subtitle = String(formData.get("subtitle") ?? "").trim();
    const lessonInfo = String(formData.get("lessonInfo") ?? "").trim();
    const about = linesToArray(String(formData.get("about") ?? ""));
    const process = linesToArray(String(formData.get("process") ?? ""));

    const missing: string[] = [];
    if (!instructorName) missing.push("강사 이름");
    if (!category) missing.push("클래스 이름");
    if (!subtitle) missing.push("한 줄 소개");
    if (!lessonInfo) missing.push("레슨 형태");
    if (about.length === 0) missing.push("레슨 소개");
    if (process.length === 0) missing.push("커리큘럼");
    if (missing.length > 0) {
        return { error: `${missing.join(", ")}을(를) 입력해 주세요.` };
    }

    const orderRaw = Number(formData.get("order"));
    const order = Number.isFinite(orderRaw) ? orderRaw : 0;

    return {
        fields: {
            instructorName,
            category,
            subtitle,
            lessonInfo,
            about,
            process,
            order,
            imagePosition: String(formData.get("imagePosition") ?? "object-top"),
            portfolioUrl: String(formData.get("portfolioUrl") ?? "").trim() || undefined,
            portfolioText: String(formData.get("portfolioText") ?? "").trim() || undefined,
            portfolioBtn: String(formData.get("portfolioBtn") ?? "").trim() || "작업물 보기",
        },
    };
}

export async function saveInstructor(
    _prevState: SaveResult | null,
    formData: FormData,
): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        const documentId = String(formData.get("documentId") ?? "").trim();
        if (!documentId) {
            return { ok: false, error: "수정할 강사를 찾을 수 없습니다." };
        }

        const parsed = parseAndValidateFields(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error };

        const patch: Record<string, unknown> = { ...parsed.fields };

        // 사진은 새로 올린 경우에만 교체한다 (비워두면 기존 사진 유지)
        const imageFields: Array<["image" | "modalImage" | "bgImage", string]> = [
            ["image", "imageFile"],
            ["modalImage", "modalImageFile"],
            ["bgImage", "bgImageFile"],
        ];
        for (const [field, formKey] of imageFields) {
            const uploaded = await uploadImageIfPresent(client, formData.get(formKey) as File | null);
            if (uploaded) patch[field] = uploaded;
        }

        await client.patch(documentId).set(patch).commit();

        // 공개 사이트에 즉시 반영.
        // updateTag는 서버 액션 전용으로, 저장 직후 본인이 바뀐 내용을 바로 볼 수 있게 한다.
        updateTag("instructor");
        revalidatePath("/class");
        revalidatePath("/manage/instructors");

        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[saveInstructor]", err);
        return { ok: false, error: message };
    }
}

/**
 * 새 강사 생성. 폼 액션(<form action={...}>)으로만 호출된다는 전제 하에
 * 성공 시 redirect()를 던진다 — 이 패턴은 try/catch 바깥에서만 안전하다.
 */
export async function createInstructor(
    _prevState: SaveResult | null,
    formData: FormData,
): Promise<SaveResult> {
    let documentId: string;
    try {
        await requireAuth();
        const client = getWriteClient();

        const parsed = parseAndValidateFields(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error };

        const imageFile = formData.get("imageFile") as File | null;
        const bgImageFile = formData.get("bgImageFile") as File | null;
        const modalImageFile = formData.get("modalImageFile") as File | null;

        // 목록 사진 / 배경 사진은 CMS 스키마상 필수 항목이다
        const missingImages: string[] = [];
        if (!imageFile || imageFile.size === 0) missingImages.push("목록에 보이는 사진");
        if (!bgImageFile || bgImageFile.size === 0) missingImages.push("배경 사진");
        if (missingImages.length > 0) {
            return { ok: false, error: `${missingImages.join(", ")}을(를) 선택해 주세요.` };
        }

        const [image, bgImage, modalImage] = await Promise.all([
            uploadImageIfPresent(client, imageFile),
            uploadImageIfPresent(client, bgImageFile),
            uploadImageIfPresent(client, modalImageFile),
        ]);

        const created = await client.create({
            _type: "instructor",
            ...parsed.fields,
            image,
            bgImage,
            ...(modalImage ? { modalImage } : {}),
        });
        documentId = created._id;
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[createInstructor]", err);
        return { ok: false, error: message };
    }

    // redirect()는 특수한 예외를 던지는 방식으로 동작하므로,
    // try/catch 블록에 걸리지 않도록 반드시 바깥에서 호출해야 한다.
    updateTag("instructor");
    revalidatePath("/class");
    revalidatePath("/manage/instructors");
    // 방금 만든 강사의 수정 화면으로 이동 — 미리보기로 바로 확인할 수 있도록
    redirect(`/manage/instructors/${documentId}`);
}

/**
 * 강사 삭제. 클라이언트 컴포넌트에서 직접 호출되므로(폼 액션이 아님)
 * redirect()를 쓰지 않고 결과만 돌려준다 — 이동은 호출부에서 router로 처리한다.
 */
export async function deleteInstructor(documentId: string): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) {
            return { ok: false, error: "삭제할 강사를 찾을 수 없습니다." };
        }
        const client = getWriteClient();
        await client.delete(documentId);

        updateTag("instructor");
        revalidatePath("/class");
        revalidatePath("/manage/instructors");

        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[deleteInstructor]", err);
        return { ok: false, error: message };
    }
}
