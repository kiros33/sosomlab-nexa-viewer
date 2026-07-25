# Changelog

이 프로젝트의 주요 변경사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/),
버전은 [SemVer](https://semver.org/)를 따릅니다.

## [Unreleased]

### Changed
- **이동 기록 바 버튼 배치** — 확대/축소(−/%/＋)를 MD/TX 토글 **왼쪽**으로 이동. TX 전환 시
  줌 컨트롤이 사라져도 MD/TX 버튼 위치가 그대로 유지됨(왕복 전환 시 클릭 지점 고정)

## [0.3.1] - 2026-07-25

### Fixed
- **Mermaid 다이어그램 크기 보정(VS Code 유사)** — 처음부터 컨테이너 폭에 맞춰 전체 표시
  (fit-to-width, 넓은 다이어그램 잘림 해소), 확대/축소를 svg 실폭으로 제어(축소 시 여백/잘림
  없음), "원래대로"=폭 맞춤 복귀, 노드 폰트 16px 고정(본문과 비율 일치)

### Docs
- README **설치 방법 재구성** — 패키지 매니저(macOS Homebrew · Windows winget) 안내 추가,
  직접 내려받기 표에 Linux(deb/rpm/AppImage) 추가

## [0.3.0] - 2026-07-25

렌더러 확장(M2 일부) + 보기/복사 UX + GitHub 조직 저장소 보강.

### Added
- **MD/TX 보기 모드 토글** — 새로고침 왼쪽 세그먼트 버튼(기본 MD). TX는 마크다운 원문을
  일반 텍스트로 표시(선택/복사, 드래그 중 가장자리 자동 스크롤, Ctrl/⌘ +/- 글꼴 크기)
- **서식 있는 복사** — MD 렌더 화면에서 복사하면 Word/PPT/한글에 렌더된 모습(제목 크기·표·
  코드 배경 등) 그대로 붙여넣기(text/html 인라인 스타일 동시 기록)
- **본문 우클릭 메뉴** — 복사(서식 유지) · 텍스트만 복사 · 문서 전체 복사 · 전체 선택
- **Mermaid 다이어그램 렌더링** — ```mermaid 코드펜스를 다이어그램으로 표시(지연 로딩,
  라이트/다크 테마 동기화, 문법 오류 시 원본 코드 표시)
- **본문 확대/축소(줌 %)** — 글씨·이미지·표를 일관 스케일(50~300%). 이동 기록 바의
  −/%/＋ 컨트롤, Ctrl +/-/0, Ctrl+휠. 설정 영속화
- **Mermaid VS Code 스타일 + 다이어그램 줌/팬** — VS Code 라이트/다크 색·폰트 적용,
  우상단 축소/확대/원래대로 버튼 + 드래그 이동 + Ctrl+휠 확대/축소

### Fixed
- **조직(Organization) 저장소가 "내 저장소" 목록에 안 보이던 문제 완화** — 조직 목록을
  병합 조회(중복 제거). fine-grained PAT(개인 Resource owner)는 조직 저장소를 반환하지
  않으므로 토큰 발급 안내(조직: classic PAT(repo)+SSO 승인 또는 조직 Resource owner) 정비

### CI
- **choco 미게시 릴리스 스위치** — 저장소 변수 `CHOCO_PUSH=true`일 때만 Chocolatey에
  push(기본은 pack까지만 수행하고 nupkg 아티팩트 보존). 프리릴리스 태그(`-` 포함)는
  choco/winget 자동 게시 제외

### Docs
- **Homebrew Tap(Cask) 설치 안내** 추가 — macOS에서 `brew install --cask kiros33/tap/nexa-markdown-viewer`
  한 줄 설치 지원. 탭 저장소: [kiros33/homebrew-tap](https://github.com/kiros33/homebrew-tap).
  README "다운로드 & 설치" + 위키 Installation 페이지 반영
- **위키 GitHub 연동 페이지 개편** — PAT 종류별 안내(개인/조직), 조직(Organization) 저장소가
  안 보일 때 문제 해결 순서(SSO 승인 포함), FAQ 항목 추가

## [0.2.1] - 2026-06-28

### Added
- 일반텍스트/코드 **글꼴 선택 보완** — 직접 입력(쉼표로 다중 폴백) + 목록에서 추가(설치 글꼴 조회/폴백) + 미리보기

### Fixed
- 앱 **아이콘을 macOS 표준 여백**으로 조정 — Dock에서 다른 앱보다 크게 보이던 문제 해결

### Docs
- **GitHub Wiki 사용 설명서** 추가 — 기능별 실제 화면 캡처(크롭) 포함

### Chore
- 미사용 코드 정리(dead_code 경고 해소)

## [0.2.0] - 2026-06-27

GitHub 원격 연동(M3) + 탐색기/설정/내보내기 UX 대폭 보강.

### Added
- **GitHub 원격 저장소 연동(M3)** — PAT 로그인(공개 repo는 로그인 불필요, 토큰은 AES-256-GCM
  암호화 로컬 저장), **계정 접근 저장소 목록에서 선택 추가**, 트리 탐색·md 열람,
  상대 이미지/문서 링크 해석
- **온라인 갱신 감지 + 새로고침** — 문서 blob sha 비교(창 포커스 시), "🔄 갱신 가능" 배지
- **이동 기록(파일#앵커)** — ←/→, 브레드크럼(최대 3개), 파일별 그룹 기록 1-클릭 점프, ToC 클릭 기록
- 패널 **크기 조절**(드래그) + **토글**(좌측 VSCode 스타일 탐색기/GitHub, 우측 Eclipse 스타일 ToC)
- 앱 **아이콘/파비콘**(S 배경 + M↓), macOS **About** 패널(아이콘+목적 설명)
- **Linux 빌드**(deb/rpm/AppImage) 추가 → Windows·macOS·Linux 3-OS 자동 배포
- **다중 루트 탐색기** — 로컬 폴더 + GitHub 저장소를 접이식 루트로 등록(기본 접힘,
  펼침 상태 영속화), 폴더/파일 아이콘 구분, 루트 배경색 구분
- **우클릭 컨텍스트 메뉴**(저장소/폴더/파일) — 저장소 갱신 · 온라인(브라우저)/폴더 열기 ·
  제거(닫기) · 파일 보기(저장소별 개별 설정)
- **환경설정 모달**(⚙️) — 표시 파일 선택(전체/마크다운/일반텍스트/HTML·CSS, 전역 일괄 적용 +
  저장소별 override), 일반텍스트 글꼴/기본 크기
- **일반텍스트/코드 뷰어** — 비-마크다운 파일은 고정 글꼴로 표시, Ctrl/⌘ +/- 로 크기 조절
- **내보내기 모달** — 단일 버튼 → 큰 PDF/HTML 아이콘으로 선택
- **뒤로/앞으로 시 스크롤 위치 복원** — 보던 위치 그대로
- GitHub 패널 재구성(등록 목록 / 직접 등록 / 내 저장소 +/− · 실시간 검색), 계정 저장소 목록에서
  선택 추가/해제, 표시/숨김 토글
- 기능 아이콘 **Material Design** 통일, GitHub **공식 octocat** 마크

### Changed
- 배포 산출물 이름 정리(`NexaMarkdownViewer_<버전>_*`), 앱 이름/조직(SosomLab) 반영
- "내 저장소" 목록을 창 높이에 맞춰 docking(등록 목록은 전부 표시 후 그 아래)

### Fixed
- 다른 저장소의 **동일 이름 파일**(예: README.md) 전환 시 이전 내용이 남던 버그
- Rust↔JS 필드명 불일치(camelCase)로 **폴더가 인식되지 않던** 버그
- 파일 클릭/창 포커스/탭 전환 시 트리·본문 **깜빡임/불필요한 재요청** 제거
- 탐색기 펼침 상태가 탭 전환/재실행 시 초기화되던 문제

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

[0.2.1]: https://github.com/kiros33/sosomlab-nexa-viewer/releases/tag/v0.2.1
[0.2.0]: https://github.com/kiros33/sosomlab-nexa-viewer/releases/tag/v0.2.0
[0.1.0]: https://github.com/kiros33/sosomlab-nexa-viewer/releases/tag/v0.1.0
