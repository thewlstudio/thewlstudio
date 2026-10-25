# /manage 운영·유지보수 가이드

스튜디오 운영자가 코드 없이 홈페이지를 고치는 `/manage`의 사용법과, 개발자가 알아야 할 구조·복구 방법을 한 곳에 정리한 문서입니다. (용어는 `GLOSSARY.md`)

---

## 1. 운영자: 무엇을 어디서 고치나

`/manage`에 로그인하면 관리 허브가 나옵니다.

| 영역 | 고치는 내용 | 비고 |
|---|---|---|
| 강사 | 수업 강사 소개·사진·수업 정보, 순서, 복제 | 삭제는 휴지통으로 이동(복원 가능) |
| Crew | 크루 프로필, 사진, 소셜 링크, 프로필 섹션(소개·경력·수상 등) | 섹션은 끌어서 또는 ▲▼로 순서 변경 |
| Works | 작업물 목록 정보, 커버 이미지, 링크, 상세 페이지 블록(설명·크레딧·트랙리스트·인사말·이미지·유튜브) | 오디오는 제목·아티스트만. 목록은 발매일 최신순 자동 정렬 |
| Studio | 연습실·로비 카드(사진·가격·특징), 서비스·장비·멤버십·이용 안내 | 로비는 홈페이지에 한 곳만 표시 |
| Contact | 전화·주소·지도 검색어, 네이버 지도/예약·인스타그램·블로그 링크, 홈페이지 소개 문구 | 모든 칸 필수. 지도는 주소만 입력 |

### 공통 사용법
- 저장하면 홈페이지에 **바로 반영**됩니다. (홈페이지는 최대 1시간 캐시되지만 저장 시 즉시 갱신됩니다.)
- 저장 전에는 하단에 "저장하지 않은 변경사항이 있어요"가 보이고, 다른 곳으로 이동하면 확인창이 뜹니다. "변경 버리기"로 마지막 저장 상태로 돌아갑니다.
- **삭제는 휴지통 이동**입니다. 목록 위 "휴지통 보기"에서 복원할 수 있습니다. 잠시만 숨기고 싶으면 삭제 대신 **비공개**를 쓰세요(강사·Crew·Studio 공간).
- 긴 편집 화면의 블록·섹션 카드는 접었다 펼 수 있습니다. 접어도 내용은 그대로 저장됩니다.
- 사진은 큰 파일을 골라도 브라우저가 자동으로 줄여서 올립니다(약 3MB 초과 불가).
- 삭제하면 화면 아래에 **되돌리기** 알림이 떠서 바로 복원할 수 있습니다. 새로 만들거나 복원했을 때도 알림이 나옵니다.
- 필수 칸(빨간 별 *)이 비어 있으면 저장 전에 그 칸 아래에 바로 안내하고 그 칸으로 이동합니다. **Ctrl+S(맥은 ⌘+S)** 로도 저장됩니다.
- 목록 줄과 수정 화면 제목 아래에 **마지막 수정** 시각이 표시됩니다. 처음 오셨다면 허브의 안내 카드나 상단 **사용 안내**(`/manage/help`)를 보세요.
- 로그인(12시간) 만료가 15분 이내로 다가오면 안내가 뜹니다. 작성 중인 내용은 화면에 남아 있으니 새 탭에서 다시 로그인한 뒤 저장하세요.
- 이 화면에서 못 하는 것: 새 오디오 파일 업로드, 자유서식(서식 있는 글) 블록 편집 → `/admin`(Sanity Studio)에서 합니다.

### 문제가 생겼을 때
- "저장 기능이 켜지지 않았습니다" 배너 → 환경변수 `SANITY_API_WRITE_TOKEN` 미설정 (개발자에게 요청).
- 로그인이 풀림 → 세션은 12시간 유효. 새 탭에서 다시 로그인하고 원래 화면에서 저장하면 됩니다(새로고침하면 작성 내용이 사라질 수 있음).
- 실수로 내용을 잘못 저장함 → `/admin`에서 해당 문서의 **문서 이력**으로 이전 내용을 되돌릴 수 있습니다.

---

## 2. 개발자: 구조

### 환경변수 (Vercel)
`MANAGE_PASSWORD`, `MANAGE_SECRET`(세션 서명), `SANITY_API_WRITE_TOKEN`(Editor 권한), `NEXT_PUBLIC_SITE_URL`, 그리고 Sanity 공개 설정(`NEXT_PUBLIC_SANITY_*`). 자세한 설명은 `.env.example`.
로컬에는 쓰기 토큰을 두지 않는 것이 기본이라 로컬 `/manage`는 읽기 전용(저장 버튼은 보이지만 쓰기 불가)입니다.

