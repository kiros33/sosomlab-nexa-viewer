# 로드맵 & 기능 설계 (Markdown 뷰어)

프로젝트: **sosomlab-tauri-test1** — GitHub 스타일 Markdown 뷰어 (Tauri 2 + React 19 + TS)
플랫폼: 데스크톱(Windows/macOS) 우선 → 추후 Linux, 모바일(iOS/Android)

이 문서는 누적되는 요구사항/설계 항목과 단계별 구현 대상을 관리한다.
(상세 아키텍처는 코드의 `src/sources`, `src/renderer`, `src-tauri/src/providers` 참고)

---

## 핵심 설계 원칙
- **소스 추상화**: 로컬/GitHub/Bitbucket/GitLab을 동일 인터페이스로.
  - TS: `src/sources/types.ts` `ContentSource`
  - Rust: `src-tauri/src/providers/mod.rs` `ContentProvider` 트레잇
  - 신규 소스 = 인터페이스 구현 + 레지스트리 등록만으로 추가.
- **렌더 프로파일 추상화(교체 가능한 렌더링)**: `src/renderer/profiles.ts`
  - "어떤 방식으로 렌더링할지"를 프로파일로 정의, 툴바에서 선택 전환.
  - 신규 프로파일(수식/그래프 강화, GitLab, 순수 텍스트 등) 추가만으로 확장.
- **토큰/HTTP/FS는 Rust에 격리**(보안). 토큰은 **암호화된 로컬 저장**.

---

## 단계별 구현 대상 (Milestones)

### ✅ M1 — 로컬 뷰어 + 파일트리 (데스크톱) — *구현 완료*
- [x] 로컬 폴더/파일 열기 (네이티브 다이얼로그)
- [x] 좌측 파일 트리(지연 확장)
- [x] GitHub 스타일 렌더링: GFM(표/체크박스/취소선/자동링크)
- [x] **언어별 코드 구문 강조** (highlight.js, 라이트/다크 테마 동기화)
- [x] 라이트/다크 테마 토글 (github-markdown-css 라이트/다크)
- [x] **목차(ToC) 보기** 패널 (헤딩 추출 → 클릭 이동)
- [x] 헤딩 앵커/슬러그(rehype-slug + autolink)
- [x] 상대 경로 이미지 표시(data URL), 문서 간 .md 링크 이동, 외부 링크 기본 브라우저
- [x] 최근 문서(localStorage 영속화)
- [x] **렌더 프로파일 선택 UI**(현재 GitHub 1종, 확장 구조)
- [x] **내보내기**: HTML(스타일 인라인), PDF(웹뷰 인쇄)
- [x] YAML frontmatter 숨김 처리

### M2 — 렌더러 확장
- [ ] **수식 렌더링** (KaTeX): `remark-math` + `rehype-katex` (새 프로파일 또는 기본 통합)
- [ ] **Mermaid 다이어그램/그래프** 렌더링 (코드펜스 `mermaid`)
- [ ] GitHub Alerts/콜아웃 (`> [!NOTE]`, `[!WARNING]` 등)
- [ ] 각주, 이모지 shortcode
- [ ] 추가 렌더 프로파일 예시(예: "수식·다이어그램 강화", "순수 텍스트")
- [ ] 라이트/다크 정교화, 본문 폭/글꼴 크기 설정

### M3 — GitHub 원격 소스
- [x] PAT 인증 + **암호화된 로컬 토큰 저장** (AES-256-GCM)
- [x] **다중 repository 등록** 및 관리 UI (GitHub 패널)
- [x] 저장소·트리 탐색, 원격 .md 열람 (`ContentProvider` github 구현)
- [x] 원격 상대 이미지/링크 해석
- [x] **온라인 갱신 감지(blob sha) + 갱신 버튼**(포커스 시 확인)
- [ ] OAuth 디바이스 로그인(추후), 다중 계정, 자동 폴링 옵션, 브랜치 선택 UI

### M4 — 추상화 강화 + 타 저장소
- [ ] Provider 인터페이스 일반화/안정화
- [ ] **Bitbucket** (및 GitLab) provider 추가
- [ ] 소스 종류별 인증 방식 정리

### M5 — UX 폴리시 & 지식관리
- [x] **외부 인자로 파일/폴더 열기 (Windows, argv)** — `Viewer.exe "문서.md"`/연결 프로그램으로 즉시 열람
      (`startup_target` 커맨드).
- [ ] **외부 인자 열기 macOS 대응** — Finder 더블클릭/"다음으로 열기"는 argv가 아닌 Apple Event라
      별도 필요: `bundle.fileAssociations`(Info.plist `CFBundleDocumentTypes`) +
      `RunEvent::Opened { urls }` 처리(`.build().run(|app,e| …)`) + 프론트 이벤트 listen.
      (+ Windows/macOS single-instance로 2번째 실행 라우팅)
