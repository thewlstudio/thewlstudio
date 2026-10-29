/** 브라우저에서 준비한 사진과 서버가 받는 사진에 같은 장당 상한을 적용한다. */
export const MAX_MANAGE_IMAGE_BYTES = 2_800_000;
export const EMPTY_MANAGE_IMAGE = "사진 파일이 비어 있어요. 다른 사진을 골라 주세요.";

export function manageImageSizeError(bytes: number): string {
    return `사진 용량이 너무 커요 (${(bytes / 1_000_000).toFixed(1)}MB). 2.8MB 이하로 줄여서 다시 선택해 주세요.`;
}
