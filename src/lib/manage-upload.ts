import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";
import { EMPTY_MANAGE_IMAGE, manageImageSizeError, MAX_MANAGE_IMAGE_BYTES } from "./manage-image-policy";
import { formPayloadError } from "./manage-form-payload";

function imageFile(value: unknown): File | null {
    if (value === null || value === undefined) return null;
    if (!(value instanceof File)) throw new Error("사진 파일을 확인하지 못했어요. 다시 선택해 주세요.");
    // 미선택 file input은 내용이 빈 File이다. 이름은 브라우저에서는 ""이지만, Next 서버 액션의
    // 멀티파트 해석기는 `new File([], undefined)`로 만들어 "undefined"가 된다. 둘 다 "선택 안 함"이다.
    // 선택한 빈 파일은 이름이 있으므로 오류로 처리한다.
    if (value.size === 0 && (value.name === "" || value.name === "undefined")) return null;
    if (value.size === 0) throw new Error(EMPTY_MANAGE_IMAGE);
    if (!value.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있어요. 사진을 다시 골라 주세요.");
    if (value.size > MAX_MANAGE_IMAGE_BYTES) throw new Error(manageImageSizeError(value.size));
    return value;
}

/** 바이트를 읽지 않고 명시적인 새 파일 선택 여부만 확인한다. */
export function hasManageImageFile(value: unknown): boolean {
    return imageFile(value) !== null;
}

/** 인증 이후·업로드 이전에 전체 요청과 모든 이미지 입력을 검사한다. 바이트를 읽지는 않는다. */
export function validateManageUploadForm(data: FormData): void {
    const error = formPayloadError(data);
    if (error) throw new Error(error);
    const seen = new Set<string>();
    for (const [name, value] of data) {
        if (["imageFile", "bgImageFile", "modalImageFile"].includes(name) ||
            ["linkIconFile_", "blockImage_", "spaceImage_"].some((prefix) => name.startsWith(prefix))) {
            if (seen.has(name)) throw new Error("사진 입력이 중복되어 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 파일을 다시 선택해 주세요.");
            seen.add(name);
            imageFile(value);
        }
    }
}

/** 업로드된 이미지가 있으면 Sanity 에셋으로 올리고 image 참조 객체를 돌려준다 (없으면 null) */
export async function uploadImageIfPresent(
    client: ReturnType<typeof getWriteClient>,
    value: unknown,
) {
    const file = imageFile(value);
    if (!file) return null;
    let asset: { _id: string };
    try {
        asset = await client.assets.upload("image", Buffer.from(await file.arrayBuffer()), { filename: file.name });
        if (!asset || typeof asset._id !== "string" || !/^image-[A-Za-z0-9][A-Za-z0-9-]*$/.test(asset._id)) throw new Error("Invalid image upload response");
    } catch (error) {
        // 파일·요청 헤더·API 오류 원문은 운영자 화면이나 로그에 그대로 남기지 않는다.
        const statusCode = error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
        console.error("[manage-upload] image upload failed", { statusCode });
        throw new Error("사진을 올리지 못했어요. 파일 형식과 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    }
    return {
        _type: "image" as const,
        asset: { _type: "reference" as const, _ref: asset._id },
    };
}
