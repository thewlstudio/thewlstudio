/**
 * 관리 화면 사진 업로드 공통: 고른 사진이 크면 브라우저에서 줄여서 올린다.
 * 서버 액션 요청 한도(4MB, Vercel 4.5MB)를 넘지 않게 하기 위함이며,
 * 줄일 수 없거나 줄여도 너무 크면 오류 문구를 돌려준다.
 */
import { EMPTY_MANAGE_IMAGE, manageImageSizeError, MAX_MANAGE_IMAGE_BYTES } from "@/lib/manage-image-policy";

const SHRINK_ABOVE = 1_200_000; // 이보다 크면 줄인다
const MAX_SIDE = 2400;

async function shrink(file: File): Promise<File> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= SHRINK_ABOVE) return file;
    let bitmap: ImageBitmap | undefined;
    try {
        bitmap = await createImageBitmap(file);
        let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        for (let attempt = 0; attempt < 5; attempt++) {
            const w = Math.max(1, Math.round(bitmap.width * scale));
            const h = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return file;
            ctx.fillStyle = "#fff"; // 투명 PNG가 검게 나오지 않도록
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(bitmap, 0, 0, w, h);
            const quality = Math.max(0.6, 0.88 - attempt * 0.07);
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
            if (blob && blob.size <= SHRINK_ABOVE) {
                return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
            }
            scale *= 0.8;
        }
        return file;
    } catch {
        return file;
    } finally {
        bitmap?.close();
    }
}

export async function prepareImageFile(file: File): Promise<{ file: File } | { error: string }> {
    if (file.size === 0) return { error: EMPTY_MANAGE_IMAGE };
    if (!file.type.startsWith("image/")) {
        return { error: `이미지 파일만 선택할 수 있어요. (${file.type || "알 수 없는 형식"})` };
    }
    const out = await shrink(file);
    if (out.size === 0) return { error: EMPTY_MANAGE_IMAGE };
    if (out.size > MAX_MANAGE_IMAGE_BYTES) {
        return { error: manageImageSizeError(out.size) };
    }
    return { file: out };
}

/** input[type=file]에 선택된 파일을 줄인 파일로 바꿔 넣는다 (폼 제출에 줄인 파일이 실리도록) */
export function replaceInputFile(input: HTMLInputElement, file: File): boolean {
    if (input.files?.length === 1 && input.files[0] === file) return true;
    try {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        return input.files?.length === 1 && input.files[0] === file;
    } catch {
        return false;
    }
}
