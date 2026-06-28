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
릴리스가 게시되면(`release: published`) 패키지 매니저 워크플로(Chocolatey·winget)가 **이어서 자동 실행**됩니다.

```bash
# 1) 버전 올리기: tauri.conf.json + package.json (+ Cargo.toml)
# 2) CHANGELOG.md 의 [Unreleased] → [버전] 으로 확정
# 3) 태그 push → 빌드 → 자동 게시 → choco/winget PR 자동
git tag v0.2.2
git push origin v0.2.2
```

- 빌드/릴리스: `.github/workflows/release.yml` (`tauri-apps/tauri-action`, `releaseDraft: false`)
- Chocolatey: `.github/workflows/chocolatey.yml` (Secret `CHOCO_API_KEY` 필요)
- winget: `.github/workflows/winget.yml` (Secret `WINGET_TOKEN` 필요 · 최초 PR 머지 후부터 자동)
- pnpm 버전은 `package.json`의 `packageManager` 필드를 따릅니다.

## 배포 채널 & 상태 확인
세 채널의 등록 방식과 **진행 상태를 어디서 보는지**를 정리합니다.

| 채널 | 설치 명령 | 자동화 | 상태 확인 위치 |
|------|-----------|--------|----------------|
| **Homebrew** | `brew install --cask kiros33/tap/nexa-markdown-viewer` | 수동(탭 cask 갱신) | 탭 저장소 + 로컬 `brew` 명령 |
| **Chocolatey** | `choco install nexa-markdown-viewer` | release 시 자동(`CHOCO_API_KEY`) | Actions 실행 + 패키지 페이지(검수) |
| **winget** | `winget install SosomLab.NexaMarkdownViewer` | release 시 자동(`WINGET_TOKEN`) | Actions 실행 + winget-pkgs PR(검증) |

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
   - 내 패키지 목록: <https://community.chocolatey.org/account> (로그인)
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
