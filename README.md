# White Light Studio

서울 광진구 중곡동 보컬 연습 스튜디오 화이트라이트 스튜디오의 공식 홈페이지입니다.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Sanity CMS** — 작업물(Works), 크루(Crew), 강사(Instructor), 스튜디오 공간·안내, 사이트 설정 콘텐츠 관리
- **Tailwind CSS**, **motion**(구 framer-motion), **Lenis** 스무스 스크롤
- 로컬 폰트: Pretendard Variable

## 개발 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

환경변수는 `.env.example`을 참고해 `.env.local`을 만드세요.

## 콘텐츠 관리

두 가지 방법으로 콘텐츠를 편집할 수 있습니다.

1. **`/manage`** — 강사·Crew·Works·Studio·Contact(연락처·링크·홈페이지 소개 문구)를 설문지 형태로 고치는 간편 관리 화면. CSS나 코드를 몰라도 사용할 수 있습니다.
2. **`/admin`** — Sanity Studio. 새 오디오 파일 업로드, 자유서식 블록, 문서 이력 복구처럼 `/manage`에서 못 하는 작업용 전문 CMS 화면입니다.

`/manage`를 쓰려면 `MANAGE_PASSWORD`, `MANAGE_SECRET`, `SANITY_API_WRITE_TOKEN` 환경변수가 필요합니다 (`.env.example` 참고).
사용법·구조·백업/복구·새 영역 추가 패턴은 **[MANAGE_GUIDE.md](MANAGE_GUIDE.md)** 를 보세요.

## 주요 명령어

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npm test         # 자동 테스트
npm run typecheck # 타입 검사
npm run smoke    # 떠 있는 서버 핵심 경로 점검
npm run analyze  # 번들 크기 분석
```

보안 업데이트 내역과 남은 의존성 경고의 대응은 [의존성 보안 기록](docs/DEPENDENCY_SECURITY.md)을 참고하세요.
공개 화면의 동작 줄이기 구현과 수동 검증 범위는 [접근성 회귀 점검](docs/REDUCED_MOTION_QA.md)에 정리했습니다.
모바일 조작 영역·페이지 탐색·긴 콘텐츠 줄바꿈 검증은 [모바일 화면 점검](docs/MOBILE_LAYOUT_QA.md)을 참고하세요.
제목·기본 버튼·대체 텍스트 점검은 [공개 화면 의미 구조 점검](docs/PUBLIC_SEMANTICS_QA.md)에 기록했습니다.
작품 상세 404의 해결과 Next Page/metadata slug 규약은 [주소 처리 검증](docs/PUBLIC_ROUTE_ENCODING_QA.md)을 참고하세요. `npm run smoke`는 사이트맵의 작품·Crew 상세 본문도 검사합니다.
이미지 실패·빈 Crew·로딩 안내는 [공개 콘텐츠 대체 처리 점검](docs/PUBLIC_CONTENT_FALLBACK_QA.md)에 정리했습니다.
작품 자유 서식의 링크·제목·목록 출력과 검증 범위는 [자유 서식 점검](docs/WORK_RICH_TEXT_QA.md)을 참고하세요.
페이지별 정규 주소와 OG/Twitter 공유 정보는 [검색·공유 메타데이터 점검](docs/PUBLIC_METADATA_QA.md)에 기록했습니다.
JSON-LD의 날짜·주소·전화 정합성과 남은 의미 분류 확인은 [구조화 데이터 점검](docs/STRUCTURED_DATA_QA.md)을 참고하세요.
관리자 저장·삭제·복원 이후의 공개 반영과 외부 CMS 변경의 한계는 [캐시 갱신 점검](docs/CACHE_INVALIDATION_QA.md)에 정리했습니다.
로그인·만료 경계·관리 데이터 접근 차단과 세션 운영 주의사항은 [관리자 세션 점검](docs/MANAGE_SESSION_QA.md)을 참고하세요.
이미지의 서버 사전 검사·용량 기준·기존 사진 보존은 [관리자 이미지 업로드 점검](docs/MANAGE_IMAGE_UPLOAD_QA.md)에 기록했습니다.
관리자 미리보기 주소와 연락처·서비스 링크의 저장/공개 검사 기준은 [관리자 링크 점검](docs/MANAGE_LINK_QA.md)을 참고하세요.
Works·Crew 본문 한도 초과 시 데이터 보존과 검사 범위는 [본문 저장 한도 점검](docs/MANAGE_CONTENT_LIMITS_QA.md)에 기록했습니다.
블록·프로필·사진·가격·링크의 긴 키 보존과 중복 차단은 [배열 식별 키 점검](docs/MANAGE_ARRAY_KEYS_QA.md)을 참고하세요.
Studio 공간·서비스·장비·멤버십·안내의 초과 입력 차단은 [Studio 저장 한도 점검](docs/STUDIO_CONTENT_LIMITS_QA.md)에 기록했습니다.
누락·잘못된 자료형을 빈 목록으로 저장하지 않게 하는 검증은 [Studio JSON 구조 점검](docs/STUDIO_JSON_SHAPE_QA.md)을 참고하세요.
안내의 서비스·장비·멤버십 원본 키 왕복과 새 항목 키 발급은 [Studio 안내 키 보존 점검](docs/STUDIO_INFO_KEYS_QA.md)에 기록했습니다.
Works·Crew 본문의 잘못된 구조와 미디어·보존 참조 검사는 [본문 입력 구조 점검](docs/BODY_INPUT_SHAPE_QA.md)을 참고하세요.
관리자 조회 시 URL 없는 사진 행과 Crew 원본 링크 키의 보존은 [조회·저장 원본 보존 점검](docs/MANAGE_READ_PRESERVATION_QA.md)에 기록했습니다.
연락처·Studio 안내의 최초 설정·대체 표시·안전한 읽기 실패 구분은 [설정 읽기 상태 점검](docs/MANAGE_SETTINGS_READ_QA.md)을 참고하세요.
강사·Crew·Works·공간 상세의 비정상 자료형·원본 참조 키·투영 누락에 대한 폼 진입 보호는 [상세 원본 읽기 점검](docs/MANAGE_DETAIL_READ_QA.md)에 기록했습니다.
네 관리자 목록·휴지통의 응답 검사와 손상된 썸네일의 오류 격리는 [목록 원본 읽기 점검](docs/MANAGE_LIST_READ_QA.md)을 참고하세요.
허브 요약 조회의 독립적인 실패 안내와 빈 이력·스냅샷 응답 검사는 [허브·이력 읽기 점검](docs/MANAGE_HUB_HISTORY_READ_QA.md)에 기록했습니다.
커밋된 잠금 파일과 같은 버전으로 설치하려면 `npm ci`를 사용합니다.

## 배포

Vercel에 배포합니다. `main` 브랜치에 푸시하면 자동 배포됩니다.
