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

/** 5~8단계 이전 시점의 하드코딩 값과 같다 */
export const FALLBACK_INFO: StudioInfo = {
    services: [
        {
            title: "VOCAL RECORDING",
            price: "100,000 KRW",
            priceUnit: "/ 2 Hours",
            points: ["최상의 컨디션을 위한 쾌적한 레코딩 환경", "최고급 컨덴서 마이크 및 아웃보드 사용", "디렉팅 및 기초적인 튠 포함"],
        },
        {
            title: "AUDIO OUTSOURCING",
            price: "Contact for Quote",
            priceUnit: "",
            points: ["보컬 에디팅 (튠, 타이밍 박자 보정)", "믹싱 (Mixing)", "마스터링 (Mastering)", "팟캐스트 및 유튜브 음향 보정"],
        },
    ],
    equipment: [
        { title: "Microphones", items: ["Neumann U87 Ai", "AKG C414 XLII", "Shure SM7B"] },
        { title: "Outboard &\nInterface", items: ["Universal Audio Apollo x8", "Rupert Neve Designs Shelford Channel", "Tube-Tech CL 1B"] },
        { title: "Monitoring", items: ["Focal Trio6 Be", "Yamaha NS-10M Studio"] },
    ],
    memberships: [
        { num: "1", label: "1개월 회원권", sub: "1 Month Pass", price: "40,000" },
        { num: "3", label: "3개월 회원권", sub: "3 Months Pass", price: "110,000" },
        { num: "5", label: "5개월 회원권", sub: "5 Months Pass", price: "160,000" },
    ],
    membershipNote: "쿠폰은 구입 후 한 달간 사용 가능하며,\n네이버에서 구입 후 즉시 회원가로 예약(사용) 가능하십니다.",
    guidelinesIntro:
        "음악과 예술을 사랑하는 사람으로써 연습실을 사용하시면서 좋은 점과 부족한 점들을 말씀해주시면 보완을 해드릴 수 있는 선에서 최선을 다해 보완해드리겠습니다.\n이 공간에서 좋은 연습이 되시길 바랍니다.",
    parkingWarning: "주차가 불가합니다.",
    parkingDetail: "중곡역 4번출구 앞\n한전부지 임시 공영주차장 3분거리",
    parkingFeeLabel: "요금",
    parkingFee: "10분 400원 / 1시간 2,400원",
    amenities: ["냉·온·얼음 정수기", "델리코 반자동 커피머신"],
    cctvTitle: "CCTV 24시간 촬영 중",
    cctvDetail: "고객님들의 안전과 보호를 위해 화장실 통로, 로비, 계단 촬영 중",
    dutyText: "연습실 기자재를 내 물건처럼 사용 부탁드립니다.",
    dutyWarning: "파손시 배상 요청드립니다.",
};

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
