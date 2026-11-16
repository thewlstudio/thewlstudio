/** UI·서버가 공유하는 사진 위치. 새 값은 Tailwind safelist에도 등록한다. */
export const PHOTO_PRESETS = [
    { value: "object-top", label: "얼굴 위쪽" },
    { value: "object-center", label: "가운데" },
    { value: "object-[center_30%]", label: "조금 아래" },
    { value: "object-bottom", label: "아래쪽" },
    { value: "object-top scale-[1.5] origin-[center_30%]", label: "1.5배 확대" },
    { value: "object-top scale-[1.8] origin-[center_20%]", label: "1.8배 확대" },
] as const;
