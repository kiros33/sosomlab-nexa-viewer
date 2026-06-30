# 진행 기록 (Progress Log)

프로젝트: **sosomlab-tauri-test1** — Tauri 2.x 기반 크로스 플랫폼 데스크톱/모바일 앱
스택: Tauri 2 + React 19 + TypeScript + Vite 7 (패키지 매니저: pnpm)

각 항목 형식: 일시 / 요청 / 목적 / 변경내역 / 기능 및 반영 소스 위치

---

## 2026-07-01 — macOS 전달인자 처리: 동작 확인 + 줄단위 최종 정리 + 후속 이슈

- **요청**: ① macOS `open -a` 동작 확인 결과 "동일 폴더가 또 등록되고 다시 열리는" 중복 문제를
  **후속 이슈로 등록** ② macOS 전달인자 수정 내역을 **줄단위까지 기록** ③ 진행사항 정리 후 push.
- **현재 상태**: macOS에서 외부 인자로 파일/폴더 **열림 동작 확인됨**(전역 버퍼 전환 후). 다만 이미
  등록된 폴더를 다시 열면 **중복 등록·재열림** 발생 → ROADMAP에 🐞 이슈로 등록.

### 최종 코드 맵 (커밋 `5925533` 기준, 줄 번호는 해당 시점)
- **`src-tauri/src/commands.rs`**
  - L4–5: `use std::path::{Path, PathBuf}; use std::sync::{Mutex, OnceLock};`
  - L39–44: `StartupTarget { root, file }` — `#[derive(Clone, serde::Serialize)]` + `rename_all="camelCase"`.
  - L51–55: `opened_buffer()` — `static BUF: OnceLock<Mutex<Vec<StartupTarget>>>` **전역 버퍼**(런루프 의존 제거).
  - L57–61: `push_opened(targets)` — 런루프에서 받은 대상을 전역 버퍼에 적재.
  - L65–82: `resolve_target(path)` — 경로→`{root,file}`(폴더=root, 파일=상위폴더+파일명), 미존재 시 `None`.
  - L93–98: `startup_target()` — argv(0번 제외, 플래그 아님 + 존재)에서 첫 경로 → `resolve_target`.
  - L103–108: `take_opened_targets()` — 인자 없음(전역 버퍼 drain). 다른 OS는 빈 배열.
- **`src-tauri/src/lib.rs`**
  - L70–71: `invoke_handler`에 `startup_target`, `take_opened_targets` 등록.
  - L86–87: `.build(generate_context!())` 로 전환(이벤트 루프 클로저 사용 목적).
  - L88–116: `.run(|app_handle, event| …)`
    - L94: `if let RunEvent::Opened { urls } = event`(macOS만).
    - L99–101: `urls`→`to_file_path()`→`resolve_target` 로 `targets` 구성.
    - L102: `commands::push_opened(targets.clone())`(콜드스타트 대비 버퍼 적재).
    - L104: `app_handle.emit("open-targets", targets)`(실행 중 즉시 전달).
    - 비-macOS: `let _ = (&app_handle, &event);`(미사용 경고 방지).
- **`src-tauri/tauri.conf.json`**
  - L28–35: `bundle.fileAssociations` — `ext:[md,markdown,mdown,mkd]`, `role:Viewer` → Info.plist `CFBundleDocumentTypes`.
- **`src/App.tsx`** (부팅 effect L80–134)
  - L86–92: `openOne(t)` — `${root}::${file}` 키로 **1.5초 내 동일 대상 중복 열기 방지** 후 `openExternalTarget`.
  - L93–97: `openList(list)` — 목록을 순차 `openOne`.
  - L100–105: **리스너 먼저 등록** `listen("open-targets", …)`(버퍼 drain 전후 누락 방지).
  - L110–118: argv(`startup_target`) + macOS 전역 버퍼(`take_opened_targets`) 수집.
  - L123–125: `docPath` 비어 있을 때만 부팅 자동 열기(`openOne`).
- **`src/store/viewer.ts`**
  - L497–510: `openExternalTarget(root, file)` — `addWorkspace(ref)` → 펼침 → 파일이면 `openInSource`, 폴더면 `openSource`.

