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

const ROOM_A: StudioSpaceData = {
    name: "W.L Studio [A Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "삼익 업라이트 피아노 su-121",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커",
        "문 커튼",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다."],
    images: ["/images/room_a_3.jpg", "/images/room_a_2.jpg", "/images/room_a_1.jpg"],
};

const ROOM_B: StudioSpaceData = {
    name: "W.L Studio [B Room]",
    prices: [
        { label: "기본", value: "5,000", unit: "원 / 1H" },
        { label: "회원", value: "2,000", unit: "원 / 1H" },
    ],
    features: [
        "야마하 P - 115",
        "공기청정기",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공",
        "유튜브 및 영상 작업에 용이한 조명 설치 완료",
        "블루투스 스피커",
        "문 커튼",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"],
    images: ["/images/room_b_3.jpg", "/images/room_b_2.jpg", "/images/room_b_1.jpg"],
};

const ROOM_C: StudioSpaceData = {
    name: "W.L Studio [C Room]",
    prices: [
        { label: "기본", value: "7,000", unit: "원 / 1H" },
        { label: "회원", value: "4,000", unit: "원 / 1H" },
    ],
    features: [
        "SAMICK UPRIGHT PIANO (삼익 업라이트 피아노)",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "데스크 비치",
        "1~3명까지 수용 가능",
        "냉방과 온풍 가능한 방",
    ],
    notes: [
        "* 방음문 : C룸은 들어갈때 기준으로 비밀번호 입력 후 문을 아래로 내려주시고 두번째 문은 열때 올려주시면 됩니다. 닫을 때는 문을 꾹 밀어주시고 반대로 해주시면 됩니다.",
    ],
    images: ["/images/room_c_2.jpg", "/images/room_c_3.jpg"],
};

const ROOM_D: StudioSpaceData = {
    name: "W.L Studio [D Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "업라이트피아노",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"],
    images: ["/images/room_d_1.jpg", "/images/room_d_2.jpg", "/images/room_d_3.jpg"],
};

const LOBBY: StudioSpaceData = {
    name: "Study Together, 함께 성장하는 공간",
    subtitle: "로비 & 1인 데스크",
    prices: [{ label: "이용 금액", value: "1,000", unit: "원 / 1H" }],
    description:
        "저는 사람이 같이 있을 때 시너지가 난다고 생각합니다. 혼자 공부하거나, 뭔가를 계획하려고 할 때, 집에서는 늘어지고 카페에서는 제한된 시간이 아쉽다고 생각한적이 많아서 준비하게 되었어요. 공부를 하시는 분들, 사업 계획서나 개인 업무를 준비하는 분들, 각자 자신만의 목표를 이루고 싶은 분들이 편하게 오셔서 몰입할 수 있는 공간을 만들고 싶었습니다. 시간에 얽매이지 않고, 원하는 때 집중할 수 있는 환경이 되길 바라며 이곳을 준비했습니다.",
    features: [
        "24시간 연중무휴 운영",
        "로비데스크 & 중앙 로비 1인 데스크 & 소파 이용 가능",
        "음식 주문 가능 (음식물 관련 규정은 추후 조정 예정)",
        "모든 이용객에게 커피 & 티 제공 (셀프 서비스)",
    ],
    notes: [
        "* 스터디 집중을 위해 서로 방해되지 않도록 조용한 분위기 유지",
        "* 개별 음악 연습방 이용 불가",
        "* 원활한 운영을 위해 예약 후 노쇼(No-Show) 금지",
    ],
    images: ["/images/lobby_1.jpg", "/images/lobby_2.jpg"],
};


export const FALLBACK_ROOMS: StudioSpaceData[] = [ROOM_A, ROOM_B, ROOM_C, ROOM_D];
export const FALLBACK_LOBBY: StudioSpaceData = LOBBY;
