# 설치 (Installation)

## 다운로드
[GitHub Releases](https://github.com/kiros33/sosomlab-nexa-viewer/releases) 에서 OS에 맞는 파일을 받습니다.

| OS | 파일 | 설치 방법 |
|----|------|-----------|
| **macOS** | `NexaMarkdownViewer_<버전>_universal.dmg` | dmg 열기 → 앱을 `Applications`로 드래그 |
| **Windows** | `NexaMarkdownViewer_<버전>_x64-setup.exe` | 실행 → 설치 마법사 진행 |
| **Linux** | `*.AppImage` / `*.deb` / `*.rpm` | AppImage: 실행권한 후 실행 / deb·rpm: 패키지 설치 |

> 📷 _스크린샷: Releases 페이지의 자산 목록_ — `images/install-releases.png`

## ⚠️ 코드 서명 안내 (중요)
현재 빌드는 **코드 서명이 적용되지 않았습니다.** 첫 실행 시 OS 보안 경고가 나올 수 있습니다.

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

> 📷 _스크린샷: macOS 우클릭 → 열기 / Windows SmartScreen 우회_ — `images/install-gatekeeper.png`

## 시스템 요구사항
- macOS 12+ / Windows 10+ / 주요 Linux 배포판(glibc 2.35+ 권장)
- 별도 런타임 설치 불필요(네이티브 웹뷰 사용)
