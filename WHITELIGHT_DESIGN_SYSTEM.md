# WHITE LIGHT STUDIO - Design System & Development Guide

이 문서는 화이트 라이트 스튜디오(White Light Studio) 웹사이트 리뉴얼 및 구축 과정에서 사용된 **전반적인 톤앤무드(Tone & Mood), 디자인 시스템, 그리고 개발 방식**을 종합적으로 정리한 가이드라인입니다. 추후 새로운 페이지를 추가하거나 기능을 수정할 때 일관된 브랜드 정체성을 유지하기 위한 지침서로 활용됩니다.

---

## 1. Core Concept & Tone & Manner (핵심 컨셉 및 분위기)

화이트 라이트 스튜디오의 디자인은 **"절제된 하이엔드(Refined High-end)"**와 **"본질에 집중하는 미니멀리즘(Essential Minimalism)"**을 핵심 가치로 삼습니다. 화려한 장식이나 불필요한 색상을 배제하고, 음악과 창작이라는 본질적인 행위에만 집중할 수 있는 묵직하고 신뢰감 있는 분위기를 연출합니다.

*   **JYP Entertainment Reference**: 글로벌 엔터테인먼트의 웹진 포맷에서 영감을 받아, 넓은 여백과 굵고 견고한 타이포그래피, 간결한 직선 요소(인라인 라인)를 적극 활용하여 규모감과 프로페셔널한 느낌을 동시에 줍니다.
*   **Chic & Cinematic**: 블랙 앤 화이트 톤의 시네마틱한 대비율을 사용하여, 스크롤을 내릴 때마다 한 편의 세련된 포트폴리오 북을 넘기는 듯한 몰입감을 제공합니다.

---

## 2. Color Palette (색상 시스템)

색상의 사용을 극도로 제한하여 방문자의 시선이 텍스트와 콘텐츠(포트폴리오 영상 등)에만 쏠리도록 의도되었습니다.

*   **Primary Backgrounds**:
    *   **Absolute Black (`#000000` / `bg-black`)**: 홈 화면, 스튜디오 룸 소개의 하단 및 전반적인 웹사이트의 근간이 되는 가장 깊고 묵직한 베이스 컬러입니다.
    *   **Pure White (`#FFFFFF` / `bg-white`)**: 클래스(Class), 웍스(Works), 컨택트(Contact) 등 정보 전달이 명확해야 하거나 활기찬 무드가 필요한 섹션에 주로 사용됩니다. (Black <-> White의 교차 사용으로 시각적 리듬감 부여)
    *   **Off-White / Neutral (`bg-neutral-50` / `bg-neutral-100`)**: 섹션 구분이 필요할 때 흰색 대신 미세하게 톤 다운된 배경색을 활용하여 눈의 피로를 최소화합니다.

*   **Typography & Accents**:
    *   **Primary Text (`text-white`, `text-black`, `text-[#111]`)**: 굵은 제목과 본문에 가장 진하게 들어가는 색.
    *   **Secondary Text (`text-neutral-400`, `text-neutral-500`, `text-[#666]`)**: 부가 가이드, 영어 로마자, 보조 정보에 은은하게 사용되어 위계를 조절합니다.
    *   **Divider Lines (`border-neutral-700/80` 등)**: 너무 눈에 띄지 않는 회색조 톤의 1.5px~2px 두께 선으로, 시선을 방해하지 않으면서도 공간을 분할합니다.

---

## 3. Typography (타이포그래피 및 서체)

굵고 임팩트 있는 고딕(Sans-serif) 폰트를 기반으로 극적인 크기 대비(Scale Contrast)를 줍니다.

*   **Section Headers**: `text-4xl`에서 `text-8xl`에 이르는 거대한 글로벌 사이즈(`font-black`, `uppercase`, `tracking-tighter`)를 사용하여 압도적인 규모감을 줍니다. 영문 타이포를 이미지처럼 활용하는 것이 특징입니다.
*   **Subheadings & Microcopy**: 자간(`tracking-widest`)을 굉장히 넓게 벌린 작고 가는 텍스트(`text-xs`~`text-sm`, `uppercase`)를 제목 위/아래에 배치하여 패션 매거진이나 고급 브로슈어의 캡션 같은 세련미를 더합니다.
*   **Line-height**: 본문을 읽을 때 숨이 트이도록 `leading-relaxed` 속성을 통해 줄간격을 여유롭게 세팅했습니다.