- [ ] **검색** — 현재 문서 단어 검색 + 정규식 → 파일명 필터 → 워크스페이스 전체(grep).
      설계: [SEARCH.md](SEARCH.md)
- [ ] **파일 변경 시 갱신(미사용/변경 알림/자동)** — 자동은 현재 위치 유지. 설계: [AUTO-REFRESH.md](AUTO-REFRESH.md)
- [ ] 탭(다중 문서)
- [ ] 즐겨찾기(북마크)
- [ ] **문서 간 링크 연결 정보 보기**(백링크/링크 그래프) — *요청 반영(설계)*
- [ ] **문서별 태그 추가/관리 + 태그 기반 탐색** — *요청 반영(설계)*
- [ ] 로컬 파일 변경 감지(라이브 리로드)
- [ ] 내보내기 고도화(서버사이드 PDF, 다크 테마 내보내기 옵션)
- [ ] 번들 크기 최적화(highlight.js 언어 선별/코드 스플리팅)

### 배포 채널 — 패키지 매니저 등록 — *요청 반영(설계)*
- [ ] **Windows — WinGet**: `winget` manifest(YAML) 작성 → microsoft/winget-pkgs PR (또는
      `vedantmgoyal/winget-releaser` 액션으로 릴리스 시 자동 제출). 설치 파일 SHA256 필요.
- [ ] **Windows — Chocolatey**: `.nuspec` + install 스크립트 패키지 → `choco push`(API 키),
      커뮤니티 저장소 심사.
- [ ] **macOS — Homebrew**: Cask(`Casks/nexa-markdown-viewer.rb`, dmg URL+sha256) →
      탭(tap) 저장소(`homebrew-tap`) 운영 또는 homebrew-cask PR.
- 선행 조건: **코드 서명/공증**(미서명 시 다수 매니저 심사·사용자 신뢰 문제), 안정 버전 태깅,
  릴리스 자산 체크섬 자동화.
- [ ] **포터블 배포(Windows zip)** — 설치 없이 단일 폴더 실행, 데이터(`./data`)를 앱 옆에 보관.
      설계: [PORTABLE.md](PORTABLE.md). (포터블 모드 판별 + 데이터/WebView 경로 분기 + CI zip)

### M6 — Git diff 비교 — *요청 반영(설계)*
- [ ] 원격 git 소스: 커밋/브랜치 간 md diff 비교 보기
- [ ] 로컬이 git 저장소면 워킹트리/커밋 간 diff 제공
- [ ] diff 전용 렌더(좌우/인라인), 변경 강조

### M7 — 모바일
- [ ] iOS/Android 빌드·배포
- [ ] 반응형 레이아웃(사이드바/ToC 토글), 터치 UX
- [ ] 모바일 보안 저장(Keychain/Keystore)

---

## 요청 반영 추적 (사용자 추가 요구사항)
| 항목 | 단계 | 상태 |
|---|---|---|
| 다른 포맷 지원 위해 렌더링 선택 전환 가능하게 | M1(구조) + M2(프로파일 추가) | M1 구조 완료 |
| ToC 보기 | M1 | ✅ 완료 |
| HTML/PDF 내보내기 | M1(기본) + M5(고도화) | M1 완료 |
| 언어별 코드 하이라이팅 | M1 | ✅ 완료 |
| Mermaid 등 다이어그램 | M2 | 설계 |
| 문서 간 링크 연결 정보(백링크/그래프) | M5 | 설계 |
| 문서별 태그 | M5 | 설계 |
| Git diff 비교(원격/로컬 git) | M6 | 설계 |
| 이동 기록(파일#앵커)·브레드크럼 | M1 | ✅ 완료 |
| 패널 크기조절 + VSCode/Eclipse 토글 | M1 | ✅ 완료 |
| 앱 아이콘/파비콘(S 배경+M↓) | M1 | ✅ 완료 |
| Linux 빌드(deb/rpm/AppImage) | 배포 | ✅ 완료(CI) |
| WinGet / Chocolatey / Homebrew 등록 | 배포 채널 | 설계 |
| 외부 인자(파일/폴더)로 즉시 열기 | M5 | ✅ 완료(Windows argv) / macOS 설계 |
| 외부 인자 열기 macOS(파일 연결·Opened 이벤트) | M5 | 설계 |
| 문서 검색(단어/정규식, 파일명, 전체 grep) | M5 | 설계([SEARCH.md](SEARCH.md)) |
| 파일 변경 갱신(미사용/알림/자동·위치유지) | M5 | 설계([AUTO-REFRESH.md](AUTO-REFRESH.md)) |
| 포터블 버전(Windows zip) | 배포 채널 | 설계([PORTABLE.md](PORTABLE.md)) |
| 기술 구조·호출/동작 흐름 문서화 | 문서 | ✅ 완료([ARCHITECTURE.md](ARCHITECTURE.md)) |
