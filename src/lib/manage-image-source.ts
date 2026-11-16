import "server-only";
import { hasManageImageFile } from "./manage-upload";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);

/** 기존 사진을 유지할 요청인데 참조를 읽지 못하면 자동 제외·재작성하지 않는다. */
export function managedImageSourceIssue(kind: "work" | "space", data: FormData, submitted: unknown, originals: unknown[]) {
    if (!Array.isArray(submitted)) return null; // 구조 검사는 기존 검증기가 담당한다.
    for (const row of submitted) {
        if (!object(row) || typeof row._key !== "string" || kind === "work" && row._type !== "imageBlock") continue;
        const source = originals.find((item) => object(item) && item._key === row._key && (kind === "space" || item._type === "imageBlock"));
        if (!object(source) || hasManageImageFile(data.get(`${kind === "work" ? "blockImage" : "spaceImage"}_${row._key}`))) continue;
        const image = kind === "work" ? source.image : source;
        if (!object(image) || !object(image.asset) || typeof image.asset._ref !== "string" || !image.asset._ref.trim()) return {
            error: "기존 사진 참조를 읽지 못해 저장하지 않았어요. 입력을 따로 보관한 뒤 /admin에서 확인하거나 새 사진을 명시적으로 골라 주세요.",
            fields: [{ id: kind === "work" ? "blocks" : "images", label: kind === "work" ? "상세 페이지 사진" : "공간 사진" }],
        };
    }
    return null;
}
