# 설치 (Installation)

## 패키지 매니저 현황 (2026-08-11 기준)

최신 릴리스는 **v0.3.4**(2026-08-11)입니다.

| 채널 | OS | 게시 버전 | 상태 |
|------|----|-----------|------|
| **Homebrew** | macOS | **0.3.4** | ✅ 최신 |
| **winget** | Windows | 0.3.3 | ⏳ 0.3.4 제출(PR #415385) 검증 대기 |
| **Chocolatey** | Windows | 0.2.1 | ⏳ 0.3.3 검수(moderation) 대기 |

> macOS는 **Homebrew**로 바로 최신(0.3.4)을 받을 수 있습니다.
> Windows는 winget PR이 머지되기 전까지 `winget install`이 0.3.3을,
> `choco install`이 0.2.1을 설치합니다. **지금 0.3.4가 필요하면 아래 직접 다운로드**를 이용하세요.

## 🍺 Homebrew (macOS, 권장)
Homebrew 탭으로 한 줄 설치/업그레이드가 가능합니다.

```bash
# 설치
brew install --cask kiros33/tap/nexa-markdown-viewer

# 업그레이드
brew upgrade --cask nexa-markdown-viewer

# 제거
brew uninstall --cask nexa-markdown-viewer
```

- 탭 저장소: [kiros33/homebrew-tap](https://github.com/kiros33/homebrew-tap)
- Homebrew Cask는 설치 시 quarantine 속성을 자동 제거하므로, 아래의 **코드 서명 경고 없이** 바로 실행됩니다.

## 📦 winget (Windows, 권장)
Windows 10/11에 기본 내장된 패키지 매니저입니다. 릴리스마다 새 버전을 제출하며,
microsoft/winget-pkgs 검증·머지를 거쳐 반영됩니다(제출 후 반영까지 시차가 있습니다).

```powershell
# 설치
winget install SosomLab.NexaMarkdownViewer

# 업그레이드
winget upgrade SosomLab.NexaMarkdownViewer

# 제거
winget uninstall SosomLab.NexaMarkdownViewer
```

- 공식 매니페스트: [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs/tree/master/manifests/s/SosomLab/NexaMarkdownViewer)
  (0.2.1 · 0.3.1 · 0.3.2 · 0.3.3 게시 완료 · 0.3.4 [PR #415385](https://github.com/microsoft/winget-pkgs/pull/415385) 대기)
- 설치 파일은 NSIS(`_x64-setup.exe`) — 무인 설치가 자동 인식됩니다.

## 🍫 Chocolatey (Windows)

```powershell
# 설치
choco install nexa-markdown-viewer

# 업그레이드
choco upgrade nexa-markdown-viewer

# 제거
choco uninstall nexa-markdown-viewer
```

- 패키지 페이지: [community.chocolatey.org/packages/nexa-markdown-viewer](https://community.chocolatey.org/packages/nexa-markdown-viewer)
- ⏳ **현재 게시(승인) 버전은 0.2.1입니다.** 0.3.3은 2026-07-30 제출 후 커뮤니티 저장소
  검수 대기 중이라 아직 `choco install`로 받을 수 없습니다.
  (검수 진행 상황: 자동 검증·설치 테스트는 통과, 바이러스 스캔에서 미서명 바이너리로 인한
  오탐 경고가 남아 사람 검수 대기 — 아래 **코드 서명 안내** 참고)
- 최신 버전이 필요하면 **winget** 또는 직접 다운로드를 이용하세요.

## 다운로드
[GitHub Releases](https://github.com/kiros33/sosomlab-nexa-viewer/releases) 에서 OS에 맞는 파일을 받습니다.

| OS | 파일 | 설치 방법 |
|----|------|-----------|
| **macOS** | `NexaMarkdownViewer_<버전>_universal.dmg` | dmg 열기 → 앱을 `Applications`로 드래그 |
| **Windows** | `NexaMarkdownViewer_<버전>_x64-setup.exe` | 실행 → 설치 마법사 진행 |
| **Linux** | `*.AppImage` / `*.deb` / `*.rpm` | AppImage: 실행권한 후 실행 / deb·rpm: 패키지 설치 |

## 🔏 코드 서명 안내
Windows 빌드는 [SignPath Foundation](https://signpath.org/)이 오픈소스 프로젝트에 무상 제공하는
코드 서명 인증서로 서명됩니다. 서명 적용 전이거나 SmartScreen 평판이 쌓이기 전에는
첫 실행 시 OS 보안 경고가 나올 수 있습니다.

> 서명은 배포 채널에도 영향을 줍니다. 미서명 설치 파일은 백신 엔진 오탐이 붙기 쉬워
> Chocolatey 검수의 스캔 단계에서 경고로 표시되고, 그만큼 승인이 늦어집니다.

- **macOS** — "확인되지 않은 개발자" 경고 시
  - 앱을 **우클릭 → 열기**(최초 1회), 또는 터미널:
    ```bash
    xattr -dr com.apple.quarantine "/Applications/NexaMarkdownViewer.app"
    ```
- **Windows** — SmartScreen 경고 시 **추가 정보 → 실행**
- **Linux(AppImage)** — 실행권한 부여:
  ```bash
  chmod +x NexaMarkdownViewer_*.AppImage && ./NexaMarkdownViewer_*.AppImage
  ```

## 시스템 요구사항
- macOS 12+ / Windows 10+ / 주요 Linux 배포판(glibc 2.35+ 권장)
- 별도 런타임 설치 불필요(네이티브 웹뷰 사용)