---

## 4. UI/UX Elements & Interactive Patterns

디자인 요소와 유저 경험(UX) 측면에서 사용한 대표적인 UI 패턴들입니다.

### 4.1. The "Inline Flex" Divider (JYP 스타일 라인)
*   **Concept**: 단순한 밑줄(`border-b`)이 아닌, 텍스트 우측 빈 공간을 전부 채우며 가로로 끝없이 뻗어나가는 인라인 형태의 선(`flex-grow border-t`) 레이아웃.
*   **Effect**: 오버레이 메뉴 내부(WHITE LIGHT STUDIO, WORKS 등)에서 좁은 모바일 화면이나 광활한 데스크탑 화면 어디서든 유연하게 선이 늘어났다 줄어들며, 탁 트인듯한 "그리드형 공간 분할"의 시원함을 줍니다.

### 4.2. Full-Screen Overlay Navigation
*   **Concept**: 햄버거 메뉴를 눌렀을 때 화면 전체를 덮으며 나타나는 메가 메뉴(Mega Menu).
*   **Style**: 검은 배경 위로 요소들이 시간차(`motion` delay)를 두고 부드럽게 나타나며, 카테고리가 뚜렷하고 크게 분류되어 있어 클릭 한 번에 직관적으로 어디든 갈 수 있게 기획되었습니다.

### 4.3. Contrast-Aware Header
*   **Concept**: 스크롤 상태나 현재 위치한 페이지의 배경색이 어두운지/밝은지(`isLightThemePage`) 판단하여 상단바 내의 햄버거 로고, 인스타그램 로고 등의 색상을 블랙/화이트로 능동적으로 치환(`mix-blend-difference` 또는 상태값 활용)합니다.

### 4.4. Minimal Animations (미세 애니메이션)
*   `framer-motion` 라이브러리를 통해 너무 빠르지도 느리지도 않은 우아한 인터랙션을 구현했습니다.
*   스크롤 뷰 진입 시 부드럽게 글씨가 떠오르거나(fade-up), 마우스 오버 시 미세하게 선의 투명도가 짙어지거나 색상이 반전(Reverse Color Hover)되는 것을 기본 원칙으로 합니다. (과도한 3D 효과나 튀는 효과 배제)

---

## 5. Development Tech Stack & Structure

이 프로젝트는 최신 모던 웹 개발 방식에 맞춰 구축되었으며 그 유지보수가 용이하도록 컴포넌트를 분할했습니다.

*   **Framework**: Next.js 16 (App Router, Turbopack)
*   **CMS**: Sanity — Works, Crew, Instructor 콘텐츠는 코드가 아닌 CMS에서 관리합니다 (`/admin`이 Sanity Studio, `/manage`는 강사용 간편 편집 화면)
*   **Styling**: Vanilla CSS 및 Tailwind CSS
    *   복잡한 커스텀 클래스오버라이딩을 최소화하고 직관적인 Utility Class들(`flex`, `items-center`, `justify-between` 등)의 조합으로 신속하고 확실한 반응형(Responsive) 레이아웃을 통제합니다.
*   **Animations**: motion (framer-motion의 후속 라이브러리, import 경로는 `motion/react`)
*   **Icons**: Lucide React (최소한의 선으로 이루어진 모던 아이콘 세트 - Contact 맵 파트 등에 활용)
*   **File Structure (주요 레이어)**:
    *   `src/app/` : 라우팅이 걸리는 주요 페이지 모음 (`/studio`, `/contact`, `/class`, `/crew`, `/works`)
    *   `src/components/` : 모든 페이지에 재사용되는 부품 (`Header.tsx` 글로벌 네비게이션, `Footer.tsx` 하단바 등)
    *   `src/sanity/` : Sanity 클라이언트, GROQ 쿼리, 스키마 정의

이 문서는 화이트 라이트 스튜디오의 모든 온·오프라인 비주얼 자산과 브랜딩 전반에 참고될 수 있는 귀중한 기준 역할을 수행합니다.
