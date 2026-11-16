import "server-only";
import { PHOTO_PRESETS } from "./instructor-photo-presets";

type Rule = { name: string; label: string; id?: string; choices?: readonly string[] };
type Issue = { error: string; fields: { id: string; label: string }[] };
const text = (fields: Record<string, string>): Rule[] => Object.entries(fields).map(([name, label]) => ({ name, label }));
const visibility: Rule = { name: "isActive", label: "공개 상태", id: "visibility", choices: ["true", "false"] };
const document = (id: string): Rule => ({ name: "documentId", label: "수정할 항목", id });
const RULES = {
    instructor: [document("instructorName"), visibility, ...text({ instructorName: "강사 이름", category: "클래스 이름", subtitle: "한 줄 소개", lessonInfo: "레슨 형태", about: "레슨 소개", process: "커리큘럼", portfolioUrl: "포트폴리오 주소", portfolioText: "작업물 설명", portfolioBtn: "작업물 버튼" }), { name: "imagePosition", label: "사진 위치", id: "photo-position" }],
    crew: [document("name"), visibility, ...text({ name: "영문 이름", koName: "한글 이름", role: "직책/역할", slug: "주소(영문)" }), { name: "sectionsJson", label: "프로필 섹션", id: "sections" }],
    work: [document("title"), visibility, ...text({ title: "앨범(작품) 제목", artist: "아티스트", releaseDate: "발매일", youtubeUrl: "유튜브 주소", instagramId: "인스타그램 계정", instagramUrl: "인스타그램 주소", slug: "주소(영문)" }), { name: "blocksJson", label: "상세 페이지 내용", id: "blocks" }],
    space: [document("name"), visibility, ...text({ name: "이름", subtitle: "한 줄 소개", description: "공간 설명" }), { name: "kind", label: "공간 종류", id: "name", choices: ["room", "lobby"] }, { name: "listsJson", label: "공간 입력", id: "name" }],
    settings: text({ phone: "전화번호", addressKo: "한글 주소", addressEn: "영문 주소", mapQuery: "지도 검색어", naverMapPlaceUrl: "네이버 지도 장소 주소", naverReservationUrl: "네이버 예약 주소", instagramUrl: "인스타그램 주소", blogUrl: "블로그 주소", homeHeadline: "홈페이지 소개 제목", homeIntro: "홈페이지 소개 본문" }),
    studioInfo: [{ name: "dataJson", label: "스튜디오 안내", id: "services" }],
} satisfies Record<string, Rule[]>;
const failure = (id: string, label: string): Issue => ({ error: `${label}: 입력 형식을 확인하지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.`, fields: [{ id, label }] });

/** 단일 문자열 계약만 확인한다. 누락은 필수 검증/부분 패치 정책에 맡기며 값을 강제 변환하지 않는다. */
export function manageScalarIssue(data: FormData, area: keyof typeof RULES): Issue | null {
    for (const rule of RULES[area] as Rule[]) {
        const values = data.getAll(rule.name);
        if (!values.length) continue;
        const value = values[0];
        if (values.length !== 1 || typeof value !== "string" || rule.choices && !rule.choices.includes(value)) return failure(rule.id ?? rule.name, rule.label);
    }
    return null;
}

/** 목록 밖의 예전 서버 값은 동일한 값으로 유지할 때만 허용한다. 새 임의 클래스는 받지 않는다. */
export function instructorPositionIssue(data: FormData, existing?: unknown): Issue | null {
    if (!data.has("imagePosition")) return null;
    const value = data.get("imagePosition");
    return typeof value === "string" && (PHOTO_PRESETS.some((preset) => preset.value === value) || value === existing)
        ? null : failure("photo-position", "사진 위치");
}