### Sanity 문서 종류
| 종류 | 문서 | 공개 화면 | 삭제 방식 |
|---|---|---|---|
| `instructor` | 강사별 | `/class` | `trashed` |
| `crew` | 크루별 | `/crew`, `/crew/[slug]` | `trashed` |
| `work` | 작업물별 | `/works`, `/works/[slug]` | `trashed` |
| `studioSpace` | 연습실·로비별(`kind: room|lobby`) | `/studio` | `trashed` |
| `studioInfo` | 하나(`_id: "studioInfo"`) | `/studio` | — |
| `siteSettings` | 하나(`_id: "siteSettings"`) | Contact·헤더·예약 버튼·홈 소개 | — |

- `trashed`(숨김 boolean)가 없는 기존 문서는 "삭제 안 됨"으로 취급합니다. 공개 쿼리는 `!(trashed == true)`로 거릅니다.
- 선택 필드를 비울 때는 `.set()`에 `undefined`를 넘기지 말고 `.unset()`을 쓰세요(값이 지워지지 않는 함정).
- 싱글톤(`studioInfo`, `siteSettings`)은 문서가 없거나 조회에 실패하면 코드의 기본값(`lib/studio-info.ts`, `lib/site-settings.ts`, `lib/studio-spaces.ts`)으로 공개 화면이 그려집니다. 문서가 있으면 값이 비어 있어도 그대로 보여줍니다(일부러 비운 항목이 되살아나지 않게).

### 코드 위치
- 화면: `src/app/manage/{instructors,crew,works,studio,contact}`, 공통 조각 `src/app/manage/_components/`(FormParts, useGuardedForm, ReorderButtons, RestoreButton, imageUpload, Collapse, listUi).
- 서버 액션은 각 영역의 `actions.ts`에서 매번 `requireAuth()` 후 Sanity 쓰기 클라이언트(`sanity/lib/writeClient.ts`)를 사용합니다.
- 저장 후 `updateTag(<태그>)` + `revalidatePath`로 공개 화면 캐시를 갱신합니다. (태그: `work`, `crew`, `studioSpace`, `studioInfo`, `siteSettings` 등)
- 작업물 블록·크루 섹션은 `lib/work-blocks*.ts`, `lib/crew-sections*.ts`가 클라이언트 모델과 서버 검증(정리)을 함께 정의합니다. 서버는 알려진 종류만 다시 만들고, 편집 불가 종류(자유서식·오디오 파일 등)는 기존 문서에서 `_key`로 그대로 가져옵니다.
- 업로드: 서버 액션 본문 한도를 `next.config.mjs`에서 4MB로 올렸고(Vercel 요청 한도 4.5MB), 브라우저에서 큰 사진을 줄여서 올립니다(`imageUpload.ts`). 더 큰 파일/오디오는 서버 액션으로 보낼 수 없습니다.

### 초심자 안내 장치 (온보딩)
- 화면마다 처음 들어오면 **말풍선 안내**가 나오고, 상단 "이 화면 안내"로 다시 봅니다. 허브의 **처음 설정 체크리스트**는 행동하면 자동 체크됩니다. **홈페이지 지도**(`/manage/map`)는 홈페이지의 각 부분을 어디서 고치는지 그림으로 보여줍니다. 칸 제목 옆 **?**를 누르면 설명이 펼쳐지고, 목록이 비어 있으면 첫 항목을 만드는 안내가 나옵니다.
- 기록은 브라우저(localStorage)에 저장돼 기기마다 따로입니다. "사용 안내" 맨 아래에서 다시 보이게 할 수 있습니다.
- 설계와 새 화면 추가 방법: `docs/ONBOARDING_DESIGN.md`. **홈페이지에 새 영역을 만들면 `map/page.tsx`의 그림도 함께 고쳐 주세요.**

### 관리 화면 문구 원칙
`/manage` 안내·오류 문구는 아래 기준으로 씁니다. (토스·삼성 UX 라이팅 가이드를 참고해 정리)
- **해요체로 통일**합니다. ("저장했어요", "반영돼요") 합쇼체와 섞지 않습니다. 단, 공개 페이지에 실제로 나가는 문구의 *예시*(예: "주차가 불가합니다")는 공개 페이지의 문체를 따릅니다.
- **오류에는 다음 행동을 함께** 적습니다. ("…읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요.")
- **전문 용어는 풀어서** 씁니다. ("https://로 시작하는 주소" → "브라우저 주소창의 주소를 복사해 붙여넣어 주세요", iframe → "지도 공유 코드")
- **되도록 긍정 표현**으로 씁니다. ("바꿀 수 없어요" → "고정돼요"). 되돌릴 수 없는 일처럼 반드시 알려야 하는 경고는 그대로 둡니다.
- 삭제 확인창의 "취소"는 그대로 둡니다. (취소가 곧 삭제를 하지 않는다는 뜻이라 "닫기"보다 정확함)

