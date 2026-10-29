/**
 * 고객 고유 콘텐츠의 기본값(= Sanity 문서가 없거나 조회가 실패할 때 공개 화면에 나가는 값).
 *
 * 평소에는 Sanity 값이 화면에 쓰이고, 이 값은 예비다. 다른 고객용으로 설치할 때는 이 파일을 그 고객의 내용으로
 * 바꾸거나(또는 시드로 Sanity 문서를 모두 만든 뒤 중립 값으로 바꾸고) 옛 고객 정보가 새 사이트에 나가지 않게 한다.
 * 이름·주소·설명 같은 사이트 정체성 값은 ./site.ts에 있다.
 */
import type { SiteSettings } from "@/lib/site-settings";
import type { StudioSpaceData } from "@/lib/studio-spaces";
import type { StudioInfo } from "@/lib/studio-info";

/** 네이버 지도 예약 페이지 URL */
export const NAVER_MAP_URL =
    "https://map.naver.com/p/entry/place/1935361517?placePath=/ticket&from=map&fromPanelNum=1&additionalHeight=76&locale=ko&svcName=map_pcv5&searchType=place&lng=127.0841546&lat=37.5660654&c=15.00,0,0,0,dh";

/** 네이버 지도 장소 페이지 URL (예약 없이 위치 안내용) */
export const NAVER_MAP_PLACE_URL =
    "https://map.naver.com/p/entry/place/1935361517?lng=127.0841546&lat=37.5660654&placePath=%2Fhome&entry=plt&searchType=place";

/** 사이트 공통 연락처·링크·홈페이지 소개 문구의 기본값 */
export const DEFAULT_SETTINGS: SiteSettings = {
    phone: "0507-1331-7285",
    addressKo: "서울특별시 광진구 능동로 413-1 지하1층",
    addressEn: "B1, 413-1, Neungdong-ro, Gwangjin-gu, Seoul, Republic of Korea",
    mapQuery: "서울특별시 광진구 능동로 413-1",
    naverMapPlaceUrl: NAVER_MAP_PLACE_URL,
    naverReservationUrl: NAVER_MAP_URL,
    instagramUrl: "https://www.instagram.com/wl_musicstudio/",
    blogUrl: "https://blog.naver.com/bkh__official",
    homeHeadline: "당신의 이야기가\n음악이 되는 곳",
    homeIntro:
        "W.L Studio는 단순히 소리를 녹음하는 것을 넘어,\n아티스트가 전하고자 하는 진심과 감정을\n가장 순수한 형태로 담아내는 공간입니다.\n\n최상의 장비와 쾌적한 환경,\n그리고 프로페셔널한 크루들이\n당신만의 특별한 작품을 완성할 수 있도록 함께합니다.",
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


export const DEFAULT_ROOMS: StudioSpaceData[] = [ROOM_A, ROOM_B, ROOM_C, ROOM_D];
export const DEFAULT_LOBBY: StudioSpaceData = LOBBY;

/** /studio의 서비스·장비·멤버십·이용 안내 기본값 */
export const DEFAULT_INFO: StudioInfo = {
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
