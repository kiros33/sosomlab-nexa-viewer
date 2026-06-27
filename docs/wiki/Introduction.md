# 소개 — Nexa Markdown Viewer

<p align="center">
  <img src="https://raw.githubusercontent.com/kiros33/sosomlab-nexa-viewer/main/docs/assets/banner.svg" width="100%" alt="Nexa Markdown Viewer" />
</p>

문서를 읽다 보면 의외로 불편한 게 **Markdown 뷰어**입니다. 에디터를 켜자니 무겁고,
브라우저로 보자니 GitHub처럼 깔끔하게 안 나오고, 여러 저장소의 README를 오가며 보기도 번거롭죠.
그래서 **로컬과 GitHub의 Markdown을 GitHub 스타일 그대로, 가볍게 읽는** 데스크톱 뷰어를 만들었습니다.

**Nexa Markdown Viewer** — Tauri(네이티브 웹뷰) 기반이라 가볍고, Windows·macOS·Linux에서 동작합니다. 제작: **SosomLab**.

![실행 화면](https://raw.githubusercontent.com/kiros33/sosomlab-nexa-viewer/main/docs/wiki/images/render-document.png)

## 이런 분께
- 로컬 폴더의 `.md` 문서를 **GitHub처럼 예쁘게** 읽고 싶은 분
- 여러 **GitHub 저장소의 README/문서**를 앱 하나에서 오가며 보고 싶은 분
- 무거운 에디터 없이 **빠르게 문서만** 보고 싶은 분

## 주요 기능

### 📁 로컬 + 🐙 GitHub, 한 곳에서
폴더를 열거나 GitHub 저장소를 등록하면 좌측 탐색기에 **여러 루트**로 쌓입니다.
공개 저장소는 **로그인 없이**, 비공개는 PAT 로그인(토큰은 암호화 저장)으로 봅니다.

![GitHub 패널](https://raw.githubusercontent.com/kiros33/sosomlab-nexa-viewer/main/docs/wiki/images/github-myrepos.png)

### 📖 GitHub 스타일 렌더링 + 목차
표·코드 하이라이팅·체크박스 등 GFM을 GitHub와 동일하게 렌더링하고, 우측 **목차(ToC)** 로
긴 문서도 빠르게 이동합니다. 문서 간 링크를 따라가도 **← 뒤로 가기 시 보던 위치 그대로** 돌아옵니다.

### 🌗 라이트/다크 · ✍️ 일반텍스트/코드 뷰어
테마를 전환할 수 있고, `.txt`·`.json`·코드 같은 비-마크다운 파일은 **고정 글꼴 뷰어**로 봅니다.
글꼴과 크기는 설정에서 지정(직접 입력 + 목록에서 추가).

![다크 모드](https://raw.githubusercontent.com/kiros33/sosomlab-nexa-viewer/main/docs/wiki/images/theme-dark.png)

### ⬇️ HTML/PDF 내보내기
현재 문서를 스타일 포함 **HTML** 단일 파일이나 **PDF**로 저장합니다.

## 다운로드
[**GitHub Releases**](https://github.com/kiros33/sosomlab-nexa-viewer/releases) 에서 OS에 맞는 파일을 받으세요.

- macOS `.dmg` · Windows `-setup.exe` · Linux `.AppImage`/`.deb`/`.rpm`

> ⚠️ 아직 코드 서명 전이라 첫 실행 시 보안 경고가 나올 수 있습니다. (macOS: 우클릭 → 열기 / Windows: 추가 정보 → 실행)

## 더 보기
- 📖 사용 설명서(Wiki): https://github.com/kiros33/sosomlab-nexa-viewer/wiki
- 💻 소스/이슈: https://github.com/kiros33/sosomlab-nexa-viewer

가볍게 쓰는 Markdown 뷰어가 필요하셨다면 한 번 써보세요. 피드백은 언제든 환영합니다 🙌
