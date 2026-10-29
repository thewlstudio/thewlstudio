# 작품 상세 404: slug 경계 처리 수정

## 결과

로컬 프로덕션 빌드에서 `n@di – 사랑의 형태`의 원문 @ 주소와 `%40` 주소가 모두 HTTP 200과 정상 본문을 반환한다. CMS slug는 바꾸지 않았다. canonical과 MusicRecording JSON-LD 주소는 `/works/With_you_n%40di`로 일치한다.

## 확인한 원인

설치된 **Next.js 16.4.3**의 다음 경로가 서로 다른 표현을 전달하고 있었다.

| 입력 지점 | 전달되는 slug 예시 | 처리 |
| --- | --- | --- |
| CMS / generateStaticParams | `With_you_n@di` | 원문 유지 |
| generateMetadata | `With_you_n@di` | 원문 검증·조회 |
| Page params | `With_you_n%40di` | 진입점에서 한 번 해석 → 원문 검증·조회 |
| 목록·canonical·사이트맵 URL | `/works/With_you_n%40di` | 원문에서 encodeURIComponent 한 번 |

설치 소스에서 `shared/lib/router/utils/get-dynamic-param.js`의 `getParamValue()`가 encodeURIComponent를 적용하고, `getDynamicParam()`이 그 값을 사용자 Page 코드에 전달하는 것을 확인했다. `server/app-render/create-component-tree.js`도 이 값을 Page params로 사용한다. 반면 `lib/metadata/resolve-metadata.js`는 interpolatedParams의 원문을 메타데이터에 넘긴다.

기존 본문은 Page params도 원문이라고 가정해 `%40`가 들어간 문자열로 CMS를 조회했다. 해당 조회는 null이어서 notFound가 발생했다. 제목 메타데이터는 원문으로 조회해 정상인 상태였다.

## 수정 범위

- `decodePublicPageSlug`를 Works·Crew의 **Page 진입점**에만 적용했다. 해석은 한 번뿐이며, 이후 원문 slug 검증을 다시 한다.
- 메타데이터·CMS·generateStaticParams에는 적용하지 않는다. 원문 URL 생성 규칙도 유지한다.
- 실제 `/`, 역슬래시, 제어 문자, dot segment, 앞뒤 공백, 잘못된 URI/유니코드는 저장소 조회 전에 거부한다.
- CMS 이름에 들어 있는 리터럴 `%2F`와 URL이 의미하는 `/`를 구분한다. 예: Page 값 `literal%252Fname`은 `literal%2Fname`까지만 해석하고 다시 `/`로 바꾸지 않는다.
- 기존 테스트는 Next route matcher의 해석까지만 검사해 그 뒤의 재인코딩 단계를 놓쳤다. 이제 설치된 Next의 `getDynamicParam()`까지 통과시켜 실제 Page 규약을 검사한다. 이 내부 API는 **테스트에서만** 사용한다.
- 스모크 검사는 사이트맵에서 Works·Crew 상세를 발견해 `200 + h1 본문`까지 확인한다. 사이트맵의 외부 호스트에는 요청하지 않고 지정한 점검 서버의 경로만 사용한다. 현재 콘텐츠에서는 24개에서 35개 검사로 늘었다.

## 검증

- 전체 자동 테스트 **1,034개 / 46개 파일**, 타입 검사·ESLint·프로덕션 빌드 통과.
- @, 한글, +, 내부 공백, ?, #, 리터럴 %, 리터럴 %2F/%40 등은 원문 조회와 canonical이 일치한다.
- 잘못된 인코딩·인코딩된 경로 구분자·제어 문자·잘못된 유니코드가 거부되는 회귀 테스트 포함.
- 로컬 스모크 **35/35 통과**: 작품 8개와 Crew 3개 상세를 포함한다.
- 사이트맵 기준 공개·상세 **17/17 HTTP 200**. main 안의 h1 1개, 빈 제목·제목 단계 건너뜀·잘못된 목록/버튼 자식 없음.
- Chrome에서 직접 접속, Works 목록 링크로 앱 내 이동, 뒤로/앞으로 이동 확인. 본문 제목·canonical·본문 시작 포커스 정상, 콘솔 오류/경고 없음.

검증 중 이전 로컬 산출물이 섞인 클라이언트 화면이 관찰돼 기존 `.next`를 `/private/tmp/whitelight-next-cache-Ry8IEh/previous-build`로 백업한 뒤 깨끗하게 빌드했다. 최종 HTTP·브라우저 검증은 이 새 산출물로 수행했다. 이 캐시 정리는 원래 404의 코드 수정과 별도다.

## 운영 및 후속 주의

- 운영 문서·환경변수·의존성·커밋·배포는 변경하지 않았다. 이 결과는 로컬 빌드 기준이며 운영 반영은 별도다.
- Next 업그레이드 시 Page/metadata 규약이 달라질 수 있으므로 계약 테스트와 실제 상세 스모크를 다시 실행한다. 이 동작이 모든 Next 버전에 동일하다고 가정하지 않는다.
- 실제 VoiceOver/NVDA·물리 모바일 검증을 했다는 의미는 아니다.
