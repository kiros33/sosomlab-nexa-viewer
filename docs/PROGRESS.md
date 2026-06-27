# 진행 기록 (Progress Log)

프로젝트: **sosomlab-tauri-test1** — Tauri 2.x 기반 크로스 플랫폼 데스크톱/모바일 앱
스택: Tauri 2 + React 19 + TypeScript + Vite 7 (패키지 매니저: pnpm)

각 항목 형식: 일시 / 요청 / 목적 / 변경내역 / 기능 및 반영 소스 위치

---

## 2026-06-27 14:41 ~ 14:48 — 프로젝트 초기 골격 구축

- **요청**: "Tauri 기반 크로스 플랫폼 프로그램 개발" → 협의 결과 "먼저 기본 골격만",
  프론트엔드 React + TypeScript, 대상 플랫폼 macOS / Windows / Linux / 모바일(iOS·Android).
  추가 요청: 설치는 가급적 brew로, 전체 진행과정을 파일에 기록.
- **목적**: 빈 git 저장소에 실행 가능한 최소 Tauri 앱 골격을 만들고, 데스크톱/모바일
  빌드가 가능한 상태로 만든다.

### 변경내역
1. **개발 환경 점검**
   - 기존: Node v24.16.0, npm 11.13.0, pnpm 11.8.0 (설치됨) / Rust·Cargo (미설치)
   - Rust 미설치 → 설치 필요 판단.
2. **Rust 툴체인 설치** (`rustup`, stable 1.96.0)
   - 설치 방식 메모: 사용자 brew 선호이나 Rust만 예외. Tauri 모바일 빌드는
     `rustup target add`(iOS/Android 타겟)가 필수라 brew의 `rust` 포뮬러로는 불가.
     → rustup 유지. (`~/.cargo/env`)
3. **Tauri + React-TS 스캐폴드 생성**
   - `create-tauri-app@4.6.2` 의 `react-ts` 템플릿으로 생성 후 프로젝트 루트로 이동
     (기존 `.git` 보존, rsync `--exclude=.git`).
4. **의존성 설치 (pnpm)**
   - esbuild postinstall 빌드 스크립트가 pnpm 11.8 기본 정책상 차단됨.
   - pnpm 11.8부터 `package.json`의 `pnpm` 필드 미사용 → `pnpm-workspace.yaml` 의
     `allowBuilds: { esbuild: true }` 로 허용 후 재설치하여 esbuild 네이티브 바이너리 정상 설치.
5. **메타 정보 정리**
   - `package.json` name: `tauri-scaffold` → `sosomlab-tauri-test1`
   - `tauri.conf.json` productName/window title: `SosomlabTauriTest1`,
     identifier: `com.sosomlab.tauritest1`
6. **빌드 검증**
   - 프론트엔드 `pnpm build` (tsc + vite) 성공 (dist 생성, 32 modules).
   - Rust 측 `cargo check` 진행(최초 컴파일).

### 기능 및 반영 소스 위치
- 프론트엔드 진입점: `src/main.tsx`, `src/App.tsx`, `src/App.css`
- HTML/번들 설정: `index.html`, `vite.config.ts`, `tsconfig.json`
- Tauri(Rust) 백엔드: `src-tauri/src/lib.rs` (모바일 진입점 포함), `src-tauri/src/main.rs`
- Tauri 설정: `src-tauri/tauri.conf.json` (productName, identifier, 윈도우, 번들 타겟)
- Rust 의존성: `src-tauri/Cargo.toml`
- 권한(capabilities): `src-tauri/capabilities/`
- 패키지/락: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- 기본 IPC 예시 커맨드: `greet` (`src-tauri/src/lib.rs`) — 프론트에서 `invoke('greet')` 호출

### 비고
- 모바일 툴체인 확인됨: Xcode 26.5, CocoaPods 1.16.2, Java 25, ANDROID_HOME 설정됨,
  NDK 27.1.12297006 존재.

---

## 2026-06-27 14:48 ~ — 모바일(iOS/Android) 초기화 및 실행 검증

