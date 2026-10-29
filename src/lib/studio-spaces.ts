import { DEFAULT_LOBBY, DEFAULT_ROOMS } from "@/config/default-content";

/**
 * /studio 공간(연습실·로비) 데이터의 타입과 기본값.
 * 기본값은 Sanity(studioSpace) 조회에 실패했을 때만 쓰는 예비 데이터이며,
 * 평소에는 Sanity 값이 화면에 쓰인다. (내용은 5단계 이전 시점의 하드코딩 값과 같다)
 */
export type StudioSpaceData = {
    name: string;
    subtitle?: string;
    description?: string;
    prices: { label: string; value: string; unit: string }[];
    features: string[];
    notes?: string[];
    images: string[];
};

/** 조회 실패일 때 쓰는 예비 데이터. 값은 고객 고유 내용이라 src/config/default-content.ts에 있다. */
export const FALLBACK_ROOMS: StudioSpaceData[] = DEFAULT_ROOMS;
export const FALLBACK_LOBBY: StudioSpaceData = DEFAULT_LOBBY;
