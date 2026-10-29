# 공개 화면의 동작 줄이기

## 구현 원칙

- `usePrefersReducedMotion`은 서버에서는 기본값을 사용하고 클라이언트에서는 환경설정 변경을 구독한다.
- 공개 화면의 Motion 요소는 `usePublicMotion().transitionFor(...)`로 지연·반복·스프링을 즉시 전환으로 대체한다. variants 안의 transition도 동일하게 처리한다.
- HTML Motion 요소에는 `data-public-motion`을 붙인다. 전용 미디어 쿼리는 SSR 초기 숨김과 이미 실행 중인 이동 효과를 제거한다. SVG 아이콘은 별도의 정적 경로를 사용한다.
- 로고 확대·이미지 크롭·중앙 정렬용 CSS transform은 유지한다. 새로운 hover 이동 효과에는 `motion-safe:`를 사용한다.
- Lenis Provider는 설정 변경 중에도 유지한다. 동작 줄이기에서는 smoothWheel과 autoRaf를 끄고 기본 스크롤을 사용하며, 열린 오버레이의 잠금은 계속 유지한다.
- 재생 파비콘은 설정 변경 시 반복 타이머를 중단한다. 재생 소유권 변경·종료 시 미디어 구독도 정리한다.
- 메뉴·모달의 잠금 해제는 여전히 실제 퇴장 완료 시점에만 수행한다. 이미 진행 중이던 유한 애니메이션의 내부 정리가 끝날 때까지 잠금이 잠깐 유지될 수 있다.

참고: Motion의 기본 reduced-motion 정책은 모든 opacity 효과까지 중단하지 않으므로 프로젝트의 즉시 전환 정책을 별도로 적용한다. [Motion 접근성 문서](https://motion.dev/docs/react-accessibility), [MotionConfig 문서](https://motion.dev/docs/react-motion-config).

## 자동 회귀 검사

- `src/hooks/reduced-motion.test.tsx`: 실제 ReactLenis 교체, 입력 DOM·열린 모달 유지, 기본 wheel, 잠금 승계, StrictMode, 관리자 제외.
- `src/components/public-overlays.test.tsx`: 실제 메뉴·클래스 모달의 설정 전환, 포커스·inert·퇴장 수명 유지. Motion 시간 진행은 테스트용 대체 구현이다.
- `src/lib/audio-presentation.test.ts`: 재생 중 설정 전환, 타이머·구독 정리, 이전 소유자의 늦은 이벤트 무시.

## 수동 확인이 필요한 범위

실제 OS 또는 DevTools의 `prefers-reduced-motion: reduce` 에뮬레이션에서 다음을 확인한다. jsdom 테스트는 실제 렌더링·스크린리더 검증을 대신하지 않는다.

1. 새 방문에서 Preloader가 생략되고 화면 내용이 즉시 보이는지.
2. 홈·Studio·Class·Crew·Works와 상세 페이지에서 등장 이동·hover 확대가 멈추고, 기존 이미지 크롭·정렬은 유지되는지.
3. 메뉴·클래스 모달을 연 채 설정을 켜고 꺼도 내용·포커스·배경 잠금이 유지되는지.
4. 오디오 재생 중 파비콘만 정지하고 재생 자체는 유지되는지.
5. 키보드 Escape·Tab 및 실제 모바일 스크롤·보조기기 동작.

이번 로컬 검증에서는 타입 검사·린트·전체 자동 테스트·프로덕션 빌드·24개 HTTP 스모크 검사를 통과했다. 일반 Chrome에서 메뉴·클래스 모달과 콘솔도 확인했다. 미디어 에뮬레이션 도구가 응답하지 않아 실제 reduce 화면·OS 설정 전환·물리 모바일·스크린리더 검증은 완료하지 못했다. 운영 데이터 변경과 배포는 하지 않았다.
