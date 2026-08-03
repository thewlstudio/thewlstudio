---
description: How to add a new album to the Works page
---

# Adding a New Album to the Works Page

⚠️ 이 프로젝트는 더 이상 코드에 작업물 데이터를 직접 쓰지 않습니다. `src/app/works/page.tsx`에는
`ALBUMS` 배열이 없고(Sanity CMS에서 `sanityFetch`로 불러옴), `src/app/works/[id]/page.tsx`도
존재하지 않습니다(동적 라우트 `src/app/works/[slug]/page.tsx`가 모든 작업물을 공용으로 처리).
아래 절차 대신 **Sanity를 통해** 작업물을 추가하세요.

## 방법 A — Sanity Studio에서 직접 (권장)

1. `/admin` 경로로 접속해 로그인합니다.
2. "Work / Project" 문서 타입에서 새 문서를 만듭니다.
3. 아래 필드를 채웁니다 (스키마: `src/sanity/schemaTypes/workType.ts`):
   - `title` — 앨범 타이틀 (대괄호 `[ ]` 제외)
   - `artist` — 아티스트명
   - `slug` — URL 경로 (title에서 자동 생성, 필요시 직접 수정)
   - `releaseDate` — **반드시 `YYYY. MM. DD.` 형식** (예: `2023. 10. 06.`). 이 문자열 그대로 정렬 기준이 되므로 형식이 틀리면 목록 순서가 깨집니다.
   - `coverImage` — 앨범 커버 이미지 업로드
   - `youtubeUrl` — 커버 클릭 시 연결할 유튜브 링크 (선택)
   - `instagramId` / `instagramUrl` — 아티스트 인스타그램 (선택)
   - `contentBlocks` — 상세 페이지를 구성하는 블록들 (Description, Tracklist, Credit Grid, Image, Video 등). 순서는 드래그로 조정 가능.
4. 저장하면 ISR(최대 1시간) 또는 `revalidateTag`로 사이트에 반영됩니다.

## 방법 B — 채팅으로 요청받아 대신 입력할 때

사용자가 이미지와 정보를 채팅으로 제공하며 "작업물 추가해줘"라고 요청하면:

1. Sanity 쓰기 클라이언트(`src/sanity/lib/writeClient.ts`)를 사용해 `work` 타입 문서를 생성한다.
   (직접 파일을 만들거나 배열을 수정하지 않는다 — 반드시 Sanity 문서로 생성한다.)
2. 이미지는 `client.assets.upload('image', buffer, { filename })`로 Sanity에 업로드한 뒤 참조로 연결한다.
3. `releaseDate`는 `YYYY. MM. DD.` 형식을 정확히 지킨다.
4. 완료 후 `updateTag('work')`와 `revalidatePath('/works')`를 호출해 즉시 반영한다.
5. 결과를 요약해 사용자에게 알린다.

## 참고

- 실제 렌더링 컴포넌트: `src/app/works/WorksClient.tsx`(목록), `src/app/works/[slug]/WorkDetailClient.tsx`(상세)
- GROQ 쿼리: `src/sanity/lib/queries.ts`의 `worksQuery`, `workBySlugQuery`
