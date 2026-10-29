# 의존성 보안 업데이트 기록

2026-10-26 기준. 시작 커밋: `79eec70`.

## 적용 버전

| 패키지 | 이전 설치 | 업데이트 후 |
|---|---|---|
| Next.js | 16.3.0 | 16.4.3 |
| sharp (Next.js 하위) | 0.35.3 | 0.35.5 |
| Sanity | 5.31.1 | 5.31.2 |
| next-sanity | 12.1.1 | 13.4.0 |
| Vitest | 3.2.7 | 4.1.12 |
| DOMPurify (Sanity 하위) | 3.4.13 | 3.4.17 |

`@next/bundle-analyzer`와 `eslint-config-next`도 Next.js와 같은 16.4.3으로 맞췄다. DOMPurify, undici, zod, Vite 등은 상위 패키지가 허용하는 범위 안에서 잠금 파일을 갱신했다. 강제 `overrides`는 추가하지 않았다.

Sanity는 기존 5 계열의 유지보수 버전을 유지한다. next-sanity 12 설치 시 공식 지원 경고가 나와 [제작자의 v13 이전 안내](https://github.com/sanity-io/next-sanity/blob/main/packages/next-sanity/MIGRATE-v12-to-v13.md)를 확인한 뒤 13.4.0으로 올렸다. 현재 앱은 `defineLive`·`SanityLive`와 제거된 미리보기 훅을 사용하지 않는다. 기존 `client.fetch`와 자체 캐시 태그 방식을 유지하며 Cache Components를 새로 도입하지 않았다.

Vitest는 Node 지원 범위를 유지할 수 있는 4.1.12를 사용한다. 기존 테스트 구성 변경 없이 163개 테스트가 통과했고, 취약점이 보고된 Tinypool은 의존성 트리에서 빠졌다.

## 보안 조회 결과

동일 날짜에 `npm audit --json`과 `npm audit --omit=dev --json`으로 확인했다.

| 범위 | 시점 | Critical | High | Moderate | 합계 |
|---|---|---:|---:|---:|---:|
| 전체 | 업데이트 전 | 4 | 12 | 8 | 24 |
| 전체 | 업데이트 후 | 0 | 4 | 8 | 12 |
| 개발 전용 제외 | 업데이트 전 | 2 | 12 | 5 | 19 |
| 개발 전용 제외 | 업데이트 후 | 0 | 4 | 5 | 9 |

숫자는 npm의 취약 패키지 집계이며, 하나의 하위 패키지 문제가 상위 패키지에도 집계된다. 독립적인 공격 개수나 실제 운영에서 악용된 건수가 아니다. 현재 설치된 Next.js, sharp, DOMPurify, Vitest는 최종 audit의 취약 패키지 목록에 없다.

## 남은 항목과 대응

### Sanity CLI 경로: 9개 패키지 항목 (High 4, Moderate 5)

- `@sanity/cli -> @sanity/runtime-cli -> adm-zip@0.5.18`
- `@sanity/cli -> @vercel/frameworks -> js-yaml@3.13.1`
- `@sanity/cli -> typeid-js -> uuid@10.0.0`
- 위 하위 의존성의 경고가 `sanity`와 `next-sanity`에도 전파되어 집계된다.

Sanity 5.31.2는 `@sanity/cli ^6.7.2`, 해당 CLI는 `@sanity/runtime-cli ^15.1.3` 및 `@vercel/frameworks 3.21.1`을 사용한다. 이 범위의 호환 업데이트로는 위 세 경로를 모두 해소하지 못했다. npm의 자동 강제 수정 제안은 Sanity 5.14.1 또는 next-sanity 11로 내려가는 변경도 포함하므로 적용하지 않았다.

실행 시 사용하지 않는 CLI 의존성도 `--omit=dev` 집계에 남는다. 이 숫자만으로 공개 페이지에서 해당 공격 경로가 실행된다고 단정하지 않는다. Sanity 5 유지보수 릴리스의 의존성 변경을 추적하고, 필요하면 별도 작업으로 Sanity 메이저 이전·CLI 분리를 검토한다. 패키지 버전 범위를 강제로 무시하는 덮어쓰기는 검증 없이 추가하지 않는다.

### Tailwind 3 경로: Moderate 3개 패키지 항목

- `tailwindcss@3.4.19 -> postcss-selector-parser@6.1.5`
- `tailwindcss -> postcss-nested -> postcss-selector-parser`

선택자 파싱의 CPU 고갈 경고이며 CSS 빌드 도구 경로다. 상위 버전 범위를 벗어나는 parser 강제 변경이나 Tailwind 4 전환은 이번 업데이트에 포함하지 않았다. Tailwind 메이저 전환 시 기존 CSS 설정·레이아웃·브라우저 화면 회귀 검증과 함께 다룬다.

## 호환 코드 정리

새 ESLint/React 검사기가 기존 코드에서 지적한 부분을 다음처럼 정리했다.

- `ImageCropper`: 렌더 시 호출하는 커링 함수 대신 이벤트 콜백에서 드래그 시작 처리를 호출한다. 렌더마다 생성되는 크기 객체를 의존하던 불필요한 `useCallback`도 제거했다. 자르기 영역 계산은 유지했다.
- `WorksClient`: 페이지 번호를 URL에서 직접 읽어 effect 안의 상태 동기화를 제거했다. URL 변경·뒤로가기·앞으로가기에 같은 값을 사용한다.

## 검증

- `npm test`: 12개 파일, 163개 테스트 통과.
- `npm run typecheck`: 통과.
- `npm run lint`: 통과.
- `npm run build`: 기본 Turbopack 빌드 통과, 정적 페이지 28/28 생성.
- 빌드된 로컬 서버에서 스모크 24/24 통과: 공개 페이지, 사이트맵, 미인증 관리자 차단, noindex, 보안 헤더.
- 테스트용 비밀번호로 로컬 로그인 후 `/manage` 및 관리자 주요 경로·`/admin` 10곳의 서버 응답 확인.
- 새 이미지 최적화 경로에서 WebP 응답 200 확인.
- 실제 Works 컴포넌트를 격리 실행해 첫 페이지·다음 페이지·URL 이동·뒤로가기 상태·범위 밖 페이지 보정 확인.
- 실제 사진 자르기 컴포넌트를 격리 실행해 드래그·키보드 크기 조절·모서리 크기 조절 확인.

콘텐츠 저장·삭제와 운영 배포는 수행하지 않았다. 로컬 검증 서버는 종료했다. 브라우저 전체 E2E나 운영 Sanity 쓰기 검증을 수행했다는 의미는 아니다. 이전 전체 코드 감사의 다른 기능 결함은 이번 의존성 보안 업데이트의 수정 범위에 포함되지 않는다.

## 유지보수 방법

- 재현 가능한 설치에는 커밋된 `package-lock.json`과 `npm ci`를 사용한다.
- 업데이트 후 전체·운영 의존성 audit를 따로 확인하고, 남은 항목은 상위 패키지 경로와 함께 기록한다.
- `npm audit fix --force` 결과를 검토 없이 적용하지 않는다. 구버전으로 내려가거나 메이저가 바뀔 수 있다.
- 날짜가 지나면 조회 결과가 달라질 수 있으므로 이 문서는 당시의 기록으로 사용한다.
