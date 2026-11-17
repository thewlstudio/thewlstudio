# 자동 검사·백업 작업 도구 런타임 점검

## 배경과 범위

- Node 26 전환 커밋 `91b2fbd`의 CI는 성공했지만, `checkout@v4`·`setup-node@v4`가 Node 20 기반 도구라 GitHub가 Node 24로 강제 실행한다는 폐기 경고가 발생했다.
- 프로젝트의 실행 버전(`engines.node: 26.x`, `.nvmrc: 26`)과 GitHub 작업 도구 자체의 내부 실행 버전은 별개다. 이 작업은 프로젝트를 Node 24로 낮추지 않는다.

## 변경

- GitHub 공식 안정 릴리스의 실제 태그와 `action.yml`을 확인하고 전체 커밋으로 고정했다. 확인 날짜: 2026-11-17.
  - [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1): `3d3c42e5aac5ba805825da76410c181273ba90b1`
  - [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0): `949feb2413d6458794dcd2491c4babbbce0c15c1`
  - [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2): `cf430e030ddbb5b0abf93d22962f4752f3646cd9`
- 세 도구는 Node 24 내부 런타임을 명시한다. `setup-node`가 설치하는 프로젝트 Node는 기존과 같이 `.nvmrc`의 26이다. GitHub 호스팅 실행 환경을 유지한다.
- 기존 `pull_request`·`push` 검사 방식과 npm 캐시를 유지한다. 새 `checkout`의 신뢰 경계 보호를 끄지 않으며, `setup-node`의 레지스트리 인증 설정도 추가하지 않는다.
- `upload-artifact` v7의 직접 파일 업로드를 사용하지 않고 `archive: true`를 명시해 기존 `sanity-backup` ZIP 안에 `.tar.gz`가 들어가는 다운로드 형식을 유지한다. 보관 기간 35일·파일 누락 시 실패 정책도 같다.
- 백업 일정은 바꾸지 않았다. cron과 기존 복구 문서가 나타내는 월요일 03:00(한국 시간)에 맞춰 상단의 잘못된 일요일 주석만 바로잡았다.

## 검증 경계

- 공식 도구의 버전 고정, 프로젝트 Node 선택, 백업의 일정·이름·파일 형식·보관 정책에 회귀 검사를 추가했다.
- 공식 actionlint 1.7.12 배포 파일의 SHA-256 체크섬을 확인한 뒤 두 워크플로의 문법 검사를 통과했다. Node 26에서 타입 검사(증분 캐시 미사용)·ESLint·전체 **5,195개 / 125개 파일** 테스트도 통과했다.
- 이 변경은 백업을 수동 실행하거나 운영 데이터를 내보내고 업로드할 권한으로 해석하지 않는다. 실제 데이터 백업·복원은 실행하지 않았다.
- 로컬 검사와 원격 CI 실행 결과를 각각 확인한다. CI 성공만으로 실행하지 않은 백업 업로드까지 검증됐다고 표현하지 않는다.
