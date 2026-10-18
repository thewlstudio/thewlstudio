import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";

const MAX_BYTES = 10 * 1024 * 1024;

/** 업로드된 이미지가 있으면 Sanity 에셋으로 올리고 image 참조 객체를 돌려준다 (없으면 null) */
export async function uploadImageIfPresent(
    client: ReturnType<typeof getWriteClient>,
    file: File | null,
) {
    if (!file || file.size === 0) return null;
    if (!file.type.startsWith("image/")) {
        throw new Error(`이미지 파일만 올릴 수 있습니다. (받은 형식: ${file.type || "알 수 없음"})`);
    }
    if (file.size > MAX_BYTES) {
        throw new Error(
            `사진 용량이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 10MB 이하로 줄여서 올려주세요.`,
        );
    }
    const asset = await client.assets.upload("image", Buffer.from(await file.arrayBuffer()), {
        filename: file.name,
    });
    return {
        _type: "image" as const,
        asset: { _type: "reference" as const, _ref: asset._id },
    };
}