### 후속 이슈(등록)
- 🐞 **중복 등록·재열림**: `openExternalTarget`(viewer.ts L497)가 매번 `addWorkspace`(이미 있으면 최상단
  이동)하고 `openInSource`로 재로딩함. → 이미 등록/열려 있으면 재사용하도록 개선 필요. ROADMAP M5 참고.

---

## 2026-07-01 — 외부 인자 열기 macOS 디버깅 + 견고화(전역 버퍼)

- **요청**: macOS에서 `open -a App 파일` 로 열어도 파일이 열리지 않음 → 원인 파악 및 수정.
- **진단(.app 빌드 후 실측, /tmp/nexa-opened.log 추적)**
  - `RunEvent::Opened` 는 **정상 발생**(파일 URL도 정확)하고, argv 직접 실행 경로도 정상.
  - 그러나 프론트 부팅 시 `take_opened_targets`(당시 Tauri **managed state**(`PendingOpen`) 기반)가
    **빈 배열**을 반환 → 콜드스타트 버퍼가 비어 파일이 열리지 않음.
  - 원인 추정: 런루프 클로저(`.run(|app,e|…)`)에서 `app_handle.try_state::<PendingOpen>()`로
    적재한 내용이 커맨드 측 managed state와 어긋남(런루프에서 managed state 접근 불안정).
- **수정(견고화)**
  - 버퍼를 **managed state → 전역 `OnceLock<Mutex<Vec<…>>>`** 로 변경(`commands.rs`:
    `opened_buffer()`, `push_opened()`, 인자 없는 `take_opened_targets()`). 런루프 의존성 제거.
  - `lib.rs`: `app.manage(PendingOpen)` 제거, `Opened` 핸들러에서 `push_opened()` + `emit("open-targets")`.
  - `App.tsx`: **리스너 먼저 등록 → 그다음 버퍼 drain** 순서로 변경(누락 방지) + 1.5초 내
    동일 대상 **중복 열기 방지**(버퍼 drain과 이벤트 중복 대비). 디버그 로그 전부 제거.
- **소스 위치**: `src-tauri/src/commands.rs`(opened_buffer/push_opened/take_opened_targets),
  `src-tauri/src/lib.rs`(Opened 핸들러), `src/App.tsx`(부팅 effect).
- **검증**: `pnpm build` + `cargo check` 통과(경고 0), `.app` 재빌드. 실제 Finder/`open -a`
  동작은 사용자 대화형 환경에서 확인(아래 절차).

---

## 2026-07-01 — 외부 인자 열기 macOS 대응 구현

- **요청**: 최근 Windows에 추가한 외부 인자(파일/폴더) 열기를 macOS에서도 동일하게 구현 + 테스트 방법 안내.
- **배경**: macOS는 Finder 더블클릭/"다음으로 열기"/Dock 드래그가 argv가 아니라 Apple `Opened`
  이벤트로 전달돼, 기존 argv 기반(`startup_target`)만으로는 동작하지 않음.
- **변경내역(구현)**
  1. `commands.rs`: `resolve_target(path)` 헬퍼로 경로→`{root,file}` 해석 로직 공용화(argv·Opened 공유).
     `StartupTarget`에 `Clone` 추가. macOS 콜드스타트 버퍼 `PendingOpen(Mutex<Vec<StartupTarget>>)`
     + `take_opened_targets` 커맨드(버퍼 drain) 추가.
  2. `lib.rs`: `app.manage(PendingOpen::default())` 등록, `take_opened_targets` 핸들러 추가.
     `.run(generate_context!())` → `.build(…)?.run(|app, e| …)`로 전환해 `RunEvent::Opened { urls }`
     처리 — 콜드스타트분은 버퍼에 적재, 실행 중이면 `open-targets` 이벤트 emit.
  3. `tauri.conf.json`: `bundle.fileAssociations`(md/markdown/mdown/mkd, role=Viewer) 추가
     → macOS Info.plist `CFBundleDocumentTypes` 자동 생성(Windows 연결도 함께).
  4. `App.tsx`: 부팅 시 `startup_target`(argv) + `take_opened_targets`(macOS 버퍼) 수집 후 열기,
     실행 중 추가 열기는 `listen("open-targets")` 구독. (이미 문서 열려 있으면 부팅 자동열기 생략)