### 자동 검증 (테스트 · CI · 스모크)
- `npm test` — 단위·규칙 테스트(약 160개). 저장 검증(작업물 블록·크루 섹션), 순서 저장, 이력·되돌리기 규칙, 설정 병합, 문구 규칙, 투어·체크리스트, 화면 조각을 검사합니다. `manage-guards.test.ts`는 **지금까지 실제로 겪은 사고를 소스 규칙으로 고정**합니다(모든 서버 액션의 인증 확인, Ctrl+S가 저장 폼만 제출, `을(를)`·합쇼체·이모지 금지, 투어가 가리키는 요소 존재 등).
- `npm run typecheck`, `npm run lint`, `npm run build` — 타입·코드·빌드 검사.
- `npm run smoke [주소]` — 떠 있는 서버의 핵심 경로 점검(공개 페이지 200, 관리 화면은 로그인 없이 안 열림, noindex, 보안 헤더). 운영 서버에도 쓸 수 있습니다: `node scripts/smoke.mjs https://whitelightstudio.vercel.app`
- GitHub Actions(`.github/workflows/ci.yml`)가 푸시·PR마다 위 전체를 자동으로 돌립니다. 실패하면 Actions 탭에서 어느 단계인지 확인하세요.
- 새 기능을 만들면: 순수 로직은 `*.test.ts`로, 반복하기 쉬운 실수는 `manage-guards.test.ts`에 규칙으로 추가해 주세요.
- 한계: 브라우저를 직접 조작하는 화면 테스트(E2E)와 실제 Sanity 쓰기 테스트는 아직 없습니다. 오류 감시(Sentry 등)는 계정이 필요해 미설정입니다.

### 새 관리 영역을 만들 때 (패턴)
1. Sanity 스키마 추가 + `trashed` 숨김 필드, 공개 쿼리에 `!(trashed == true)`.
2. 공개 화면은 Sanity를 읽되 조회 실패 시 기본값으로 대체, 전환 전후 HTML(텍스트·클래스) 비교로 동일성 확인.
3. `manage/<영역>/` 목록·수정·새로 만들기·휴지통, 폼은 `useGuardedForm` + `FormParts` 사용.
4. 서버 액션에서 입력을 검증·정리(URL은 https와 허용 호스트, 빈 항목 제거, 길이 제한).
5. 고유 `_id` 문서로 데이터를 옮길 때는 `scripts/`에 재실행 안전한(`createIfNotExists`/`setIfMissing`) 이전 스크립트를 만들고 미리보기→`--apply` 순서로 실행.

### 이전 스크립트 (일회성, 재실행 안전)
`npx tsx scripts/<이름>.ts [--apply]` — 기본은 미리보기. 인증은 `sanity login`으로 저장된 CLI 토큰.
`migrate-studio-spaces.ts`, `migrate-site-settings.ts`, `migrate-studio-info.ts`, `migrate-home-intro.ts`

### 백업과 복구
- 전체 백업: `npx sanity dataset export production backups/dataset-$(date +%Y%m%d).tar.gz` (`backups/`는 git에서 제외됨)
- 특정 종류만: `npx sanity documents query '*[_type=="work"]' > backups/works.json`
- 복구: 문서 이력(Studio) 또는 `npx sanity dataset import <파일> production --replace`(주의: `--replace`는 같은 `_id`를 덮어씀).
- 큰 변경(스키마·데이터 이전) 전에는 해당 종류를 먼저 백업하세요.

### 알려진 한계
- 새 오디오 파일 업로드·자유서식 블록 편집은 `/admin`에서만 가능(쓰기 토큰을 브라우저에 노출하지 않기 위함).
- 페이지 메타 `description`과 JSON-LD의 주소/설명, Hero·헤더·푸터의 고정 문구는 코드에 있습니다.
- 도메인을 구매하면 Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`만 바꾸면 됩니다(코드 수정 불필요). 이후 사이트맵·canonical·OG가 새 주소로 나오는지 확인하세요.
