"use server";

import { randomUUID } from "crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";

/** 오류가 난 필드의 DOM id와 사람이 읽을 이름 — 상단 오류 요약에서 해당 칸으로 이동할 때 쓴다 */
export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };
export type DuplicateResult = { ok: true; newId: string } | { ok: false; error: string };

/** 여러 줄 텍스트 → 문자열 배열 (빈 줄 제거) */
function linesToArray(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

/**
 * 스키마상 필수인 `id` slug를 새로 만든다. 프론트엔드는 이 필드를 렌더링에
 * 쓰지 않지만(_id만 사용), Studio에서 필수값 누락 경고가 뜨지 않도록 하고
 * 복제 시 원본과 slug가 겹치지 않도록 항상 고유하게 생성한다.
 */
function generateInstructorSlug(instructorName: string): string {
    const base =
        instructorName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-+|-+$)/g, "") || "instructor";
    return `${base}-${randomUUID().slice(0, 8)}`;
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
function parseAndValidateFields(
    formData: FormData,
): { fields: Record<string, unknown> } | { error: string; missingFields: FieldError[] } {
    const instructorName = String(formData.get("instructorName") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const subtitle = String(formData.get("subtitle") ?? "").trim();
    const lessonInfo = String(formData.get("lessonInfo") ?? "").trim();
    const about = linesToArray(String(formData.get("about") ?? ""));
    const process = linesToArray(String(formData.get("process") ?? ""));

    const missing: FieldError[] = [];
    if (!instructorName) missing.push({ id: "instructorName", label: "강사 이름" });
    if (!category) missing.push({ id: "category", label: "클래스 이름" });
    if (!subtitle) missing.push({ id: "subtitle", label: "한 줄 소개" });
    if (!lessonInfo) missing.push({ id: "lessonInfo", label: "레슨 형태" });
    if (about.length === 0) missing.push({ id: "about", label: "레슨 소개" });
    if (process.length === 0) missing.push({ id: "process", label: "커리큘럼" });
    if (missing.length > 0) {
        return {
            error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`,
            missingFields: missing,
        };
    }

    const isActive = String(formData.get("isActive") ?? "true") === "true";

    return {
        fields: {
            isActive,
            instructorName,
            category,
            subtitle,
            lessonInfo,
            about,
            process,
            // order는 여기서 다루지 않는다 — 목록 페이지의 위/아래 버튼(moveInstructorOrder)
            // 으로만 바뀌며, 저장/생성 폼에서는 손대지 않는다 (중복 순서 값 방지).
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
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.missingFields };

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

        // portfolioUrl/portfolioText처럼 선택 항목을 비워서 undefined가 된 필드는
        // set()에 그대로 넘기면 직렬화 과정에서 통째로 빠져 기존 값이 안 지워진다.
        // Sanity에서 필드를 실제로 지우려면 unset()을 따로 호출해야 한다.
        const unsetFields = Object.keys(patch).filter((key) => patch[key] === undefined);
        for (const key of unsetFields) delete patch[key];

        let mutation = client.patch(documentId).set(patch);
        if (unsetFields.length > 0) mutation = mutation.unset(unsetFields);
        await mutation.commit();

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
        if ("error" in parsed) return { ok: false, error: parsed.error, fields: parsed.missingFields };

        const imageFile = formData.get("imageFile") as File | null;
        const bgImageFile = formData.get("bgImageFile") as File | null;
        const modalImageFile = formData.get("modalImageFile") as File | null;

        // 목록 사진 / 배경 사진은 CMS 스키마상 필수 항목이다
        const missingImages: FieldError[] = [];
        if (!imageFile || imageFile.size === 0) missingImages.push({ id: "imageFile", label: "목록에 보이는 사진" });
        if (!bgImageFile || bgImageFile.size === 0) missingImages.push({ id: "bgImageFile", label: "배경 사진" });
        if (missingImages.length > 0) {
            return {
                ok: false,
                error: `${missingImages.map((m) => m.label).join(", ")}을(를) 선택해 주세요.`,
                fields: missingImages,
            };
        }

        const [image, bgImage, modalImage, existingOrders] = await Promise.all([
            uploadImageIfPresent(client, imageFile),
            uploadImageIfPresent(client, bgImageFile),
            uploadImageIfPresent(client, modalImageFile),
            client.fetch<number[]>(`*[_type == "instructor" && defined(order)].order`),
        ]);
        // 새 강사는 항상 맨 뒤에 추가한다 — 순서는 목록 페이지의 위/아래 버튼으로 조정
        const order = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 0;

        const created = await client.create({
            _type: "instructor",
            ...parsed.fields,
            order,
            id: {
                _type: "slug",
                current: generateInstructorSlug(String(parsed.fields.instructorName ?? "")),
            },
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
 * 목록에서 강사를 한 칸 위/아래로 옮긴다.
 * 숫자를 손으로 입력하게 하면 언젠가 값이 겹칠 수 있어서,
 * 현재 정렬 순서를 다시 조회해 바로 옆 강사와 order 값을 맞바꾸는 방식으로 처리한다.
 * (겹치거나 순서가 듬성듬성해도 항상 안전하게 동작한다)
 */
export async function moveInstructorOrder(
    documentId: string,
    direction: "up" | "down",
): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        const all = await client.fetch<Array<{ _id: string; order: number }>>(
            `*[_type == "instructor" && !(trashed == true)] | order(order asc) { _id, order }`,
        );

        const index = all.findIndex((i) => i._id === documentId);
        if (index === -1) {
            return { ok: false, error: "강사를 찾을 수 없습니다." };
        }

        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= all.length) {
            return { ok: false, error: "더 이상 이동할 수 없습니다." };
        }

        const current = all[index];
        const swapWith = all[swapIndex];

        await client
            .transaction()
            .patch(current._id, { set: { order: swapWith.order } })
            .patch(swapWith._id, { set: { order: current.order } })
            .commit();

        updateTag("instructor");
        revalidatePath("/class");
        revalidatePath("/manage/instructors");

        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[moveInstructorOrder]", err);
        return { ok: false, error: message };
    }
}

/**
 * 기존 강사를 복제해 새 문서를 만든다. 비슷한 유형의 강사를 추가할 때
 * 글(소개/커리큘럼)과 사진을 그대로 가져오고, 새로 생긴 문서를 바로 편집하며
 * 다른 부분만 바꾸면 되게 한다.
 * 삭제와 마찬가지로 클라이언트 컴포넌트에서 직접 호출되므로 redirect를 쓰지 않는다.
 */
export async function duplicateInstructor(documentId: string): Promise<DuplicateResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        const original = await client.fetch<Record<string, unknown> | null>(
            `*[_type == "instructor" && _id == $id][0]`,
            { id: documentId },
        );
        if (!original) {
            return { ok: false, error: "복제할 강사를 찾을 수 없습니다." };
        }

        const existingOrders = await client.fetch<number[]>(
            `*[_type == "instructor" && defined(order)].order`,
        );
        const order = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 0;

        // _id, _rev 등 시스템 필드는 제외하고 나머지만 그대로 복제한다.
        // 이미지 필드는 Sanity 이미지 참조라 여러 문서가 같이 가리켜도 안전하다.
        // trashed는 절대 복제하지 않는다 — 휴지통에 있던 것을 복제해도 새 문서는 정상이어야 한다.
        const { _id, _rev, _type, _createdAt, _updatedAt, instructorName, trashed, ...rest } = original;
        void _id;
        void _rev;
        void _createdAt;
        void _updatedAt;
        void trashed;

        const newName = `${String(instructorName ?? "")} (복사본)`.trim();

        const created = await client.create({
            _type: (_type as string) ?? "instructor",
            ...rest,
            instructorName: newName,
            // 복제 직후 원본 내용을 다 확인하기 전엔 홈페이지에 노출되면 안 되므로
            // 원본의 공개 상태와 무관하게 항상 비공개로 만든다. id도 원본과 겹치지
            // 않도록 새로 발급한다 (스키마 필수 slug).
            isActive: false,
            id: { _type: "slug", current: generateInstructorSlug(newName) },
            order,
        });

        updateTag("instructor");
        revalidatePath("/class");
        revalidatePath("/manage/instructors");

        return { ok: true, newId: created._id };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[duplicateInstructor]", err);
        return { ok: false, error: message };
    }
}

/**
 * 강사를 휴지통으로 이동한다 (소프트 삭제 — 문서를 실제로 지우지 않고
 * trashed: true만 세운다). 목록·공개 사이트에서는 즉시 안 보이게 되지만
 * 휴지통에서 언제든 복원할 수 있다.
 * 클라이언트 컴포넌트에서 직접 호출되므로(폼 액션이 아님)
 * redirect()를 쓰지 않고 결과만 돌려준다 — 이동은 호출부에서 router로 처리한다.
 */
export async function deleteInstructor(documentId: string): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) {
            return { ok: false, error: "삭제할 강사를 찾을 수 없습니다." };
        }
        const client = getWriteClient();
        await client.patch(documentId).set({ trashed: true }).commit();

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

/** 휴지통에서 강사를 복원한다 (trashed: false). */
export async function restoreInstructor(documentId: string): Promise<SaveResult> {
    try {
        await requireAuth();
        if (!documentId) {
            return { ok: false, error: "복원할 강사를 찾을 수 없습니다." };
        }
        const client = getWriteClient();
        await client.patch(documentId).set({ trashed: false }).commit();

        updateTag("instructor");
        revalidatePath("/class");
        revalidatePath("/manage/instructors");

        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        console.error("[restoreInstructor]", err);
        return { ok: false, error: message };
    }
}