- **소스 위치**: `src-tauri/src/commands.rs`(resolve_target/PendingOpen/take_opened_targets),
  `src-tauri/src/lib.rs`(manage + RunEvent::Opened), `src-tauri/tauri.conf.json`(fileAssociations),
  `src/App.tsx`(부팅 effect + open-targets 구독).
- **검증**: `pnpm build`(tsc+vite) 통과, `cargo check` 통과(경고 0). 실제 Finder 열기/Dock 드래그는
  `.app` 번들 빌드 후 사용자 대화형 환경에서 확인 필요(아래 테스트 절차 안내).
- **문서 반영**: ARCHITECTURE(IPC 표·부팅 흐름·외부 인자 설명), ROADMAP(완료 처리), FAQ(파일 더블클릭 열기).

---

## 2026-07-01 — 검색·파일변경 갱신 설계 + 외부 인자 macOS 대응 확인

- **요청**: ① 검색 기능(단어 단위 기본 + 정규식)을 구현 대상으로 단계 정리 ② 최근 Windows에
  추가한 외부 인자 열기를 macOS에서도 동일하게 할 수 있는지 확인 ③ 설정에 "파일 변경 시 갱신"
  옵션(미사용/변경 알림/자동, 자동은 현재 위치 유지)을 구현 대상으로 정리.
- **변경내역(문서/설계)**
  1. **검색 설계** `docs/SEARCH.md`: 공통 옵션 모델(대소문자/단어단위/정규식 → RegExp 통일),
     단계 S1(현재 문서 단어 검색)→S2(정규식)→S3(파일명 필터)→S4(워크스페이스 grep, 로컬→GitHub)
     →S5(고도화). 권장 진행 순서·보안(토큰 Rust 격리) 포함.
  2. **파일 변경 갱신 설계** `docs/AUTO-REFRESH.md`: 모드 `manual/notify/auto`(기본 notify),
     R1(설정+알림 정비)→R2(로컬 변경 감지: notify 워처 또는 mtime 폴링, 버전 개념 일반화)
     →R3(자동 갱신 + **heading 기준 위치 유지**, 디바운스)→R4(폴링 간격/저장소별 override/트리 동기화).
  3. **외부 인자 macOS 대응(확인 결과)**: 현재 argv 기반은 macOS Finder 더블클릭/"다음으로 열기"
     (Apple Event)에서 동작 안 함. 필요: `bundle.fileAssociations`(Info.plist CFBundleDocumentTypes)
     + `RunEvent::Opened { urls }` 처리(`.build().run(|app,e| …)`로 변경) + 프론트 이벤트 listen
     (+ single-instance로 2번째 실행 라우팅). → **가능하나 별도 작업 항목**으로 로드맵 반영.
  4. **로드맵 갱신** `docs/ROADMAP.md`: M5에 검색/파일변경갱신/외부인자 macOS 항목 추가, 추적표 반영.
- **소스 위치**: `docs/SEARCH.md`, `docs/AUTO-REFRESH.md`, `docs/ROADMAP.md`(M5 + 추적표).
  - 관련 기반 코드(향후 구현 지점): `src/store/viewer.ts`(checkForUpdate/scroll 복원/refreshMode 예정),
    `src-tauri/src/commands.rs`(startup_target/검색·watch 커맨드 예정), `src-tauri/src/lib.rs`(RunEvent 예정).
- **검증**: 설계/문서 작업으로 코드 변경 없음. 저장소는 `origin/main`과 동기 상태에서 진행.

---

## 2026-06-30 — 외부 인자 열기 + 포터블 설계 + 기술/동작 구조 문서화

- **요청**: ① 포터블 버전을 만들 수 있는 설계 추가 ② 외부 인자로 파일/폴더를 받아 바로
  보여주는 기능 ③ 기술 구조 분석 문서(없으면 추가) ④ 호출 구조·동작 방식 문서(없으면 추가).
  + 전체 진행/소스 현황 점검 및 메모리.
