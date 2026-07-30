> ## ⚠️ 이 문서는 현재 시스템과 맞지 않습니다 (2026-07-30 확인)
>
> 아래 내용은 데이터가 코드에 하드코딩되어 있던 **과거 방식**을 설명합니다.
> 현재는 Sanity CMS(`/admin`)로 이관되어, 문서가 지목하는
> `CLASSES` / `ALBUMS` 배열과 `works/[id]` 경로는 **더 이상 존재하지 않습니다.**
>
> 실제 콘텐츠 수정은 `/admin` 에서 하십시오.
> 이 문서는 이력 참고용으로만 남겨둡니다.

---

# White Light Studio - WORKS 업데이트 가이드 및 프롬프트 템플릿

이 문서는 추후 새로운 앨범/작업물을 `WORKS` 페이지에 동일한 고퀄리티 디자인과 규칙으로 추가하기 위해 만들어진 **가이드라인**입니다.
이후 저나 다른 AI 코딩 어시스턴트에게 새로운 앨범 추가를 요청하실 때, 아래의 **[요청 양식]**을 복사해서 내용을 채워 주시면 이전에 작업했던 방식 그대로 완벽하게 반영됩니다.

---

## 📋 새로운 작업물 추가 요청 양식 (복사해서 사용하세요)

> **💡 사용 방법**: 채팅창에 앨범 커버 이미지를 드래그 앤 드롭으로 업로드하신 후, 아래 텍스트를 복사하여 괄호 `[...]` 안의 내용만 채워 전송해 주세요.

```text
[새로운 앨범 추가 요청]
위 사진을 "[저장할 영문 파일명(예: new_album_artist)]"으로 저장하고, WORKS에 지금의 레이아웃 규칙에 맞춰 추가해줘.

* 아티스트명 : [아티스트 이름]
* 인스타그램 : [@인스타아이디 / 없으면 생략]
* 앨범 타이틀 : [앨범명 / 대괄호 제외]
* 발매일 : [YYYY-MM-DD 형식]
* 유튜브 링크 : [클릭 시 연결될 영상이나 플레이리스트 URL]

[작품 소개글 / 코멘트]
(이곳에 앨범 소개글, 비하인드 스토리, 작업기 등을 자유롭게 적어주세요. 단락을 나누거나 길어져도 괜찮습니다.)

[Credit]
(크레딧 정보를 아래에 나열해 주세요. 인스타그램 아이디를 적어주면 자동으로 링크가 생성됩니다.)
예시:
Composed by OOO
Lyrics by OOO
Arranged by OOO
Mixed & Mastered by White Light Studio(오승환) @shcord_re
Vocal Recording @wl_musicstudio
```

---

## 💻 AI가 지켜야 할 일관성 가이드 (AI 참조용 지시문)

> **💡 설명**: 위 양식만 전달하시더라도, 과거의 문맥을 잊지 않도록 AI가 반드시 참조하게 될 내부 디자인 규칙입니다.

1. **파일 구조 및 메인 갤러리 (`src/app/works/page.tsx`)**
   - 사진은 `public/images/` 경로에 저장하고 링크합니다.
   - `ALBUMS` 배열에 새 데이터를 추가할 때, 날짜를 `YYYY. MM. DD.` 형식으로 포맷팅하여 입력합니다.
   - 메인 갤러리는 `date` 값을 기준으로 항상 **최신순(내림차순) 정렬**을 엄격히 유지합니다.
   - 갤러리에 출력되는 앨범 타이틀은 지저분해 보이지 않도록 `[ ]` 같은 대괄호를 뺀 순수 텍스트로 등록합니다.

2. **상세 페이지 구조 (`src/app/works/[id]/page.tsx`)**
   - 페이지 헤더 타이틀 영역의 **인스타그램 핸들(@)**은 아티스트 이름 옆에 나란히 두지 않고, 아티스트 이름 아래에 **작고 세련된 폰트 사이즈(`text-xs md:text-sm text-neutral-400 hover:text-neutral-800 tracking-widest`)**로 분리하여 중앙 정렬합니다.
   - `<a href="https://instagram.com/아이디">` 형태로 새 창 열기(`target="_blank"`)를 적용하여 클릭 가능한 버튼으로 만듭니다.
   - 앨범 커버 이미지는 기존 템플릿의 반응형 쉐도우 및 `hover` 효과(JYP 스타일의 `+` 중앙십자가 오버레이 및 줌인 효과)를 동일하게 부여합니다.
   - 크레딧(`{/* Credits Section */}`) 텍스트 안에 포함된 모든 `@인스타아이디` 요소 역시 하이퍼링크 문법으로 감싸 클릭이 되도록 치환합니다.
   - 상세 페이지 배경 색상은 반드시 완전한 빈 화면(Clean White, `bg-white`)을 유지합니다.
   - `Release Date` 텍스트 영역은 꾸밈 요소 없는 심플한 `<p>` 태그 스타일(`text-center text-xs md:text-sm text-neutral-500`)을 적용하여 다른 작품들과 일치되게 만듭니다.
   - **(NEW) 매거진 스타일(Magazine-Style) 크레딧 레이아웃 & 애니메이션 적용:**
     - 크레딧 최상위 컨테이너는 분할 가능한 `grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16` 구조로 만듭니다.
     - 각 크레딧 카테고리의 제목(`h4`)은 `text-black font-black uppercase text-sm md:text-base border-b border-neutral-200 pb-2 mb-4 tracking-wider` 스타일을 부여합니다.
     - 역할(Role)과 이름(Name)은 `w-32` 또는 `w-40 text-neutral-400 font-bold uppercase tracking-wider text-[10px] pt-0.5` 너비를 고정하여 다단 레이아웃을 형성합니다.
     - `framer-motion`의 `Variants` 기능을 사용하여 Stagger(순차적 페이드업) 애니메이션을 적용합니다. 컨테이너에 `containerVariants`를, 각 크레딧 블록(`motion.div`)에 `itemVariants`를 부여해 부드럽게 나타나도록 구현합니다.

---
앞으로도 위 템플릿 하나만 복사해서 쭉- 붙여넣어 주시면, 모든 페이지가 단 한 번의 요청으로 완벽하게 완성됩니다!
