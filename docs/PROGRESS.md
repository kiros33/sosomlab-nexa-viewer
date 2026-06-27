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
