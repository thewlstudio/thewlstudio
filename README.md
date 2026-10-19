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
npm run analyze  # 번들 크기 분석
```

## 배포

Vercel에 배포합니다. `main` 브랜치에 푸시하면 자동 배포됩니다.
