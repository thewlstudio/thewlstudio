# 새 고객 설치 가이드

한 고객 = 코드 사본 1개 + Sanity 프로젝트 1개 + Vercel 프로젝트 1개. (배경: [판매 준비 설계서](SALES_READINESS_DESIGN.md) §0·§3)
이 문서를 처음부터 끝까지 따라 하면 고객 사이트와 `/manage`가 열려야 한다. 마지막에 [인계 체크리스트](HANDOVER_CHECKLIST.md)로 확인한다.

> **검증 상태:** 환경변수 생성·점검(`npm run provision`)은 실제로 실행해 확인했다. 그러나 **빈 Sanity 프로젝트에서 처음부터 끝까지 설치해 본 시연은 아직 하지 않았다.** 첫 설치 때 이 문서와 실제가 다른 곳이 나오면 이 문서를 고친다. (§9)

## 0. 준비물
- GitHub 계정(고객 저장소를 만들 곳), Sanity 계정, Vercel 계정. 고객이 직접 소유하는 계정을 쓰는 것을 권장한다(데이터 소유 = 고객).
- 이 컴퓨터에 Node.js(`.nvmrc` 버전, 최소 20.19)와 이 저장소.
- 고객에게 받을 것: 상호(한·영), 사이트 소개 한 줄, 전화·주소·지도 링크·SNS 링크, 로고와 사진, (있다면) 도메인.

## 1. 코드 사본 만들기
1. 이 저장소를 **템플릿 저장소**(GitHub → Settings → Template repository 체크)로 지정해 두면, 고객마다 "Use this template"로 새 저장소를 만들 수 있다.
2. 고객 저장소를 내려받아 `npm ci`.
3. 이후 고객별 수정은 §3의 파일과 콘텐츠에만 한다. (나중에 템플릿의 수정을 가져올 때 충돌이 적다.)

## 2. Sanity 프로젝트 만들기
1. sanity.io/manage → **Create project**. 데이터셋 이름은 `production`.
2. **데이터셋은 공개(public)로 둔다.** 홈페이지가 토큰 없이 콘텐츠를 읽는 구조라서다. 그래서 **비밀번호·개인정보 같은 것은 이 데이터셋에 절대 넣지 않는다.** (판매 준비 설계서 §2-2)
3. 프로젝트 → API → **CORS origins**에 사이트 주소(`https://고객도메인`, Vercel 기본 주소)와 `http://localhost:3000`을 추가. Studio(`/admin`) 로그인을 위해 *Allow credentials*를 켠다.
4. 프로젝트 → API → Tokens → **Add API token**: 권한 **Editor**. 값은 한 번만 보이므로 바로 복사해 둔다(§5에서 Vercel에 넣는다).
5. 프로젝트 ID(8자 영문 소문자·숫자)를 기록한다.

## 3. 사이트 값 채우기 (고객별로 바꾸는 파일은 이 셋뿐)
| 파일 | 무엇 |
|---|---|
| `src/config/site.ts` | 상호(한·영·두 줄 표기), 사이트 설명, 기본 사이트 주소, 기본 Sanity 프로젝트 ID(`DEFAULT_SANITY_PROJECT_ID`) |
| `src/config/default-content.ts` | 전화·주소·링크·홈페이지 소개 문구, 연습실·로비, 서비스·장비·멤버십·이용 안내, 네이버 지도 주소 |
| `public/images/` | 로고(`studio_logo.jpg` 등)와 사진. 연습실 사진은 시드 스크립트가 여기서 Sanity로 올린다 |

- 이 값들은 Sanity에 문서가 있으면 **Sanity 값이 우선**이고, 문서가 없거나 조회가 실패할 때만 공개 화면에 나간다. 그래서 옛 고객 정보가 남아 있지 않도록 반드시 고객 값으로 바꾼다. (`npm test`의 "고객 고유 문구는 config/site.ts에만 둔다" 가드가 다른 파일에 박히는 것을 막는다.)
- 고객이 **같은 업종(음악 스튜디오)이고 현재 페이지 구성 그대로**일 때만 이 방법으로 충분하다. 구성이 다르면 별도 작업(설계서 §3-3).
- 바꾼 뒤 `npm run lint && npm run typecheck && npm test`.

## 4. 환경변수 만들기
```bash
npm run provision -- init --project-id <§2의 프로젝트 ID> --site-url https://<고객 도메인 또는 Vercel 주소> --write
```
- 로그인 비밀번호(20자)와 세션 시크릿(64자)을 만들어 `.env.local`에 저장하고(권한 600), **Vercel에 입력할 값 목록**을 보여 준다. `--write`를 빼면 파일은 만들지 않고 내용만 보여 준다. 이미 `.env.local`이 있으면 덮어쓰지 않고 멈춘다.
- 비밀번호는 **이 화면과 `.env.local`에만** 있다. 고객 소유자에게 안전한 경로(비밀번호 관리 도구 등)로 전달하고 채팅·이메일 본문에는 적지 않는다.
- 점검: `npm run provision -- check --local` (로컬용), 운영용 값 파일이면 `npm run provision -- check --env-file <파일>`. 값은 출력하지 않고 문제만 알려 준다. **오류가 0이 될 때까지** 고친다. 점검 항목: 프로젝트 ID 형식·원래 고객 값 잔존, `https` 주소, 비밀번호·시크릿 강도, 쓰기 토큰.
- **로컬 `.env.local`에는 쓰기 토큰(`SANITY_API_WRITE_TOKEN`)을 넣지 않는다.** 넣으면 개발 서버의 저장이 실제 데이터셋에 써진다.

