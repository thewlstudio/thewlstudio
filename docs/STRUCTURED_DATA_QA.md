# 공개 구조화 데이터(JSON-LD) 점검

## 확인한 문제와 수정

### 발매일

- 작품 JSON-LD의 `datePublished`에 표시용 `YYYY. MM. DD.` 문자열이 그대로 전달되고 있었다. [datePublished](https://schema.org/datePublished)의 Date 값은 [ISO 날짜](https://schema.org/Date)여야 한다.
- `jsonLdDate`에서 현재 CMS 형식과 정확한 `YYYY-MM-DD`를 받아 날짜만 변환한다. 윤년과 월별 일수도 확인한다. 날짜·시간대·생성일을 추측하지 않는다.
- 형식이 모호하거나 존재하지 않는 날짜는 해당 JSON-LD 필드만 생략한다. 2월 30일을 3월로 넘겨 보정하지 않는다.
- 본문·관리자 입력·저장 문서는 변경하지 않는다. 원래 작품 객체도 그대로 클라이언트에 전달한다.

### 스튜디오 관계

- 기존 `recordedAt`에는 `MusicVenue` 장소를 넣고 있었다. 공식 [recordedAt 규약](https://schema.org/recordedAt)은 장소가 아니라 녹음된 Event를 요구한다.
- 실제 이벤트 문서나 이벤트 정보가 없으므로 이 잘못된 선언은 제외했다. 가상의 녹음 이벤트를 생성하거나 전체 작품이 이곳에서 만들어졌다는 `locationCreated` 관계로 바꾸지 않았다.
- 스튜디오 Organization 자체와 Crew의 기존 조직 관계는 유지한다.

### 스튜디오 주소·전화·URL

- 루트 Organization 주소는 시·구만 하드코딩되어 있었고 도로명 주소·전화가 없었다. `getSiteSettings`로 이미 가져온 공개 화면의 설정을 사용하도록 변경했다. 설정 조회 실패 시의 기존 항목별 기본값 정책은 그대로다.
- [Google Organization 문서](https://developers.google.com/search/docs/appearance/structured-data/organization)의 `PostalAddress` 객체 형식을 유지한다. 공개된 전체 주소를 `streetAddress`에 전달하며, 자유 입력 주소를 시·구·우편번호로 추측 분할하지 않는다.
- 전화는 공개 화면의 값 그대로 전달한다. 국제 전화번호나 별도 연락처를 임의로 만들어내지 않는다.
- 사이트 URL 끝의 슬래시를 정리해 로고·상세·Crew 조직 URL이 중복 슬래시로 달라지지 않게 했다. 기존 slug 인코딩과 이미지 크기 제한은 유지했다.

### 기존 안전 처리

- 세 출력 지점 모두 `serializeJsonLd`를 유지한다. `<`를 이스케이프해 CMS 문자열이 `</script>`로 태그를 닫지 못하게 한다.
- 설치된 Next.js 16.4.3의 `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`를 읽고 일반 script 요소 사용과 안전한 직렬화 방식을 재확인했다.

## 검증

### 자동 테스트

- 회귀 테스트 **50개 추가**: 정상·윤년·잘못된 날짜·모호한 입력, 실제 서버 컴포넌트의 원본 날짜 유지, 잘못된 이벤트 선언 제외, 설정 주소·전화 반영, 문자열 이스케이프, 끝 슬래시와 특수문자 상세 주소 처리.
- 루트 컴포넌트 테스트는 글꼴과 설정 조회를 대체해 반환된 실제 script 내용을 검사한다. 설정이 바뀌는 경우는 합성 데이터로만 검사했으며 CMS에 쓰지 않았다.
- 전체 **1,206개 / 52개 파일** 통과. 타입 검사·ESLint·프로덕션 빌드 통과.

### 최종 프로덕션 HTML

최종 빌드를 localhost에서 실행하고 사이트맵의 공개 **17개 경로**에 봇·일반 요청을 보내 **34/34 응답, JSON-LD script 56개**를 검사했다.

- 각 페이지에 Organization 한 개, 작품·Crew 상세에 해당 상세 객체 한 개.
- Organization의 주소·전화가 실제 Contact 본문과 동일하고 `PostalAddress` 형식임을 확인.
- JSON-LD 상세 주소 = canonical = OG 주소. `%40`이 포함된 실제 작품 경로도 확인.
- 상세 제목·이름·이미지와 공개 본문·공유 이미지 일치.
- 작품 **8건** 모두 화면의 기존 날짜와 같은 날을 ISO 날짜로 전달. 예: `2024. 05. 21.`은 본문에 유지되고 JSON-LD에는 `2024-05-21`.
- 작품에 잘못된 `recordedAt`이나 임의 `locationCreated` 선언 없음.
- 실제 Crew 3건의 기존 조직 이름·사이트 URL 일치.

기존 경로 스모크도 **35/35 통과**했다. 공개 본문, 관리 경로의 인증 차단, noindex, 보안 헤더를 포함한다. 검증용 로컬 서버는 종료했다.

## 남은 의미 분류 확인

현재 CMS에는 작품의 곡/앨범 구분, 아티스트의 개인/그룹 구분 필드가 없다. 기존 코드는 모든 작품을 `MusicRecording`, 아티스트를 `Person`으로 선언한다. 이번에는 이 분류를 임의로 바꾸지 않았다.

[MusicRecording](https://schema.org/MusicRecording)은 보통 단일 트랙이고 [MusicAlbum](https://schema.org/MusicAlbum)은 트랙 모음이며, [byArtist](https://schema.org/byArtist)는 Person/MusicGroup을 구분한다. 이름이나 표시용 블록 개수만으로 분류하지 않고, 운영자의 콘텐츠 분류 정책을 확인한 후 별도 필드·기존 문서 대응 방식을 결정해야 한다. **이번 통과 결과가 이 의미 분류까지 모두 정확하다는 뜻은 아니다.**

## 범위와 한계

- 외부 Schema Markup Validator·Google Rich Results Test에 사이트 데이터를 업로드하지 않았다. 이번 검증은 공식 규약 검토, 프로젝트 회귀 테스트와 실제 응답 대조다. 검색 노출·리치 결과·순위 향상을 보장하지 않는다.
- 주소 구성 필드·영업시간·사업자 식별자·우편번호·소유/고용 관계를 새로 추정하지 않았다. 더 풍부한 LocalBusiness 모델은 별도 콘텐츠 확인이 필요하다.
- 기존 사업 소개 문구는 유지한다. 주소 이전이나 서비스 변경 때 설명 문구까지 자동으로 갱신하는 작업은 포함하지 않는다.
- 본문·디자인·관리자 저장 로직·스키마·운영 데이터·환경변수·의존성·커밋·배포는 변경하지 않았다. 검증용 Next 라우트도 추가하지 않았다.
