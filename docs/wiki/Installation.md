# 설치 (Installation)

## 패키지 매니저 현황 (2026-10-09 기준)

최신 릴리스는 **v0.4.0**(2026-10-09)입니다.

| 채널 | OS | 게시 버전 | 상태 |
|------|----|-----------|------|
| **Homebrew** | macOS | **0.4.0** | ✅ 최신 |
| **winget** | Windows | 0.3.4 | ⏳ 0.4.0 제출(PR #449305) 검증 대기 |
| **Chocolatey** | Windows | 0.3.3 | ⏳ 0.4.0 제출(2026-10-09) 검수 대기 |
| **APT / DNF** (pkg.sosomlab.com) | Linux | **0.4.0** | ✅ 최신 |

> macOS는 **Homebrew**, Linux는 **APT/DNF**로 바로 최신(0.4.0)을 받을 수 있습니다.
> Windows는 winget(0.3.4)·Chocolatey(0.3.3)가 0.4.0 검증/검수 대기 중입니다.
> **Windows에서 0.4.0이 필요하면 아래 직접 다운로드**를 이용하세요.

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
  (0.2.1 · 0.3.1 · 0.3.2 · 0.3.3 · **0.3.4** 게시 완료 — 0.4.0은 [PR #449305](https://github.com/microsoft/winget-pkgs/pull/449305) 검증 대기)
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
- ✅ **현재 게시(승인) 버전은 0.3.3입니다** — 2026-07-30 제출, **2026-09-01 승인**
  (미서명 바이너리 오탐으로 스캔 경고가 붙어 사람 검수를 거치느라 약 한 달 소요 — 아래 **코드 서명 안내** 참고).
- 0.3.4는 건너뛰고 **0.4.0을 2026-10-09 제출**했습니다(검수 대기). 그 전까지 0.4.0이 필요하면 직접 다운로드를 이용하세요.

## 🐧 APT / DNF (Linux)
SosomLab 서명 패키지 저장소 [pkg.sosomlab.com](https://pkg.sosomlab.com/)로 설치·갱신합니다
(패키지 이름 `nexa-markdown-viewer` · x86_64).

**Debian/Ubuntu (APT)**

```sh
# 저장소 등록(최초 1회) — 서명 키 + 소스
sudo curl -fsSLo /usr/share/keyrings/sosomlab-archive-keyring.gpg https://pkg.sosomlab.com/sosomlab-archive-keyring.gpg
sudo curl -fsSLo /etc/apt/sources.list.d/sosomlab.sources https://pkg.sosomlab.com/apt/sosomlab.sources
sudo apt update && sudo apt install nexa-markdown-viewer
```

- 업그레이드: `sudo apt update && sudo apt upgrade` · 제거: `sudo apt remove nexa-markdown-viewer`

**Fedora/RHEL (DNF)**

```sh
sudo curl -fsSLo /etc/yum.repos.d/sosomlab.repo https://pkg.sosomlab.com/rpm/sosomlab.repo
sudo dnf install nexa-markdown-viewer
```

- 업그레이드: `sudo dnf upgrade nexa-markdown-viewer` · 제거: `sudo dnf remove nexa-markdown-viewer`
- 색인(`InRelease` · `repomd.xml`)은 GPG 서명되고, 패키지 파일은 GitHub Release 자산으로 연결(302)됩니다.
- 다른 SosomLab 앱(Nexa SQL·Nexa Clip 등)과 같은 저장소라, 이미 등록했다면 설치 명령만 실행하면 됩니다.

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
