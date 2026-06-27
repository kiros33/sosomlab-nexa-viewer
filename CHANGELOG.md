# Changelog

이 프로젝트의 주요 변경사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/),
버전은 [SemVer](https://semver.org/)를 따릅니다.

## [Unreleased]

### Added
- **GitHub 원격 저장소 연동(M3)** — PAT 로그인(공개 repo는 로그인 불필요, 토큰은 AES-256-GCM
  암호화 로컬 저장), **계정 접근 저장소 목록에서 선택 추가**, 트리 탐색·md 열람,
  상대 이미지/문서 링크 해석
- **온라인 갱신 감지 + 새로고침** — 문서 blob sha 비교(창 포커스 시), "🔄 갱신 가능" 배지
- **이동 기록(파일#앵커)** — ←/→, 브레드크럼(최대 3개), 파일별 그룹 기록 1-클릭 점프, ToC 클릭 기록
- 패널 **크기 조절**(드래그) + **토글**(좌측 VSCode 스타일 탐색기/GitHub, 우측 Eclipse 스타일 ToC)
- 앱 **아이콘/파비콘**(S 배경 + M↓), macOS **About** 패널(아이콘+목적 설명)
- **Linux 빌드**(deb/rpm/AppImage) 추가 → Windows·macOS·Linux 3-OS 자동 배포

### Changed
- 배포 산출물 이름 정리(`NexaMarkdownViewer_<버전>_*`), 앱 이름/조직(SosomLab) 반영

### Security
- 자격증명 암호화 저장, 외부 통신 HTTPS만, 토큰은 프론트로 노출하지 않음

## [0.1.0] - 2026-06-27

첫 공개 빌드 — **M1: 로컬 Markdown 뷰어**.

### Added
- **GitHub 스타일 렌더링** — GFM(표·체크박스·취소선·자동링크), 라이트/다크 테마
- **언어별 코드 구문 강조** (highlight.js, 테마 동기화)
- **목차(ToC) 패널** — 헤딩 추출, 클릭 이동(이동 기록에 반영)
- **문서 이동 기록(파일#앵커)** — ←/→, 브레드크럼(최대 3개: 같은 파일 `#앵커` / 다른 파일
  `파일명#앵커`), 파일별 그룹 기록에서 1-클릭 점프
- **위키 스타일 문서 간 링크** — 상대 `.md`/이미지 자동 해석, 외부 링크는 기본 브라우저
- **내보내기** — HTML(스타일 인라인) · PDF(인쇄)
- **로컬 폴더/파일 열기**, 파일 트리(지연 확장), 최근 문서/테마/렌더링 설정 유지
- **교체 가능한 렌더 프로파일** 구조(현재 GitHub) — 확장 대비
- **소스 추상화**(로컬, 추후 GitHub/Bitbucket) — Rust `ContentProvider` / TS `ContentSource`
- **배포** — GitHub Actions 자동 빌드(macOS 유니버설 · Windows) → Release 업로드

### Known issues / Notes
- ⚠️ **코드 서명 미적용** — 첫 실행 시 macOS Gatekeeper / Windows SmartScreen 경고 가능
  (README의 "다운로드 & 설치" 참고).
- 자동 업데이트 미지원(추후 updater 도입 예정).

### 배포 산출물
- `NexaMarkdownViewer_0.1.0_universal.dmg` (macOS)
- `NexaMarkdownViewer_0.1.0_x64-setup.exe` (Windows)

[0.1.0]: https://github.com/kiros33/sosomlab-nexa-viewer/releases/tag/v0.1.0
