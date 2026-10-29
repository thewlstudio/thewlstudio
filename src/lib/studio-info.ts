import { DEFAULT_INFO } from "@/config/default-content";
/**
 * /studio 페이지의 "공간 카드 외" 안내 내용: 서비스 가격, 장비, 멤버십, 이용 안내.
 * 값은 Sanity(studioInfo 싱글톤)에서 오고, 문서가 없거나 조회에 실패하면 FALLBACK_INFO를 쓴다.
 * 개행("\n")은 화면의 줄바꿈(데스크톱에서만)으로 쓰인다.
 */
export type StudioService = { title: string; price: string; priceUnit: string; points: string[] };
export type StudioEquipment = { title: string; items: string[] };
export type StudioMembership = { num: string; label: string; sub: string; price: string };

export type StudioInfo = {
    services: StudioService[];
    equipment: StudioEquipment[];
    memberships: StudioMembership[];
    membershipNote: string;
    guidelinesIntro: string;
    parkingWarning: string;
    parkingDetail: string;
    parkingFeeLabel: string;
    parkingFee: string;
    amenities: string[];
    cctvTitle: string;
    cctvDetail: string;
    dutyText: string;
    dutyWarning: string;
};

/** 관리자 전용 모델. 공개 화면 모델에는 넣지 않는 원본 배열 키를 선택적으로 보존한다. */
export type StudioInfoForManage = Omit<StudioInfo, "services" | "equipment" | "memberships"> & {
    services: (StudioService & { _key?: string })[];
    equipment: (StudioEquipment & { _key?: string })[];
    memberships: (StudioMembership & { _key?: string })[];
};

/** 조회 실패·문서 없음일 때 쓰는 기본값. 값은 고객 고유 내용이라 src/config/default-content.ts에 있다. */
export const FALLBACK_INFO: StudioInfo = DEFAULT_INFO;

type Raw = Record<string, unknown> | null | undefined;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const strList = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined);
const objList = (v: unknown): Record<string, unknown>[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : undefined;

/**
 * Sanity 문서 → 화면용 값. 문서/필드가 아예 없을 때만 기본값을 쓰고,
 * 값이 비어 있는 배열·문자열은 비어 있는 그대로 둔다 (일부러 비운 항목이 되살아나지 않도록).
 * 단, 필수 의미를 가진 제목 같은 건 관리 화면에서 비우지 못하게 막는다.
 */
export function mergeInfo(raw: Raw): StudioInfo {
    const f = FALLBACK_INFO;
    if (!raw) return f;
    const services = objList(raw.services)?.map((s) => ({
        title: str(s.title) ?? "",
        price: str(s.price) ?? "",
        priceUnit: str(s.priceUnit) ?? "",
        points: strList(s.points) ?? [],
    }));
    const equipment = objList(raw.equipment)?.map((e) => ({ title: str(e.title) ?? "", items: strList(e.items) ?? [] }));
    const memberships = objList(raw.memberships)?.map((m) => ({
        num: str(m.num) ?? "",
        label: str(m.label) ?? "",
        sub: str(m.sub) ?? "",
        price: str(m.price) ?? "",
    }));
    return {
        services: services ?? f.services,
        equipment: equipment ?? f.equipment,
        memberships: memberships ?? f.memberships,
        membershipNote: str(raw.membershipNote) ?? f.membershipNote,
        guidelinesIntro: str(raw.guidelinesIntro) ?? f.guidelinesIntro,
        parkingWarning: str(raw.parkingWarning) ?? f.parkingWarning,
        parkingDetail: str(raw.parkingDetail) ?? f.parkingDetail,
        parkingFeeLabel: str(raw.parkingFeeLabel) ?? f.parkingFeeLabel,
        parkingFee: str(raw.parkingFee) ?? f.parkingFee,
        amenities: strList(raw.amenities) ?? f.amenities,
        cctvTitle: str(raw.cctvTitle) ?? f.cctvTitle,
        cctvDetail: str(raw.cctvDetail) ?? f.cctvDetail,
        dutyText: str(raw.dutyText) ?? f.dutyText,
        dutyWarning: str(raw.dutyWarning) ?? f.dutyWarning,
    };
}

/** 내용·기본값 규칙은 공개 모델과 같게 두고, 같은 원본 행의 키만 추가한다. */
export function mergeInfoForManage(raw: Raw): StudioInfoForManage {
    const info = mergeInfo(raw);
    const withSourceKeys = <T extends object,>(rows: T[], source: unknown): (T & { _key?: string })[] => {
        const originals = objList(source);
        return rows.map((row, i) => {
            const key = str(originals?.[i]?._key);
            return { ...row, _key: key || undefined };
        });
    };
    return {
        ...info,
        services: withSourceKeys(info.services, raw?.services),
        equipment: withSourceKeys(info.equipment, raw?.equipment),
        memberships: withSourceKeys(info.memberships, raw?.memberships),
    };
}