- **변경내역**
  1. **외부 인자 열기(구현)**: `Viewer.exe "C:\docs\guide.md"`/연결 프로그램/끌어다 놓기로 실행 시
     해당 파일·폴더를 즉시 연다.
     - Rust `commands.rs::startup_target` — `argv`(0번 제외)에서 플래그가 아니면서 **실제 존재하는**
       첫 경로를 해석해 `{root, file}` 반환(파일이면 상위폴더+파일명, 폴더면 root만). `lib.rs` 등록.
     - 프론트 `store/viewer.ts::openExternalTarget(root, file)` — 워크스페이스 등록·펼침 후
       파일이면 `openInSource`, 폴더면 `openSource`. `App.tsx` 마운트 effect에서 1회 호출
       (이미 문서가 열려 있으면 무시).
  2. **포터블 설계(문서)** `docs/PORTABLE.md`: `portable.txt` 마커로 모드 판별 → 데이터 경로를
     `<exe>/data`로 분기(`secrets.rs`는 인자로 dir 받으므로 무수정), WebView2 UDF
     (`WEBVIEW2_USER_DATA_FOLDER`) 옆으로 이동, CI에서 `exe+portable.txt` zip 산출. 적용 체크리스트 포함.
  3. **기술 구조 + 호출/동작 문서(문서)** `docs/ARCHITECTURE.md`: 프론트(WebView)↔Rust 코어 경계,
     디렉터리 구조, 소스/렌더 추상화(ContentSource↔ContentProvider 대칭), IPC 커맨드 표,
     문서 열기/이동기록/갱신감지/부팅 흐름, localStorage 영속화, 빌드 파이프라인.
  4. **로드맵 갱신** `docs/ROADMAP.md`: 외부 인자(완료)·포터블(설계)·문서화(완료) 항목/추적표 반영.
- **소스 위치**: `src-tauri/src/commands.rs`(startup_target/StartupTarget), `src-tauri/src/lib.rs`(등록),
  `src/store/viewer.ts`(openExternalTarget), `src/App.tsx`(부팅 effect),
  `docs/ARCHITECTURE.md`, `docs/PORTABLE.md`, `docs/ROADMAP.md`.
- **검증**: `pnpm build`(tsc+vite) 통과(841KB 번들, 경고는 기존 highlight.js 크기).
  - **백엔드 실제 컴파일 확인**: `pnpm tauri dev`로 릴리스 아님 디버그 빌드 수행 →
    `Finished dev … 8m05s` → `Running target\debug\NexaMarkdownViewer.exe '…hello.md'` 까지 진행,
    **외부 인자가 바이너리로 그대로 전달됨**을 로그로 확인(기존 macOS 한정 미사용 경고 3건만).
  - ⚠️ 정정: 직전 기록의 "cargo check 통과"는 **거짓 양성**이었음 — `cargo check 2>&1 | tail`에서
    파이프 종료코드가 tail(0)로 가려졌고, 당시 셸엔 `cargo`가 PATH에 없었음.
  - **환경 메모(이 PC)**: `cargo`/`rustc`가 PATH에 없음 → `~/.cargo/bin`에 존재
    (`$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"` 또는 bash `export PATH="$HOME/.cargo/bin:$PATH"` 필요).
  - **GUI 창은 에이전트 백그라운드 셸에서 유지 불가**(데스크톱 세션 미연결로 프로세스 즉시 종료) →
    실제 창 렌더링/자동 열림은 사용자 대화형 터미널에서 확인.
- **실행/테스트 방법(정리)**
  - dev: `pnpm tauri dev -- -- "<파일|폴더 경로>"` (`-- --` = pnpm→tauri→앱 바이너리 인자 전달).
    디버그 exe는 `devUrl(http://localhost:1420)`에서 화면을 불러오므로 **단독 실행 금지**, dev로 함께 실행.
  - 자체 완결 테스트(더블클릭/연결 프로그램처럼): `pnpm tauri build --no-bundle` →
    `target\release\NexaMarkdownViewer.exe "<경로>"` 직접 실행(릴리스는 번들 dist 사용).
  - 테스트 픽스처(스크래치패드): `nexa-arg-test/{hello.md, more.md}`.
- **현황 점검 요약**: M1 완료, M3(GitHub 원격) 1차 완료. 배포 채널 — Homebrew Tap 운영,
  Chocolatey/winget 검수 진행, SignPath Foundation 서명 신청. M2(KaTeX/Mermaid)·검색·탭 미착수.

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

