# 빌드·배포

## 개발 환경
- Node.js + pnpm, Rust(rustup), [Tauri 사전 준비물](https://tauri.app/start/prerequisites/)
- 새 터미널에서 cargo가 안 잡히면: `source "$HOME/.cargo/env"`

```bash
pnpm install
pnpm tauri dev      # 개발 실행
pnpm build          # 프론트엔드 타입체크/빌드(tsc + vite)
```

## 로컬 배포 빌드
```bash
pnpm tauri build
```
산출물: `src-tauri/target/release/bundle/`

| OS | 산출물 |
|----|--------|
| macOS | `.dmg`, `.app` (유니버설: `--target universal-apple-darwin`) |
| Windows | `.msi`, `*-setup.exe`(NSIS) |
| Linux | `.deb`, `.rpm`, `.AppImage` |

> macOS에서 DMG 단계는 Finder 자동화가 필요해 GUI 세션에서 실행해야 합니다.
> 헤드리스/CI가 아닌 본인 터미널에서 실행하세요. (`--bundles app` 으로 앱만 빌드도 가능)

## CI 자동 배포 (GitHub Actions)
`v*` 태그를 push하면 macOS·Linux·Windows 3-OS에서 빌드 후 **Release가 자동 게시**됩니다.

> ⚠️ **패키지 매니저 워크플로는 자동 실행되지 않습니다.** 두 워크플로에 `release: published`
> 트리거가 걸려 있지만, release.yml이 `GITHUB_TOKEN`으로 릴리스를 만들기 때문에 GitHub의
> **재귀 실행 방지 정책**으로 이벤트가 발생하지 않습니다. 릴리스 후 **수동 dispatch가 필요**합니다.

```bash
# 1) 버전 올리기: tauri.conf.json + package.json (+ Cargo.toml)
# 2) CHANGELOG.md 의 [Unreleased] → [버전] 으로 확정
# 3) 태그 push → 3-OS 빌드 → Release 자동 게시
git tag v0.2.2
git push origin v0.2.2

# 4) 패키지 매니저 제출은 수동 dispatch (자동 안 됨)
gh workflow run winget.yml     -f tag=v0.2.2
gh workflow run chocolatey.yml -f tag=v0.2.2   # 저장소 변수 CHOCO_PUSH=true 일 때만 실제 게시

# 5) Homebrew 탭은 별도 저장소에서 version + dmg sha256 수동 갱신
```

- 빌드/릴리스: `.github/workflows/release.yml` (`tauri-apps/tauri-action`, `releaseDraft: false`)
- Chocolatey: `.github/workflows/chocolatey.yml` (Secret `CHOCO_API_KEY` 필요)
- winget: `.github/workflows/winget.yml` (Secret `WINGET_TOKEN` 필요 · 최초 PR 머지 후부터
  새 버전 제출 가능 — 단 실행은 위 경고대로 **수동 dispatch**)
- pnpm 버전은 `package.json`의 `packageManager` 필드를 따릅니다.

## 배포 채널 & 상태 확인
세 채널의 등록 방식과 **진행 상태를 어디서 보는지**를 정리합니다.

| 채널 | 설치 명령 | 자동화 | 상태 확인 위치 |
|------|-----------|--------|----------------|
| **Homebrew** | `brew install --cask kiros33/tap/nexa-markdown-viewer` | 수동(탭 cask 갱신) | 탭 저장소 + 로컬 `brew` 명령 |
| **Chocolatey** | `choco install nexa-markdown-viewer` | 수동 dispatch(`CHOCO_API_KEY` + 변수 `CHOCO_PUSH=true`) | Actions 실행 + **버전 페이지**(검수) |
| **winget** | `winget install SosomLab.NexaMarkdownViewer` | 수동 dispatch(`WINGET_TOKEN`) | Actions 실행 + winget-pkgs PR(검증) |

### 현재 게시 현황 (2026-08-02 확인)

| 채널 | 게시 버전 | 상태 |
|------|-----------|------|
| Homebrew | 0.3.3 | ✅ 최신 (cask `version 0.3.3`, sha256 `4bc3ecbb…b304b7fe`) |
| winget | 0.3.3 | ✅ 최신 (manifests 0.2.1·0.3.1·0.3.2·0.3.3, PR #408379 머지) |
| Chocolatey | 0.2.1 | ⏳ 0.3.3 제출(2026-07-30) 후 검수 대기 — 스캔 경고로 사람 검수 계류 |

앱 릴리스 버전은 **v0.3.3**(2026-07-27)로, 새 릴리스 없이 채널 상태만 추적 중인 구간입니다.

### 🍺 Homebrew
내가 직접 운영하는 탭이라 **중앙 검수가 없고 push 즉시 반영**됩니다.
- 탭 저장소: <https://github.com/kiros33/homebrew-tap> (cask 커밋 = 현재 게시 버전)
- 로컬 확인:
  ```bash
  brew update
  brew info --cask kiros33/tap/nexa-markdown-viewer   # 현재 버전/메타데이터
  brew audit --cask kiros33/tap/nexa-markdown-viewer   # 정의 검증
  ```
- ⚠️ 자동화 없음 → 새 버전마다 cask의 `version`/`sha256`를 갱신해 push해야 함.

### 🍫 Chocolatey
1. **빌드/푸시 실행 여부**: GitHub → **Actions → `chocolatey`** 워크플로 실행 로그
   (`choco pack`/`choco push` 성공 여부).
2. **검수(moderation) 상태**: push 후 패키지 페이지에서 확인 — 중앙 저장소라 즉시 노출 아님.
   - 패키지 페이지: <https://community.chocolatey.org/packages/nexa-markdown-viewer>
     (상태: *Submitted → Under Review/Verifying → Approved*)
   - **버전별 페이지**: `…/packages/nexa-markdown-viewer/<버전>` — 방금 올린 버전 확인은 여기서.
   - 내 패키지 목록: <https://community.chocolatey.org/account> (로그인)
3. **검수 체크 3종 읽는 법**: 버전 페이지 상단에 자동 검사 결과가 1·2·3으로 표시됩니다.
   - **Validation**(nuspec 메타데이터 규칙) / **Verification**(샌드박스 실제 설치 테스트)
     — 둘 다 *Passing*이면 패키지 자체에는 문제가 없다는 뜻.
   - **Scan**(VirusTotal 계열 다중 엔진) — 미서명 바이너리는 *Flagged as a Warning:
     at least one file has between 5 and 10 detections* 로 뜨기 쉽습니다. 자동 실패는 아니지만
     **사람(moderator) 검수를 반드시 거치게 되어 승인이 늦어집니다.**
     → 근본 해결은 코드 서명(SignPath) 확보. 0.2.1도 이 경로로 약 한 달 만에 승인됐습니다.
   - 세 검사 중 하나라도 미완/경고면 페이지에 "Some Checks Have Failed or Are Not Yet Complete"가
     표시되고, 본문에 "This version is in moderation and has not yet been approved"가 남습니다.
4. ⚠️ **OData 피드로 제출 여부를 판단하지 말 것.** `api/v2/Packages()`·`FindPackagesById()`는
   **승인된 버전만** 반환하므로, 방금 push한 미승인 버전은 응답에 없습니다(제출 실패로 오인 주의).
   피드는 "현재 공개 게시 버전" 확인용, 제출 확인은 **버전별 페이지**로.
- 게시 스위치: 저장소 변수 **`CHOCO_PUSH=true`** 일 때만 `choco push` 실행(미설정 = pack까지만,
  nupkg는 아티팩트로 보존). 검수 대기 중 이중 큐를 피하려는 장치.
- 미설정 시: `CHOCO_API_KEY` Secret 없으면 push 단계 실패.

### 📦 winget
1. **PR 생성 여부**: GitHub → **Actions → `winget`** 워크플로 실행 로그.
2. **검증/머지 상태**: microsoft/winget-pkgs의 **해당 PR**에서 봇 코멘트·라벨로 확인
   (예: *Validation-Completed*, *Azure-Pipeline-Passed*, *Moderator-Approved* → merged).
   - 내가 연 PR 목록: <https://github.com/microsoft/winget-pkgs/pulls?q=is%3Apr+author%3Akiros33>
   - 내 fork(자동 PR 경유): <https://github.com/kiros33/winget-pkgs>
3. **게시 후 확인**(머지되어 인덱스에 반영된 뒤):
   ```bash
   winget show SosomLab.NexaMarkdownViewer
   winget install SosomLab.NexaMarkdownViewer
   ```
- ⚠️ `winget-releaser`는 **이미 등록된 패키지의 새 버전**만 올림 → 최초 PR이 머지되기 전 릴리스는
  winget 단계가 실패함. 머지 후 최신 태그로 `winget` 워크플로를 1회 수동 실행해 따라잡으면 됨.

> 공통: Chocolatey·winget은 중앙 저장소+검수라 **게시 즉시 노출이 아니며 삭제가 어렵습니다**
> (문제 시 상위 버전으로 roll-forward). Homebrew 탭만 즉시 반영/되돌리기가 자유롭습니다.
