/**
 * 관리 화면 사진 업로드 공통: 고른 사진이 크면 브라우저에서 줄여서 올린다.
 * 서버 액션 요청 한도(4MB, Vercel 4.5MB)를 넘지 않게 하기 위함이며,
 * 줄일 수 없거나 줄여도 너무 크면 오류 문구를 돌려준다.
 */
const SHRINK_ABOVE = 1_200_000; // 이보다 크면 줄인다
const MAX_SIDE = 2400;
const MAX_AFTER = 2_800_000; // 줄인 뒤에도 이보다 크면 거부 (한 폼에 사진이 여러 장일 수 있어 여유를 둔다)

async function shrink(file: File): Promise<File> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= SHRINK_ABOVE) return file;
    try {
        const bitmap = await createImageBitmap(file);
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
                bitmap.close();
                return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
            }
            scale *= 0.8;
        }
        bitmap.close();
        return file;
    } catch {
        return file;
    }
}

export async function prepareImageFile(file: File): Promise<{ file: File } | { error: string }> {
    if (!file.type.startsWith("image/")) {
        return { error: `이미지 파일만 선택할 수 있어요. (${file.type || "알 수 없는 형식"})` };
    }
    const out = await shrink(file);
    if (out.size > MAX_AFTER) {
        return { error: `사진 용량이 너무 커요 (${(file.size / 1024 / 1024).toFixed(1)}MB). 3MB 이하로 줄여서 다시 선택해 주세요.` };
    }
    return { file: out };
}

/** input[type=file]에 선택된 파일을 줄인 파일로 바꿔 넣는다 (폼 제출에 줄인 파일이 실리도록) */
export function replaceInputFile(input: HTMLInputElement, file: File) {
    if (input.files?.[0] === file) return;
    try {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
    } catch {
        /* 지원하지 않는 브라우저에서는 원본 그대로 제출된다 */
    }
}