---

## 2026-06-27 — 탐색기/GitHub/설정 UX 대폭 보강 + 버그 수정

- **요청(다수)**: 다중 저장소 탐색기, 우클릭 컨텍스트 메뉴, 환경설정 모달(표시 파일/글꼴),
  일반텍스트 뷰어, 내보내기 모달, Material 아이콘, 스크롤 복원, 패널 docking 등.
- **변경내역(기능 단위 커밋)**
  - 다중 루트 탐색기(`Explorer`/`FileTree`): 로컬+GitHub를 접이식 루트로, 기본 접힘 + 펼침
    상태 영속화, 폴더/파일 아이콘 구분, 루트 배경색 구분.
  - 루트 갱신 버튼 + 우클릭 컨텍스트 메뉴(`SourceContextMenu`): 갱신/온라인·폴더 열기/제거/
    파일 보기(저장소별 override).
  - 환경설정 모달(`Preferences`): 표시 파일(전역 일괄 적용) + 일반텍스트 글꼴/크기.
    저장소별 override는 컨텍스트 메뉴에서.
  - 비-마크다운 `PlainTextView`(고정 글꼴, Ctrl/⌘ +/-).
  - 내보내기 모달(`ExportModal`): 큰 PDF/HTML 선택.
  - GitHub 패널 3구역(등록/직접등록/내 저장소 +/−·실시간 검색), 목록 docking.
  - 아이콘: 공통 `Icon`(Material) + `GithubMark`(octocat) + `FormatBadge`(내보내기).
  - 이동 기록 스크롤 위치 저장/복원(뒤로·앞으로).
- **버그 수정**
  - 동일 이름 파일 stale, **camelCase 직렬화로 폴더 미인식**, 깜빡임/재요청, 펼침 상태 초기화.
- **소스 위치**: `src/components/*`(Explorer/FileTree/Preferences/ExportModal/SourceContextMenu/
  Icon/GithubMark/FormatBadge/RightBar/ActivityBar/HistoryBar/Toolbar/GithubPanel),
  `src/renderer/PlainTextView.tsx`, `src/store/viewer.ts`, `src/lib/filetypes.ts`,
  `src-tauri/src/providers/mod.rs`, `src/App.tsx`, `src/App.css`.
- **검증**: 각 커밋마다 `pnpm build`(tsc) 통과 후 커밋·푸시, 필요한 경우 `cargo check`.
- **릴리스 노트**: `CHANGELOG.md` [Unreleased]에 Added/Changed/Fixed/Security로 정리.

---

## 2026-06-27 — v0.2.0 배포 + Wiki 메뉴얼(실제 캡처) + 아이콘/글꼴 보완

- **요청**: 글꼴 선택 보완, v0.2.0 배포, GitHub Wiki에 기능별 이미지 포함 메뉴얼, 앱 아이콘 크기(macOS 표준).
- **변경내역**
  1. **글꼴 선택**(`src/lib/fonts.ts`, `Preferences`): 직접 입력(쉼표 다중) + 목록에서 추가
     (설치 글꼴 조회/폴백) + 미리보기.
  2. **v0.2.0 정식 배포**: 버전 상향(tauri.conf/package/Cargo), CHANGELOG [0.2.0] 확정,
     `v0.2.0` 태그 → 3-OS(CI) 빌드 → Release 공개(dmg/exe/deb/rpm/AppImage).
  3. **GitHub Wiki 메뉴얼**: 기능별 페이지(설치/빠른시작/탐색기/GitHub/문서보기/내보내기/설정/빌드/FAQ)
     + 사용자 제공 실제 캡처 15장을 의미있는 이름으로 정리하고 패널/메뉴/모달/기록은 ImageMagick으로
     해당 영역 크롭. 위키 push + 저장소 `docs/wiki/`(이미지 포함) 동기화.
  4. **앱 아이콘**: 타일을 꽉 채워 크게 보이던 문제 → macOS 표준 여백(본체 824/1024 + 투명 여백)으로
     `icon-source.svg` 재구성 후 `tauri icon` 재생성(다음 빌드부터 적용).
  5. 원본 캡처는 `docs/images/`(소스), 크롭/사용본은 `docs/wiki/images/`.