## 5. 초기 콘텐츠 시드
Sanity 문서가 비어 있으면 공개 화면이 기본값(§3)으로 나가므로, 먼저 문서를 만든다. 인증은 `npx sanity login`(CLI 토큰) 또는 환경변수 `SANITY_API_WRITE_TOKEN`.
```bash
# 1) 미리보기(기본) — 무엇을 만들지 확인
npx tsx scripts/migrate-site-settings.ts
npx tsx scripts/migrate-home-intro.ts
npx tsx scripts/migrate-studio-info.ts
npx tsx scripts/migrate-studio-spaces.ts
# 2) 실제로 만들기 — 각각 --apply
npx tsx scripts/migrate-site-settings.ts --apply   # …나머지도 같은 방식
```
- 스크립트는 `.env.local`의 프로젝트·데이터셋을 대상으로 하고, 시작할 때 `대상: <프로젝트> / <데이터셋>`을 출력한다. **그 줄이 고객의 프로젝트가 맞는지 확인한 뒤** `--apply` 한다.
- 이미 있는 문서는 건드리지 않아서(`createIfNotExists`/`setIfMissing`) 다시 실행해도 안전하다.
- 강사·Crew·Works는 시드가 없다. 고객이 `/manage`에서 직접 만들거나 설치자가 대신 입력한다.

## 6. Vercel 배포
1. Vercel → Add New → Project → 고객 저장소 import (Framework: Next.js).
2. Settings → Environment Variables에 §4가 출력한 목록을 **Production**(필요하면 Preview도)에 입력. `SANITY_API_WRITE_TOKEN`은 §2-4의 Editor 토큰.
3. Deploy. 빌드가 끝나면 Vercel 기본 주소(`*.vercel.app`)가 생긴다.
4. 도메인을 연결했다면 `NEXT_PUBLIC_SITE_URL`을 그 도메인으로 바꾸고 **다시 배포**(값은 빌드 시점에 들어간다). 사이트맵·canonical·공유 미리보기가 새 주소로 나오는지 확인.
5. §2-3의 CORS에 최종 도메인도 추가.

## 7. 인수 검사
```bash
npm run smoke https://<고객 사이트 주소>   # 공개 페이지·관리 화면 보호·noindex·보안 헤더
```
통과하면 [인계 체크리스트](HANDOVER_CHECKLIST.md)의 수동 점검(약 5분: 저장·미리보기·복원)을 한다.

## 8. 문제 해결
| 증상 | 확인 |
|---|---|
| `/manage`에 로그인이 안 된다 | Vercel에 `MANAGE_PASSWORD`·`MANAGE_SECRET`이 모두 있는지, 값을 바꾼 뒤 **재배포**했는지 |
| 저장 버튼을 누르면 "쓰기 불가" 안내 | `SANITY_API_WRITE_TOKEN`이 Vercel에 있는지, Editor 권한인지 |
| 홈페이지에 옛 고객 정보가 나온다 | Sanity 문서가 비어 있어 기본값(§3)이 나가는 중 → §5 시드, §3 값 확인 |
| 홈페이지가 빈 내용·오류 | `NEXT_PUBLIC_SANITY_PROJECT_ID`가 고객 프로젝트인지, 데이터셋이 **공개**인지 |
| `/admin` 로그인이 안 된다 | Sanity CORS에 현재 주소와 *Allow credentials* |
| 저장했는데 홈페이지가 안 바뀐다 | 저장은 즉시 갱신(태그 재검증)한다. 안 되면 Vercel 로그의 서버 액션 오류 확인 |
| 도메인 변경 후 공유 미리보기가 옛 주소 | `NEXT_PUBLIC_SITE_URL` 변경 후 재배포 |

## 9. 알려진 한계·다음 확인
- 빈 프로젝트 전체 시연 미실시(위 상단 참고). 첫 설치 때 소요 시간과 막힌 곳을 이 문서에 기록한다.
- 모든 저장이 한 쓰기 토큰·공유 비밀번호로 이뤄진다(계정·권한은 설계서 S4·S5).
- 오류 모니터링(Sentry)과 자동 백업은 아직 없다(설계서 S3). 인계 전 [백업 절차](../MANAGE_GUIDE.md)를 한 번 시험하고 위치를 고객에게 알린다.
- Studio(`/admin`)의 Presentation 미리보기는 읽기 토큰을 발급해 `defineEnableDraftMode`로 연결하기 전까지 쓸 수 없다. `/manage`의 미리보기는 별개로 동작한다.
