/**
 * 사이트(고객) 고유 값 모음.
 *
 * 다른 고객용으로 설치할 때는 이 파일의 값과 `.env`(NEXT_PUBLIC_SITE_URL), Sanity 콘텐츠만 바꾼다.
 * 화면·메타데이터·구조화 데이터가 같은 값을 쓰므로 한 곳을 고치면 모두 따라온다.
 * (전화·주소·링크·소개 문구처럼 관리 화면에서 고치는 값은 여기가 아니라 Sanity 설정 문서에 있다.)
 */

/** 화면·제목·로고 표기(대문자) */
export const SITE_NAME = "WHITE LIGHT STUDIO";
/** 두 줄로 나눠 크게 쓰는 표기(푸터·연락처) */
export const SITE_NAME_LINES = ["WHITE LIGHT", "STUDIO"] as const;
/** 한글 표기 — 설명문·이미지 대체 텍스트에 쓴다 */
export const SITE_NAME_KO = "화이트라이트 스튜디오";
/** 문장 속 영문 표기 — 지도 제목·검색 결과 설명에 쓴다 */
export const SITE_NAME_TEXT = "White Light Studio";

/** 검색 결과·공유 미리보기에 나오는 사이트 설명 */
export const SITE_DESCRIPTION = "서울 광진구 중곡동의 음악 스튜디오. 보컬·악기 연습실, 음악 레슨, 녹음 및 음악 제작 서비스를 제공합니다.";

/** 환경변수가 없을 때 쓰는 기본 주소(개발·미리보기 배포용) */
export const DEFAULT_SITE_URL = "https://whitelightstudio.vercel.app";

/**
 * 환경변수가 없을 때 쓰는 Sanity 프로젝트 ID(이 고객의 프로젝트).
 * 새 고객 설치에서는 반드시 NEXT_PUBLIC_SANITY_PROJECT_ID를 설정하고(`npm run provision -- check`가 확인), 이 값도 그 고객 것으로 바꾼다.
 */
export const DEFAULT_SANITY_PROJECT_ID = "antidcuz";

/** 사이트 주소. 끝의 `/`는 제거한다. */
export function getSiteUrl(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/**
 * 각 공개 페이지의 검색 결과 설명. 업종·주소가 들어가는 고객 고유 문구라 이 파일에 둔다.
 * (페이지 제목 WORKS/CREW 등과 경로는 코드 구조에 속해서 lib/public-metadata.ts에 있다.)
 */
export const SECTION_DESCRIPTIONS = {
    works: `${SITE_NAME_KO}에서 제작된 음악 작업물 포트폴리오`,
    crew: `${SITE_NAME_KO}의 프로듀서, 엔지니어, 크루 소개`,
    studio: `${SITE_NAME_KO} 연습실 안내 - A, B, C, D Room 시설 및 가격 정보`,
    class: `${SITE_NAME_KO} 음악 클래스 - 보컬, 기타, 피아노, 작곡, 플룻 레슨`,
    contact: `${SITE_NAME_KO} 위치 안내 - 서울특별시 광진구 능동로 413-1 지하1층, 7호선 중곡역 3번 출구`,
} as const;