- **도구**: gh(릴리스), cliclick/screencapture(자동 캡처 시도 — 합성 클릭 차단으로 수동 캡처로 전환),
  rsvg-convert/ImageMagick(아이콘·크롭). 모두 brew 설치.
- **검증**: 각 기능 커밋마다 `pnpm build` 통과, v0.2.0 CI 성공.

---

## 2026-06-28 — 배포 채널: Homebrew Tap(Cask) 등록

- **요청**: Nexa Markdown Viewer를 Brew로 받을 수 있게 등록(빠른 Tap 방식). 진행 내용 정리,
  메뉴(설치 안내)에 Homebrew 방법 추가, 위키까지 반영 후 push.
- **목적**: macOS 사용자가 `brew install --cask`로 한 줄 설치/업그레이드/제거할 수 있도록
  배포 채널 추가(로드맵의 "배포 채널 — WinGet/Chocolatey/Homebrew 등록" 중 Homebrew 선행).
- **변경내역**
  1. **탭 저장소 생성**: `kiros33/homebrew-tap`(public) — `gh repo create`로 생성/푸시.
     - `Casks/nexa-markdown-viewer.rb`: v0.2.1 universal DMG 기준 Cask
       (`url` = Release 자산, `sha256` = 08a0f996…125c725, `app "NexaMarkdownViewer.app"`,
       `zap trash`로 앱 데이터/Preferences/SavedState 정리). 불필요한 `verified:` 파라미터 제거.
     - `README.md`: 설치/업그레이드/제거 안내.
  2. **설치 안내 보강**: `README.md` "다운로드 & 설치"에 **🍺 Homebrew(권장)** 서브섹션 추가
     (직접 내려받기와 분리). 위키 `docs/wiki/Installation.md` 최상단에 Homebrew 섹션 추가.
  3. **CHANGELOG**: `[Unreleased] > Docs`에 Homebrew Tap 설치 안내 항목 추가.
- **SHA256 산출 방법**: `shasum -a 256 NexaMarkdownViewer_<버전>_universal.dmg`
  (다음 버전 릴리스 시 Cask의 `version`/`sha256` 두 줄만 갱신해 탭에 푸시).
- **검증**
  - `brew tap kiros33/tap` → `brew info --cask` 정상 인식.
  - `brew audit --cask --new` — 서명/`verified`/저장소 인지도 경고만(개인 탭에선 무관),
    `verified` 경고는 파라미터 제거로 해소.
  - `brew install --cask kiros33/tap/nexa-markdown-viewer` — 다운로드 + **SHA256 체크섬
    검증 통과**(`✔︎ Cask nexa-markdown-viewer (0.2.1)`). 파일 복사 단계는 기존
    `/Applications/NexaMarkdownViewer.app`(수동 설치본) 존재로 멈춤 → 기존 앱 보존 위해
    덮어쓰지 않음(탭 동작 자체는 정상).
- **참고**
  - GUI 앱(.app/.dmg)이라 Formula가 아닌 **Cask**로 등록.
  - 앱이 미서명이나 Homebrew Cask는 설치 시 quarantine를 자동 제거 → Gatekeeper 경고 없이 실행.

---

## 2026-06-28 — 배포 채널: Chocolatey(Windows) 패키지 준비 + CI 자동화

- **요청**: Chocolatey에 등록하는 방법, Windows에서 진행해야 하는지 먼저 확인.
- **확인 결과**: 패키지 정의 파일(.nuspec/install.ps1)은 OS 무관하게 작성 가능하나,
  `choco pack`·설치 테스트·`choco push`는 **Windows 필요**. → 물리 Windows 없이 진행하도록
  **GitHub Actions `windows-latest` 러너로 자동화**(사용자 선택: CI 자동화).