- **요청**: (동일 작업 연속) macOS/Windows/Linux/모바일 전체 대상 골격 완성.
- **목적**: iOS·Android 네이티브 프로젝트 생성 및 데스크톱 앱 실제 실행 검증.

### 변경내역
1. **Rust 모바일 타겟 추가** (`rustup target add`)
   - iOS: `aarch64-apple-ios`, `aarch64-apple-ios-sim`, `x86_64-apple-ios`
   - Android: `aarch64-linux-android`, `armv7-linux-androideabi`,
     `i686-linux-android`, `x86_64-linux-android`
2. **iOS 프로젝트 초기화** (`pnpm tauri ios init`)
   - Tauri가 iOS 의존성(libimobiledevice 등)을 Homebrew로 자동 설치.
   - 생성: `src-tauri/gen/apple/` (Xcode 프로젝트 `tauri-scaffold.xcodeproj`)
3. **Android 프로젝트 초기화** (`pnpm tauri android init`, NDK_HOME 지정)
   - 생성: `src-tauri/gen/android/` (Android Studio / Gradle 프로젝트)
4. **데스크톱 실행 검증** (`pnpm tauri dev`) — ✅ 성공
   - Rust 바이너리 빌드(1m13s) 후 앱 창 실행 (devUrl http://localhost:1420).
   - `Finished dev` → `Running target/debug/tauri-scaffold` 확인, 프로세스 정상 구동.

### 기능 및 반영 소스 위치
- iOS 네이티브 프로젝트: `src-tauri/gen/apple/`
- Android 네이티브 프로젝트: `src-tauri/gen/android/`
- 모바일 진입점(Rust): `src-tauri/src/lib.rs` 의 `#[cfg_attr(mobile, tauri::mobile_entry_point)]`

### 실행 방법 (요약)
- 데스크톱 개발: `pnpm tauri dev`
- 데스크톱 빌드: `pnpm tauri build`
- iOS 개발: `pnpm tauri ios dev`
- Android 개발: `NDK_HOME=$ANDROID_HOME/ndk/27.1.12297006 pnpm tauri android dev`
- 참고: 새 셸에서는 `source "$HOME/.cargo/env"` 로 Rust 경로 활성화 필요.

---

## 2026-06-27 — M1: GitHub 스타일 Markdown 뷰어 (로컬 + 파일트리)

- **요청**: GitHub 스타일 md 뷰어 개발. 로컬 파일 접근, 소스/렌더러 추상화(추후
  GitHub·Bitbucket·수식·그래프 확장), 데스크톱(Win/macOS) 우선. 진행 중 추가 요청:
  렌더링 선택 전환, ToC 보기, HTML/PDF 내보내기, 언어별 코드 하이라이팅·Mermaid,
  문서 간 링크 연결정보·태그(설계만), Git diff 비교(설계만).
- **목적**: M1(로컬 뷰어 + 파일트리)을 추상화 구조 위에 구현하고 확장 지점을 마련.

### 변경내역
1. **의존성 추가**
   - 프론트: react-markdown, remark-gfm, remark-frontmatter, rehype-raw,
     rehype-slug, rehype-autolink-headings, rehype-highlight, highlight.js,
     github-markdown-css, zustand
   - Tauri 플러그인: @tauri-apps/plugin-dialog, @tauri-apps/plugin-fs (JS+Rust)
   - Rust: tauri-plugin-dialog, tauri-plugin-fs, async-trait, base64
2. **소스 추상화 (Rust)**: `ContentProvider` 트레잇 + `LocalProvider`(경로 탈출 방지,
   디렉터리 나열/파일·에셋 읽기) + 디스패치 커맨드.
3. **소스 추상화 (TS)**: `ContentSource` 인터페이스 + `LocalSource` + 레지스트리.
4. **렌더 프로파일 추상화**: 교체 가능한 렌더링 프로파일(현재 GitHub 1종) + 툴바 선택.
5. **렌더러**: react-markdown 파이프라인, 상대 이미지(data URL)·문서 간 링크·외부 링크 처리.
6. **UI/상태**: zustand 스토어(소스/문서/테마/프로파일/최근문서 영속화), 파일트리,
   ToC 패널, 툴바(열기·프로파일·테마·내보내기), 라이트/다크 CSS 토글, 환영/최근 화면.
7. **내보내기**: HTML(스타일 인라인 단독 파일) + PDF(웹뷰 인쇄, @media print).
8. **권한/정리**: capabilities에 dialog 권한 추가, 기본 `greet` 예제 제거.

### 기능 및 반영 소스 위치
- Rust provider: `src-tauri/src/providers/mod.rs`, `src-tauri/src/providers/local.rs`
- Rust 커맨드: `src-tauri/src/commands.rs` (pick_folder/pick_markdown_file/
  source_list_dir/source_read_file/source_read_asset/write_text_file), 등록 `src-tauri/src/lib.rs`
- 소스 추상화(TS): `src/sources/types.ts`, `src/sources/localSource.ts`, `src/sources/registry.ts`
- 렌더러: `src/renderer/profiles.ts`(확장 지점), `src/renderer/MarkdownView.tsx`, `src/renderer/AsyncImage.tsx`
- 상태: `src/store/viewer.ts`  / 유틸: `src/lib/paths.ts`, `src/lib/exporters.ts`
- UI: `src/components/Toolbar.tsx`, `src/components/FileTree.tsx`, `src/components/Toc.tsx`,
  `src/App.tsx`, `src/App.css`
- 권한: `src-tauri/capabilities/default.json`
- 로드맵/설계 누적: `docs/ROADMAP.md`

### 검증
- `pnpm build` (tsc + vite) 통과, `cargo check` 통과(미사용 trait 메서드 경고는 M3 예정분).
- `pnpm tauri dev` 실행 확인.

### 알려진 한계 / 다음
- JS 번들 ~808KB(highlight.js 전체 언어 포함) → M5에서 최적화.
- 다음 단계는 M2(수식 KaTeX, Mermaid) 또는 M3(GitHub 원격) 중 택일.

---

## 2026-06-27 — M1 보강: 이동 기록(History) + 레이아웃 + 브랜딩

- **요청**: ① 링크로 이동 시 이전 파일로 돌아가기 — 상단에 최근 경로 최대 3개(긴
  이름 … 처리) + 전체 이동 기록 탐색. ② 메인+ToC를 묶고 그 위에 히스토리 탐색 배치.
  ③ 앱 이름 "Nexa Markdown Viewer", 소속 "SosomLab".
- **목적**: 위키 스타일 문서 이동 UX 강화 및 제품 브랜딩 적용.

### 변경내역
1. **이동 기록 스택**: `src/store/viewer.ts` 에 `history`/`historyIndex` + `goTo`/`goBack`/
   `goForward` 추가. 링크·트리 클릭은 push(앞쪽 기록은 분기 시 잘림), 기록 점프는 push 안 함.
   새 소스/최근문서 열기 시 기록 초기화.
2. **HistoryBar**: `src/components/HistoryBar.tsx` — ←/→, 최근 경로 최대 3개(… 처리),
   "전체 기록" 펼침 드롭다운(번호+파일명+경로, 클릭 점프).
3. **레이아웃 재구성**: `src/App.tsx` — `사이드바 | (HistoryBar → doc-area(content+toc))`.
   CSS `.main-area`/`.doc-area`/`.history-*` 추가(`src/App.css`).
4. **브랜딩**:
   - `src-tauri/tauri.conf.json`: productName "Nexa Markdown Viewer",
     identifier `com.sosomlab.nexa-markdown-viewer`, window title 동일, 창 1200×800,
     bundle publisher "SosomLab" / copyright / category / shortDescription.
   - `index.html` title, `src-tauri/Cargo.toml` authors=SosomLab/description.
   - 환영 화면 제목 "Nexa Markdown Viewer".
5. FileTree `isMarkdown` 비컴포넌트 export 제거(Fast Refresh 경고 해소).

### 검증
- `pnpm build`(tsc+vite) 통과. dev 앱 HMR/재컴파일 정상, 패닉 없음.

### 주의
- **identifier 변경**으로 기존 모바일 gen(`gen/apple`·`gen/android`,
  old id `com.sosomlab.tauritest1`)과 불일치. 모바일(M7) 진행 시 `tauri ios/android init`
  재생성 또는 식별자 수동 정정 필요.

---

## 2026-06-27 — M1 보강: 앵커 기반 이동 기록(파일#앵커) + 그룹형 기록 UX

- **요청**: 기록을 "파일#링크(앵커)" 단위로 관리. 같은 파일 내 이동은 `#앵커`,
  파일이 다르면 `파일명#앵커`로 표시. 파일이 다를 때 1-클릭 이동 UX 제안/구현.
- **목적**: 위키 스타일 정밀 이동(문서 내 위치까지) + 빠른 파일 점프.

### 변경내역
1. **스토어**(`src/store/viewer.ts`): `HistoryEntry`에 `hash` 추가. `pendingHash`/`navSeq`로
   이동 시 스크롤 트리거. `navigateAnchor(hash)`(같은 파일, 재로딩 없음), `openDoc(path, hash)`
   (앵커 지원), `goTo`가 앵커까지 복원.
2. **MarkdownView**(`src/renderer/MarkdownView.tsx`): `#앵커`는 `navigateAnchor`로,
   `path#frag` 상대 링크는 분리해 `onNavigateDoc(path, frag)`로 처리.
3. **스크롤**(`src/App.tsx`): `navSeq` 변화 시 `pendingHash` 헤딩으로 스크롤(없으면 본문 상단).
4. **HistoryBar UX**(`src/components/HistoryBar.tsx`): 브레드크럼 라벨 규칙(같은 파일 `#앵커`,
   다른 파일 `파일명#앵커`). 전체 기록 드롭다운을 **파일별 그룹**으로 — 파일 헤더 클릭 시
   해당 파일로 1-클릭 점프, 하위에 방문 앵커 나열(정확 위치 이동).

### 검증
- `pnpm build`(tsc+vite) 통과. dev 앱 HMR 정상, 패닉/에러 없음.

---

## 2026-06-27 — 문서화: README 제품 소개 + 이미지, 릴리스 워크플로

- **요청**: README에 제품 특징이 잘 드러나게 설명 추가 + 적당한 이미지. 진행사항 기록/푸시.
  GitHub Release 배포용 워크플로 추가 및 빌드 테스트.
- **변경내역**
  1. `README.md` 전면 개편: 소개·주요 특징·빠른 시작·빌드/배포·기술 스택/구조·로드맵·배지.
  2. 이미지 제작(`docs/assets/banner.svg`, `docs/assets/screenshot.svg`) — 직접 작성한 SVG
     배너 및 UI 미리보기(목업). GitHub README에서 상대경로로 렌더링.
  3. 릴리스 워크플로 `.github/workflows/release.yml`(사용자 커밋 efd731d): `v*` 태그 push 시
     macOS(유니버설)+Windows 빌드 → `tauri-apps/tauri-action`으로 Release(초안) 업로드.
- **소스 위치**: `README.md`, `docs/assets/`, `.github/workflows/release.yml`
- **빌드 테스트 방법**
  - 로컬: `pnpm tauri build` → `src-tauri/target/release/bundle/`
  - CI: `git tag v0.1.0 && git push origin v0.1.0` → Actions가 빌드 후 **초안 Release** 생성.
- **빌드 테스트 결과**
  - 로컬: 앱 컴파일 + `.app` 번들 성공. 전체 `tauri build`는 DMG 단계(`bundle_dmg.sh`,
    Finder/AppleScript)가 비-GUI 셸에서 실패 → `--bundles app`으로 정상 통과 확인(환경 제약).
  - CI 1차 실패: pnpm 9 ↔ pnpm-workspace.yaml(allowBuilds, pnpm10+ 문법) 충돌
    → "packages field missing". **수정**: package.json에 `packageManager: pnpm@11.8.0`,
    release.yml에서 pnpm 버전 고정 제거(자동 감지) + Node 22. v0.1.0 태그 재푸시로 재실행.
  - CI 2차: **성공**(6m21s). 초안 Release에 dmg/exe/msi/app.tar.gz 업로드 확인.

---

## 2026-06-27 — 릴리스 산출물 이름 정리 + 서명 안내 + 릴리스 노트

- **요청**: 파일명을 `NexaMarkdownViewer_0.1.0.…` 형태로. 코드 서명 미적용 사실을 README에
  명시. 진행사항·Release Notes 보완 후 전체 정리/푸시.
- **변경내역**
  1. `src-tauri/tauri.conf.json`: productName/mainBinaryName "NexaMarkdownViewer"(공백 제거)
     → 업로드 시 점(.) 구분 제거. 타이틀바 표시명은 "Nexa Markdown Viewer" 유지.
     bundle.targets ["dmg","nsis"]로 정리(OS당 설치 파일 1개).
  2. `README.md`: "다운로드 & 설치" 섹션 추가 — **코드 서명 미적용 경고** + macOS/Windows
     우회 방법, Releases 링크.
  3. `CHANGELOG.md` 신규: v0.1.0 Release Notes(Added/Known issues/산출물).
  4. `.github/workflows/release.yml`: releaseBody에 서명 미적용 경고·설치 안내·CHANGELOG 링크.
  5. CI: `gh` 설치/인증 확인(kiros33). 이전 초안 릴리스 삭제, 진행 중 실행 취소 후 변경
     일괄 반영해 v0.1.0 재태그로 단일 재실행.
- **산출물(예상 파일명)**: `NexaMarkdownViewer_0.1.0_universal.dmg`,
  `NexaMarkdownViewer_0.1.0_x64-setup.exe`
- **CI 결과**: 성공. 자산명 정상(`NexaMarkdownViewer_0.1.0_universal.dmg`,
  `..._x64-setup.exe`). 초안 Release 유지.

---

## 2026-06-27 — 앱 이름/조직 보완 + 패널 크기조절/토글(VSCode 스타일)

- **요청**: ① 앱 내부(About/Quit 메뉴) 이름이 `tauri-scaffold`로 나옴 + 기본값 보완
  ② 조직(SosomLab)을 앱·GitHub 문서 설명에 표시 ③ 좌측 파일목록·우측 ToC 크기 조절
  ④ VSCode처럼 아이콘 토글로 패널 숨김/표시.
- **변경내역**
  1. **메뉴 이름**: `src-tauri/Cargo.toml`에 `[[bin]] name = "NexaMarkdownViewer"` 추가
     → dev 실행 바이너리명이 앱 이름과 일치(About/Quit에 반영). 번들은 productName으로
     이미 정상. (lib 이름은 유지해 모바일 gen 영향 없음)
  2. **조직 표시**: 앱 환영화면에 "by SosomLab", GitHub 저장소 description/홈페이지 설정
     (gh repo edit). README/CHANGELOG에는 기존 반영. macOS About 패널은 copyright
     "© 2026 SosomLab" 표시.
  3. **패널 크기 조절**: `store/viewer.ts`에 sidebarWidth/tocWidth + `resizeSidebar/resizeToc`
     (clamp), `components/Resizer.tsx`(포인터 드래그). 너비 localStorage 영속화.
  4. **패널 토글**: sidebarVisible/tocVisible + `toggleSidebar/toggleToc`,
     `components/ActivityBar.tsx`(좌측 아이콘 바: 🗂 탐색기, ☰ 목차). 클릭 시 숨김/표시.
  5. App 레이아웃 재구성: `액티비티바 | [사이드바|리사이저] | (히스토리바 → 본문|리사이저|ToC)`.
- **소스 위치**: `src-tauri/Cargo.toml`, `src/store/viewer.ts`, `src/components/ActivityBar.tsx`,
  `src/components/Resizer.tsx`, `src/App.tsx`, `src/App.css`
- **남은 기본값**: 앱 아이콘이 아직 Tauri 기본 로고 → 추후 커스텀 아이콘 세트 생성 예정.
- **검증**: `pnpm build`(tsc) 통과, `cargo check` 통과(대문자 bin명 허용), dev 실행 확인.

---

## 2026-06-27 — ToC 우측 이동 + 앱 아이콘 + Linux 빌드 + 패키지매니저 로드맵

- **요청**: ① ToC 토글을 우측으로(파일목록처럼 숨김/표시), 우측은 Eclipse 느낌의 작은 아이콘
  ② 앱 아이콘/파비콘 — 큰 "S"(SosomLab) 배경 + 우상단 1/4 정사각 "M↓" ③ Linux 빌드 추가
  ④ WinGet/Chocolatey/Homebrew 등록을 할 일에 추가.
- **변경내역**
  1. ToC 토글을 좌측 ActivityBar에서 제거 → 우측 `components/RightBar.tsx`(Eclipse 스타일,
     작은 세로 라벨 아이콘)로 이동. App 레이아웃 우측에 배치. CSS `.right-bar/.right-btn`.
  2. 앱 아이콘: `public/app-icon.svg`(큰 S 배경 + 우상단 M↓ 배지) → rsvg로 1024 PNG 렌더 →
     `pnpm tauri icon`으로 데스크톱/iOS/Android 아이콘 세트 생성. favicon을 app-icon.svg로 교체.
  3. Linux 빌드: `tauri.conf.json` bundle.targets에 deb/rpm/appimage 추가, `release.yml`
     매트릭스에 `ubuntu-22.04` 잡 + apt 의존성 설치 스텝. releaseBody에 Linux 안내.
  4. 로드맵: "배포 채널 — WinGet/Chocolatey/Homebrew 등록" 항목 추가(선행: 코드 서명/체크섬).
- **소스 위치**: `src/components/RightBar.tsx`, `src/components/ActivityBar.tsx`, `src/App.tsx`,
  `src/App.css`, `public/app-icon.svg`, `src-tauri/icons/*`, `index.html`,
  `src-tauri/tauri.conf.json`, `.github/workflows/release.yml`, `docs/ROADMAP.md`

---

## 2026-06-27 — M3(1차): GitHub 원격 소스(PAT) + 온라인 갱신 감지

- **요청**: GitHub에 직접 로그인해 md 열람, 온라인 갱신 시 갱신(버튼), 갱신 여부 판단.
  → 인증=PAT 우선(+추후 OAuth), 갱신=감지+갱신버튼, 토큰=암호화 로컬 저장.
- **변경내역(백엔드)**
  1. 토큰 암호화 저장 `src-tauri/src/secrets.rs` (AES-256-GCM, 키=pepper+사용자명 파생,
     nonce=getrandom, 앱 로컬데이터에 저장).
  2. `src-tauri/src/providers/github.rs`: GithubProvider(contents/branches API, reqwest
     rustls). read_file가 blob `sha`를 version으로 반환, latest_version로 갱신 감지.
  3. `providers/mod.rs`: FileContent에 `version`, 트레잇에 `latest_version` 추가.
  4. `src-tauri/src/commands.rs`: app-aware provider 디스패치(github는 저장 토큰 주입),
     github_login/status/logout/default_branch, source_latest_version/list_branches.
  5. deps: reqwest(json,rustls-tls,gzip), aes-gcm, sha2, getrandom.
- **변경내역(프론트)**
  1. `src/sources/githubSource.ts`(+types version/latestVersion, registry github).
  2. `src/store/github.ts`: 계정/등록 저장소(localStorage), 로그인/로그아웃/추가/삭제.
  3. `src/store/viewer.ts`: currentVersion/updateAvailable + checkForUpdate(포커스 시) + reload.
  4. UI: `src/components/GithubPanel.tsx`(PAT 로그인·repo 등록/열기), ActivityBar에 GitHub
     뷰 전환(🐙), HistoryBar에 "🔄 갱신 가능/새로고침" 버튼.
- **갱신 감지 방식**: 문서 열 때 blob sha 저장 → 창 포커스 시 latest_version과 비교 →
  다르면 "갱신 가능" 배지, 버튼 클릭 시 강제 재로딩.
- **보안**: 토큰은 Rust에만 보관(JS로 노출 안 함), 암호화 로컬 저장.
- **검증**: `cargo check` 통과, `pnpm build`(tsc) 통과, dev 재시작 부팅 확인. (실제 로그인은
  사용자 PAT로 테스트 필요 — fine-grained PAT, Contents: Read)
- **다음**: OAuth 디바이스 로그인, 다중 계정, 자동 폴링 옵션.
