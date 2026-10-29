# 백업과 복구

## 1. 자동 백업 (매주)
- `.github/workflows/backup.yml`이 **매주 월요일 03:00(한국 시간)** 에 Sanity 데이터셋을 사진·파일까지 내보내고, 점검한 뒤 GitHub Actions 보관함(artifact `sanity-backup`)에 **35일간** 올린다. 수동 실행: GitHub → Actions → **Backup** → Run workflow.
- 점검(`scripts/verify-backup.ts`)이 실패하면 업로드하지 않고 워크플로가 실패한다(저장소 소유자에게 GitHub 알림 메일이 간다): 문서가 없는 빈 백업, 깨진 줄, `siteSettings` 문서 없음.
- 내려받기: Actions → 실행 선택 → 맨 아래 Artifacts → `sanity-backup`.

### 설정 (고객마다 한 번)
1. Sanity: sanity.io/manage → 프로젝트 → API → Tokens → **Add API token**, 이름 `github-backup`, 권한은 **Viewer(읽기)**. 값을 복사한다. (이 토큰은 읽기 전용이라 유출돼도 쓰기는 안 된다. 데이터셋이 공개라 내용 자체는 이미 공개 정보지만 토큰은 비밀로 둔다.)
2. GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**: 이름 `SANITY_AUTH_TOKEN`, 값은 위 토큰.
3. (이 저장소의 기본 프로젝트가 아닌 고객이면) 같은 화면의 **Variables**에 `SANITY_PROJECT_ID`(프로젝트 ID), 필요하면 `SANITY_DATASET`을 추가.
4. **Run workflow로 한 번 수동 실행**해서 초록색인지 확인한다. 이 첫 실행이 통과해야 설정이 끝난 것이다. (토큰이 없으면 "SANITY_AUTH_TOKEN 시크릿이 없어요"로 즉시 실패한다.)

### 용량
사진을 포함한 백업 1개가 이 사이트 기준 약 48MB다. GitHub 무료 보관함은 500MB라 35일 보관(약 5개)이 한계에 가깝다. 사진이 많은 고객은 보관일을 줄이거나(`retention-days`), 사진 제외(`--no-assets`) + 별도 사진 백업, 또는 외부 저장소(S3 등)로 올리는 방식으로 바꾼다.

## 2. 손으로 백업·점검
```bash
npx sanity dataset export production backups/backup-$(date +%Y%m%d).tar.gz   # sanity login 필요. backups/는 git 제외
npx tsx scripts/verify-backup.ts backups/backup-YYYYMMDD.tar.gz --require siteSettings,studioInfo
```
점검 결과 예: `문서 25개 (work 8, instructor 7, studioSpace 5, crew 3, siteSettings 1, studioInfo 1)` / `✓ 백업 점검 통과`.
큰 변경(스키마·데이터 이전) 전에는 반드시 먼저 한다.

## 3. 복구
**실제 데이터셋을 덮어쓰기 전에 반드시 리허설부터 한다.**

### 3-1. 복구 리허설 (새 시험용 데이터셋에)
```bash
npx sanity dataset create restore-test --visibility private
npx sanity dataset import backups/backup-YYYYMMDD.tar.gz restore-test
# 확인: 문서 수가 백업 점검 결과와 같은지
npx sanity documents query 'count(*)' --dataset restore-test
npx sanity dataset delete restore-test     # 끝나면 삭제
```
### 3-2. 실제 복구
- **일부 문서만** 되돌릴 때: `/manage` 변경 이력(문서 단위 복원)이나 Studio(`/admin`)의 문서 이력이 가장 안전하다.
- **전체**를 되돌릴 때: `npx sanity dataset import <백업> production --replace` — 같은 `_id` 문서를 **덮어쓴다.** 백업 이후에 바뀐 내용은 사라지므로 먼저 현재 상태를 한 번 더 내보내 둔다.
- 복구 뒤 공개 사이트는 캐시 때문에 최대 1시간 이전 내용이 보일 수 있다. `/manage`에서 아무 항목이나 저장하면 해당 영역이 즉시 갱신된다.

## 4. 검증 상태
- 점검 스크립트: 실제 운영 내보내기 파일(25문서, 47.7MB)로 통과·실패·없는 파일 경로를 모두 확인했다. 순수 로직은 자동 테스트(10개)가 있다.
- 토큰 환경변수(`SANITY_AUTH_TOKEN`)로 로그인 없이 내보내기가 되는 것을 확인했다(토큰이 없으면 파일이 만들어지지 않음).
- **미확인:** GitHub Actions 위에서의 실제 실행(저장소 시크릿이 필요해 아직 설정되지 않음), Viewer 권한 토큰으로 내보내기가 되는지(확인한 것은 개인 CLI 토큰), **복구 리허설 전체**(시험용 데이터셋을 만들어야 해서 하지 않음). 첫 설정 때 3-1까지 한 번 실행해 이 문서를 확정한다.