- **변경내역**
  1. `packaging/chocolatey/nexa-markdown-viewer.nuspec` — 패키지 메타데이터(버전은 CI에서
     `choco pack --version`으로 덮어씀).
  2. `packaging/chocolatey/tools/chocolateyinstall.ps1` — Tauri NSIS 무인설치(`/S`),
     `url64`/`checksum64`는 `__URL64__`/`__CHECKSUM64__` 플레이스홀더(CI에서 치환).
  3. `.github/workflows/chocolatey.yml` — release publish 시(또는 수동 dispatch) windows 러너에서
     버전·자산 URL 계산 → exe 다운로드·SHA256 계산 → install 스크립트 치환 → `choco pack` →
     `choco push`(community.chocolatey.org).
- **남은 수동 작업(사용자)**
  - community.chocolatey.org 계정 생성 → API Key 발급 → 저장소 Secret `CHOCO_API_KEY` 등록.
  - 그 후 워크플로 수동 실행(태그 `v0.2.1`) 또는 다음 릴리스에서 자동 게시.
  - ⚠️ 커뮤니티 저장소는 **검수(moderation)** 절차가 있어 즉시 노출되지 않음(자동검증+사람 검수).
  - 참고: 현재 repo에 LICENSE 파일이 없음 → 검수 원활화를 위해 LICENSE 추가 권장(licenseUrl).
- **참고**: 참고용 v0.2.1 exe SHA256 = `eb7997…381646` (실제 게시 값은 CI가 매 릴리스 재계산).
- **README/위키 안내**: Chocolatey 설치 안내(`choco install nexa-markdown-viewer`)는
  **첫 게시 승인 후** 추가 예정(미게시 상태에서 안내하면 오인 소지).

---

## 2026-06-28 — 배포 파이프라인 자동화 + winget 채널 추가

- **요청**: ① release.yml `releaseDraft`를 false로(자동 게시) ② 롤백 가능 여부 정리
  ③ release 시 winget도 자동 진행되도록 구성, winget이 API 키가 필요한지.
- **변경내역**
  1. `release.yml`: `releaseDraft: true → false`. 이제 `v*` 태그 push → 3-OS 빌드 →
     **자동 게시** → `release: published` 이벤트로 chocolatey/winget 워크플로 자동 트리거.
  2. **winget 자동화** `.github/workflows/winget.yml`: release publish(또는 수동 dispatch) 시
     `vedantmgoyal9/winget-releaser`로 microsoft/winget-pkgs에 버전 PR 자동 생성
     (ubuntu 러너, x64 NSIS 자산 선택).
  3. **winget 초기 매니페스트** `packaging/winget/0.2.1/`(version/installer/defaultLocale,
     schema 1.6.0) + `packaging/winget/README.md`. InstallerType=nullsoft,
     SHA256=EB7997…381646(실제 자산과 대조 일치).
- **API/토큰**: winget은 별도 API 키 없음. fork→push→PR 구조라 **GitHub classic PAT
  (`public_repo`)**를 Secret `WINGET_TOKEN`으로 등록해야 함. (Chocolatey의 `CHOCO_API_KEY`에 대응)
- **최초 1회 수동**: winget-releaser는 기존 패키지의 새 버전만 올리므로, 첫 버전(0.2.1)은
  komac/wingetcreate 또는 수동 PR로 등록 필요 → 이후 버전부터 자동.
- **롤백 정리(문서 답변)**: GitHub Release·Homebrew 탭은 되돌리기 쉬움. Chocolatey·winget은
  중앙저장소+검수라 게시 버전 삭제가 어려움 → **상위 버전 roll-forward**가 정석.
- **검증**: 워크플로/매니페스트 YAML 파싱 OK, SHA256 대조 일치.

---

## 2026-06-28 — winget 최초 등록 PR 제출 (komac)

- **요청**: WINGET_TOKEN 등록 완료 → 첫 제출을 직접 진행(명령 안내받아 수행).
- **수행**
  1. `brew install komac` → `komac token update`(PAT 등록).
  2. `komac new SosomLab.NexaMarkdownViewer --version 0.2.1 --urls <x64-setup.exe>` 대화형 진행.
     - Install modes/Upgrade behavior=install/Commands·Protocols·File extensions=비움 등 입력.
     - 생성 매니페스트는 ManifestVersion 1.12.0(komac 최신 스키마), 값은 사전 작성분과 일치.
  3. Submit 시 `kiros33/winget-pkgs` fork 부재로 1차 실패 →
     `gh repo fork microsoft/winget-pkgs --clone=false`로 fork 생성 후 재실행.
  4. **PR 생성 성공: microsoft/winget-pkgs#394582**.
