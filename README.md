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
npm run smoke    # 떠 있는 프로덕션 서버 핵심 경로 점검
npm run analyze  # 번들 크기 분석
```

로컬 개발 서버에서도 점검하려면 `SMOKE_DEV_CSP=1 npm run smoke`를 사용하세요. 이 옵션은 로컬 주소에서만 공개 페이지의 개발용 스크립트 설정을 허용합니다.

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
Works·Crew의 미지원 본문 표시와 손실 가능한 옛 수상·활동의 자동 전환 보호는 [예전 형식·미지원 본문 점검](docs/MANAGE_LEGACY_CONTENT_QA.md)을 참고하세요.
일반 본문·중첩 항목의 `new-` 원본 키 보존과 새 항목 발급 문맥은 [본문 키 왕복 점검](docs/MANAGE_BODY_KEYS_QA.md)에 기록했습니다.
일반 본문의 추가 정보가 재작성으로 빠지는 경우의 저장 차단은 [본문 추가 필드 보호](docs/MANAGE_BODY_EXTRA_FIELDS_QA.md)를 참고하세요.
공간 가격·Studio 안내 배열의 추가 필드 손실 차단과 가격 원본 키 보존은 [Studio 배열 원본 보호](docs/STUDIO_ARRAY_FIELDS_QA.md)에 기록했습니다.
Crew 링크의 전체 사전 검사·추가 필드 보존과 강사 소개/과정 입력 보호는 [프로필 부가 목록 저장 점검](docs/PROFILE_LISTS_QA.md)에 기록했습니다.
기본 텍스트·선택값의 파일/중복 검사와 수정 시 누락된 선택 항목 보존은 [관리자 기본 입력 점검](docs/MANAGE_SCALAR_INPUT_QA.md)에 기록했습니다.
이미지 중복 전송·비정상 업로드 응답·기존 사진 참조와 Works 업로드 전 검사 순서는 [이미지 경계 점검](docs/MANAGE_IMAGE_BOUNDARY_QA.md)에 기록했습니다.
새 항목의 주소 중복 응답·안전한 다음 순서값·업로드 전 조회 완료와 동시 생성 한계는 [생성 전 검증 점검](docs/MANAGE_CREATE_PREFLIGHT_QA.md)에 기록했습니다.
생성 성공 응답·불명확한 결과·캐시 갱신 실패의 구분과 재추가 안내는 [생성 결과 점검](docs/MANAGE_CREATE_RESULT_QA.md)에 기록했습니다.
단일 문서 수정·휴지통·이력 복원의 응답 검사와 변경 후 화면 갱신 실패 안내는 [패치 결과 점검](docs/MANAGE_PATCH_RESULT_QA.md)에 기록했습니다.
순서 변경의 트랜잭션 응답·변경 문서 집합 검사·무변경/갱신 실패 구분은 [순서 결과 점검](docs/MANAGE_ORDER_RESULT_QA.md)에 기록했습니다.
순서 요청의 중복·빈 슬롯과 조회 목록의 문서 버전·순서 자료형 검사는 [순서 입력 점검](docs/MANAGE_ORDER_INPUT_QA.md)을 참고하세요.
삭제·복원의 원본 휴지통 상태와 문서 식별·버전 검사, 정상 반복 요청과 충돌 보호 범위는 [휴지통 상태 점검](docs/MANAGE_TRASH_STATE_QA.md)에 기록했습니다.
연락처·Studio 안내의 문서 없음/비정상 응답 구분과 고정 ID 생성·기존 버전 수정 보호는 [단일 설정 저장 대상 점검](docs/MANAGE_SINGLETON_TARGET_QA.md)을 참고하세요.
이력 복원의 명시적 시점·자체 문서 식별 정보 검사와 소수 초·미지원 본문 보존은 [이력 복원 입력 점검](docs/MANAGE_HISTORY_INPUT_QA.md)에 기록했습니다.
복원 버튼의 비정상 응답·이동 호출 오류 안내와 성공 알림 예약 순서는 [이력 복원 화면 처리 점검](docs/MANAGE_HISTORY_CLIENT_QA.md)을 참고하세요.
일반 삭제·휴지통 복원·알림 되돌리기의 이동/새로고침 호출 오류와 알림 순서는 [휴지통 화면 처리 점검](docs/MANAGE_TRASH_CLIENT_QA.md)에 기록했습니다.
강사 복제 완료 후 이동 호출 실패의 재복제 방지와 기존 복사본 열기는 [복제 화면 처리 점검](docs/MANAGE_DUPLICATE_CLIENT_QA.md)을 참고하세요.
여섯 저장 폼의 refresh 호출 오류·오래된 기준값으로 버리기/재저장 차단은 [폼 새로고침·기준값 점검](docs/MANAGE_FORM_REFRESH_QA.md)에 기록했습니다.
서버의 저장/생성 확인 후 캐시 실패 표시와 폼 기준값 보호 연결은 [서버 저장 확인 상태 점검](docs/MANAGE_COMMITTED_SAVE_QA.md)을 참고하세요.
관리자 동적 렌더링·Sanity CDN 비활성·공개 ISR 분리와 응답 캐시 헤더 검사는 [관리자 읽기 캐시 점검](docs/MANAGE_READ_CACHE_QA.md)에 기록했습니다.

미리보기 진입·종료의 비캐시 응답과 내부 이동 경계 검사는 [미리보기 응답 점검](docs/MANAGE_PREVIEW_RESPONSE_QA.md)에 기록했습니다.

미리보기 쿠키만 남은 만료·로그아웃 요청의 비공개 조회 차단은 [미리보기 세션 점검](docs/MANAGE_PREVIEW_SESSION_QA.md)에 기록했습니다.

공개 상세·공유 정보·사이트맵의 노출 조건과 관리자 미리보기 noindex 검사는 [공개 노출 경계 점검](docs/PUBLIC_VISIBILITY_QA.md)에 기록했습니다.

사이트맵 수정일의 출처·날짜 검증과 비정상 조회 응답 격리는 [사이트맵 응답 점검](docs/SITEMAP_RESPONSE_QA.md)에 기록했습니다.

Works·Crew의 빌드 시 주소 생성에서 잘못된 행·조회 실패를 구분하는 검사는 [정적 상세 주소 점검](docs/PUBLIC_STATIC_PARAMS_QA.md)에 기록했습니다.

네 공개 목록의 서버 입력 검증과 오류 화면 재조회는 [공개 목록 읽기 점검](docs/PUBLIC_LIST_READ_QA.md)에 기록했습니다.

Works·Crew 상세 본문/공유 정보의 공통 입력 검사와 미지원 원본 보존은 [공개 상세 읽기 점검](docs/PUBLIC_DETAIL_READ_QA.md)에 기록했습니다.

상세 서버 경로와 제목 포커스·본문 바로가기 연결은 [상세 페이지 포커스 점검](docs/DETAIL_PAGE_FOCUS_QA.md)에 기록했습니다.

오류·404의 재시도, 홈 복귀, 제목 초점과 정적 404의 경로 처리 범위는 [복귀 화면 점검](docs/RECOVERY_SCREEN_QA.md)에 기록했습니다.

로딩 중 이전 화면을 숨길 때의 메뉴·모달 잠금 해제와 재표시는 [로딩 전환 점검](docs/PUBLIC_LOADING_TRANSITION_QA.md)에 기록했습니다.

공개 화면과 관리 화면을 이름이 아닌 실제 경로 구분자로 구별하는 기준은 [화면 경로 구분 점검](docs/UI_ROUTE_SCOPE_QA.md)에 기록했습니다.

본문 바로가기의 대기 요청과 별도 탭 클릭 구분은 [공개 링크 동작 점검](docs/PUBLIC_LINK_INTERACTION_QA.md)에 기록했습니다.

이미지 대체 표시와 파일 오류 뒤 오디오 진행 바의 처리 기준은 [미디어 실패 상태 점검](docs/PUBLIC_MEDIA_FAILURE_QA.md)에 기록했습니다.

로딩 전환에서 오디오 재생·탭 표시 정리와 재표시 시 수동 재생 원칙은 [오디오 화면 수명 점검](docs/PUBLIC_AUDIO_LIFETIME_QA.md)에 기록했습니다.

관리자 생성 알림의 섹션 주소 보존과 안내 만료·타이머 정리는 [관리자 알림 수명 점검](docs/MANAGE_TOAST_LIFETIME_QA.md)에 기록했습니다.

커밋된 잠금 파일과 같은 버전으로 설치하려면 `npm ci`를 사용합니다.

프로젝트는 **Node 26**을 사용합니다. 개발·CI·백업은 `.nvmrc`의 26, Vercel은 `engines.node`의 `26.x`를 따라 같은 메이저 버전을 선택합니다. Sanity 6 자체의 최소 요구사항(22.12)과는 별개인 프로젝트 정책이며, 다음 메이저로 자동 전환하지 않습니다. 잠금 파일 복구와 CSP 경계 검증은 [Sanity 6 설치 점검](docs/SANITY6_INSTALL_QA.md), 남은 취약점은 [보안 추적 기록](docs/DEPENDENCY_SECURITY.md)을 참고하세요.

GitHub 검사·백업 도구의 버전 고정과 프로젝트 Node 버전의 구분은 [자동 검사 도구 점검](docs/CI_ACTION_RUNTIME_QA.md)에 기록했습니다.

테스트 설정의 기본·native 로딩 호환성과 경로 유지 검증은 [Sanity 6 설치 점검의 후속 기록](docs/SANITY6_INSTALL_QA.md#테스트-설정의-native-로딩-호환성-2026-11-18)을 참고하세요.

스모크의 정확한 로그인 이동 대상·스트리밍 판정·요청 제한 시간·수신 실패 처리는 [스모크 점검 기록](docs/SMOKE_AUTH_REDIRECT_QA.md)에 기록했습니다.

## 배포

Vercel에 배포합니다. `main` 브랜치에 푸시하면 자동 배포됩니다.
