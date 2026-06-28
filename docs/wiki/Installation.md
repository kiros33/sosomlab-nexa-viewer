# 설치 (Installation)

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