- **다음**: MS 자동 검증(샌드박스 설치 테스트) + 검수 → 머지되면 `winget install SosomLab.NexaMarkdownViewer`
  사용 가능. 이후 버전부터는 `.github/workflows/winget.yml`이 동일 fork/토큰으로 자동 PR.
- **참고**: fork 계정·`WINGET_TOKEN` 소유 계정은 모두 kiros33(자동화 일관성). 미서명이라
  SmartScreen 경고는 남지만 winget 검증/설치에는 지장 없음.

---

## 2026-06-28 — Chocolatey/winget 검수 진행 + nuspec 품질 보완

- **Chocolatey**: 0.2.1 푸시 후 chocolatey-ops 자동 검증/패키지 테스트(verification) 통과,
  패키지 스캐닝 단계로 진행. Requirements 위반 없음(승인 가능). Guidelines 2건 지적.
  - 반영: nuspec에 `iconUrl` 추가(jsDelivr CDN, `src-tauri/icons/128x128.png`, 200 확인).
  - projectSourceUrl은 저장소(소스코드)를 정확히 가리키므로 유지(Guideline 요건 충족).
  - 이미 푸시된 0.2.1은 변경 불가 → **다음 버전(CI)부터 반영**.
- **winget**: PR #394582 자동 검증/CLA 통과, 모더레이터 승인 대기.
  - CLA: 개인(회사 무관) 자격으로 `@microsoft-github-policy-service agree` 코멘트 게시 → Needs-CLA 해제.
  - 머지는 본인 불가(브랜치 보호: 마지막 push자 외 write 권한자 승인 필요) → 모더레이터 대기.
    추가 push 금지(승인/검증 리셋 방지).

---

## 2026-06-28 — Windows 코드 서명 방향 결정 + SignPath Foundation 신청

- **요청/논의**: Windows 코드 서명 개념·필요성·인증서 종류·발급(유료/무료)·서명 방법 학습 후,
  SmartScreen 무경고 목표로 무료 경로(SignPath Foundation) 검토.
- **정리한 핵심**
  - SmartScreen은 "서명 여부"가 아니라 **인증서/파일 평판**으로 동작 → OV는 다운로드 누적에 따라
    점진적 해소, **EV만 첫날 즉시 무경고**.
  - 2023.6 규정: 공개신뢰 OV/EV 개인키는 하드웨어/HSM/클라우드 보관 의무(단순 .pfx 발급 불가).
  - SignPath: **Foundation(무료·영구·OSS)** vs **상용 trial(테스트 인증서·만료)** 구분 — 무료 영구는
    Foundation 신청 경로(별도). 단 Foundation은 **인지도(notability) 요건**이 있어 신규 저장소는
    거절 가능 → 대안은 Azure Trusted Signing(~$10/월, 공개신뢰 OV, 토큰 불필요).
- **라이선스 점검(서명 무관 부수 작업)**: JS(prod) + Rust 521 크레이트 라이선스 조사 →
  **GPL/AGPL 0건**, 대부분 MIT/Apache. MPL-2.0(5개: cssparser/selectors 등)은 파일단위 약한
  카피레프트라 **수정 안 하면 MIT 유지 OK**. r-efi는 MIT 선택 가능. → **MIT 유지 가능**,
  남은 의무는 서드파티 고지(THIRD-PARTY-NOTICES) 정도(추후).
- **수행**: SignPath Foundation 신청서(signpath.org/apply) 작성 — 개인 maintainer, GitHub Actions,
  홈페이지/다운로드 `https://sosomlab.com/apps/nexa-markdown-viewer/`(200 확인).
  - **요건**: Download 페이지에 "SignPath Foundation 코드 서명 사용" 문구 필요 →
    README 다운로드 섹션 + 위키 Installation에 SignPath Foundation 서명 안내 추가
    (현재 미서명 상태는 정직하게 유지: 서명 적용/평판 누적 전 경고 가능 명시).
- **다음**: 신청 승인 시 CI 연동(미서명 빌드 → SignPath 서명 → 릴리스 첨부). 거절/지연 시 Azure로 전환.
