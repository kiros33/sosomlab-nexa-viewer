# 기술 구조 & 동작 방식 (Architecture)

Nexa Markdown Viewer의 **기술 구조(#3)** 와 **호출 구조·동작 흐름(#4)** 을 정리한 문서.
코드와 함께 갱신한다. (단계별 계획은 [ROADMAP.md](ROADMAP.md), 작업 일지는 [PROGRESS.md](PROGRESS.md))

---

## 1. 한눈에 보기

```
┌──────────────────────────────────────────────────────────────┐
│  WebView (Frontend · React 19 + TS + Vite)                    │
│                                                              │
│  App.tsx ── 레이아웃/부팅 ── zustand store(viewer/github)     │
│    │                              │                          │
│  components/*  renderer/*    sources/*  (ContentSource 추상화) │
│                                   │                          │
│                       @tauri-apps/api `invoke()`             │
└───────────────────────────────────┼──────────────────────────┘
                                    │  IPC (커맨드 호출 / 직렬화)
┌───────────────────────────────────┼──────────────────────────┐
│  Core (Backend · Rust + Tauri 2)  ▼                          │
│                                                              │
│  commands.rs ── provider_for(kind) ── providers/*            │
│    │              (ContentProvider 트레잇)                    │
│    │                  ├─ LocalProvider (std::fs)             │
│    │                  └─ GithubProvider (reqwest → GitHub API)│
│    └─ secrets.rs (AES-256-GCM 토큰 암호화 저장)               │
└──────────────────────────────────────────────────────────────┘
```

- **프론트엔드(WebView)** 와 **백엔드(Rust 코어)** 가 Tauri IPC(`invoke`)로 통신한다.
- 파일시스템·네트워크·자격증명은 **전부 Rust에 격리**된다. WebView는 경로/소스 식별자만 주고받고
  실제 I/O 권한을 갖지 않는다(보안 경계).
- 출처(로컬/GitHub/…)는 **양쪽 모두 동일한 추상화**로 다룬다:
  - TS: [`ContentSource`](../src/sources/types.ts)
  - Rust: [`ContentProvider`](../src-tauri/src/providers/mod.rs)
  - 두 인터페이스의 메서드 시그니처는 의도적으로 대칭이다.

---

## 2. 디렉터리 구조

```
src/                         # 프론트엔드 (React + TS)
  main.tsx                   # 진입점 (ReactDOM 마운트)
  App.tsx                    # 레이아웃 · 부팅 effect · 테마/스크롤/단축키
  sources/                   # 소스 추상화
    types.ts                 #   ContentSource / SourceRef / TreeEntry / FileContent
    localSource.ts           #   로컬 소스(=Rust 커맨드 래퍼) + 파일/폴더 선택
    githubSource.ts          #   GitHub 소스(=Rust 커맨드 래퍼)
    registry.ts              #   sourceFromRef() / sourceKey() (Ref→Source 복원)
  renderer/                  # 렌더링
    profiles.ts              #   교체 가능한 렌더 프로파일(확장 지점)
    MarkdownView.tsx         #   react-markdown 파이프라인(GFM·하이라이트·링크/이미지)
    PlainTextView.tsx        #   비-마크다운 텍스트 뷰
    AsyncImage.tsx           #   상대 이미지 → data URL 해석
  store/
    viewer.ts                #   핵심 상태(문서/이동기록/레이아웃/필터/외부인자)
    github.ts                #   GitHub 계정/등록 저장소 상태
  components/                # FileTree·Explorer·Toc·Toolbar·HistoryBar·ActivityBar·
                             #   RightBar·GithubPanel·Preferences·ExportModal 등
  lib/                       # paths·exporters·filetypes·fonts (순수 유틸)

src-tauri/                   # 백엔드 (Rust + Tauri 2)
  src/main.rs                # 바이너리 진입점 → lib::run()
  src/lib.rs                 # Builder 구성 · 플러그인 · invoke_handler 등록 · macOS 메뉴
  src/commands.rs            # #[tauri::command] 모음(IPC 표면) + provider_for 디스패치
  src/providers/
    mod.rs                   #   ContentProvider 트레잇 + 공용 타입(SourceRef 등)
    local.rs                 #   LocalProvider(경로 탈출 방지 포함)
    github.rs                #   GithubProvider(contents/branches API)
  src/secrets.rs             # 토큰 AES-256-GCM 암호화 저장
  capabilities/default.json  # 창 권한(core/opener/dialog)
  tauri.conf.json            # 제품명/식별자/번들 타겟/창 설정
```

---

## 3. 핵심 추상화

### 3.1 소스 추상화 (ContentSource ↔ ContentProvider)

| 책임 | TS `ContentSource` | Rust `ContentProvider` |
|---|---|---|
| 디렉터리 한 단계 나열 | `listDir(path)` | `list_dir(ctx, path)` |
| 텍스트 파일 읽기 | `readFile(path)` | `read_file(ctx, path)` |
| 에셋(이미지) 읽기 | `resolveAsset(path)` → data URL | `read_asset(ctx, path)` → bytes |
| 브랜치 목록(원격) | `listBranches()` | `list_branches(ctx)` |
| 버전 식별자(갱신 감지) | `latestVersion(path)` | `latest_version(ctx, path)` |

- **식별 컨텍스트** = `SourceRef { kind, root, gitRef }` (TS·Rust 1:1, `serde(rename_all=camelCase)`).
  - `local`: `root`=폴더 절대경로. `github`: `root`="owner/repo", `gitRef`=브랜치/태그/커밋.
- **신규 소스 추가** = ① Rust에 `ContentProvider` 구현 + `commands.rs::provider_for`에 분기 추가
  ② TS에 `ContentSource` 구현 + `registry.ts`에 팩토리 추가. UI는 손대지 않는다.

### 3.2 렌더 프로파일 추상화

- [`renderer/profiles.ts`](../src/renderer/profiles.ts) — "어떤 방식으로 렌더링할지"를 프로파일로 정의,
  툴바에서 선택 전환. 수식(KaTeX)·다이어그램(Mermaid) 등은 새 프로파일을 추가해 확장한다(M2).

### 3.3 보안 경계

- 토큰은 **Rust에만** 존재한다. 로그인 시 토큰을 받아 검증 후 [`secrets.rs`](../src-tauri/src/secrets.rs)가
  AES-256-GCM(키=고정 pepper + OS 사용자명 파생)으로 암호화하여 앱 로컬데이터에 저장.
  이후 GitHub 커맨드는 Rust 내부에서 토큰을 주입하며 **JS로 노출하지 않는다.**
- `LocalProvider::resolve`가 `..`/절대경로 컴포넌트를 거부해 **root 밖 경로 탈출을 차단**한다.

---

## 4. 호출 구조 · 동작 흐름 (#4)

### 4.1 IPC 표면 (Tauri 커맨드)

[`lib.rs`](../src-tauri/src/lib.rs)의 `invoke_handler`에 등록된 커맨드가 곧 프론트↔백엔드 계약이다.

| 커맨드 | 호출처(TS) | 역할 |
|---|---|---|
| `startup_target` | `App.tsx`(부팅) | 외부 인자(argv) 해석 → `{root, file}` (Windows/터미널) |
| `take_opened_targets` | `App.tsx`(부팅) | macOS `Opened` 콜드스타트 버퍼 비우기 → `[{root, file}]` |
| `pick_folder` / `pick_markdown_file` | `localSource.ts` | 네이티브 선택 다이얼로그 |
| `source_list_dir` | `LocalSource/GithubSource.listDir` | 디렉터리 나열 |
| `source_read_file` | `…readFile` | 텍스트 읽기(+version) |
| `source_read_asset` | `…resolveAsset` | 에셋 → data URL |
| `source_latest_version` | `…latestVersion` | 갱신 감지용 버전 |
| `source_list_branches` | `…listBranches` | 원격 브랜치 |
| `write_text_file` | `lib/exporters.ts` | 내보내기 저장 |
| `github_login/status/logout` | `store/github.ts` | PAT 인증 |
| `github_list_repos` / `github_default_branch` | `GithubPanel` | 저장소 목록/기본 브랜치 |

모든 `source_*` 커맨드는 `commands.rs::provider_for(kind)`로 적절한 provider를 만들어 디스패치한다
(`github`면 저장된 토큰 주입).

### 4.2 문서 열기 흐름 (대표 시나리오)

```
사용자 클릭(파일트리/링크/최근)
  → store/viewer.ts: openDoc / openInSource / openRecent / goTo
      → 내부 load(source, path, opts)
          → source.readFile(path)                 [TS]
              → invoke("source_read_file", {source.ref, path})  [IPC]
                  → commands.rs::source_read_file
                      → provider_for(kind).read_file(ctx, path)  [Rust I/O]
                  ← FileContent { path, text, version }
          → set({ markdown, docPath, history…, navSeq++ })   [상태 갱신]
  → App.tsx: docPath/markdown 변화 →
      markdown이면 <MarkdownView>, 아니면 <PlainTextView> 렌더
  → navSeq 변화 effect → 스크롤 복원(저장위치 > 앵커 > 맨 위)
```

- **이동 기록**: `load()`가 `history`/`historyIndex`를 관리. 새 이동은 push(앞쪽 기록은 분기 시 잘림),
  뒤로/앞으로(`goTo`)는 push 없이 인덱스 이동하며 저장된 스크롤 위치를 복원.
- **앵커 이동**: 같은 파일 내 `#앵커`는 재로딩 없이 `pendingHash`만 갱신(`navigateAnchor`).
  다른 파일의 `path#frag` 링크는 `onNavigateDoc(path, frag)` → `openDoc`.
- **상대 이미지**: `MarkdownView`→`AsyncImage`가 `resolveAsset`로 data URL을 받아 표시.
- **갱신 감지(원격)**: 문서 열 때 blob `sha`를 `currentVersion`에 저장 → 창 포커스 시
  `checkForUpdate`가 `latestVersion`과 비교 → 다르면 `updateAvailable` 배지 → 새로고침은 `reload(force)`.

### 4.3 부팅 흐름

```
main.tsx → <App/>
  App 마운트 effect:
    ① 테마 적용(data-theme)
    ② 외부 인자로 열기 대상 수집 → openExternalTarget(root, file)
       · startup_target(argv)        … Windows/터미널
       · take_opened_targets()       … macOS Opened 콜드스타트 버퍼(drain)
       · listen("open-targets")      … macOS 실행 중 추가 열기 구독
       (file 지정→상위 폴더 등록·펼침+openInSource / 폴더→등록·펼침+openSource)
    ③ 창 포커스 리스너 등록(원격 갱신 확인)
  외부 인자가 없으면 Welcome 화면(최근 문서) 표시.
```

> **외부 인자 처리** — 두 경로로 동작한다.
> - **Windows/터미널**: 프로세스 `argv` → `startup_target` (`Viewer.exe "C:\docs\guide.md"`).
> - **macOS**: Finder 더블클릭/"다음으로 열기"/Dock 드래그는 argv가 아니라 Apple `Opened`
>   이벤트로 전달된다. `lib.rs`가 `.build().run(|app, e| …)`에서 `RunEvent::Opened`를 받아
>   ① 콜드스타트분은 `PendingOpen` 버퍼에 쌓고(마운트 시 `take_opened_targets`로 drain)
>   ② 실행 중에는 `open-targets` 이벤트로 emit → 프론트가 구독해 즉시 연다.
>   파일 연결은 `tauri.conf.json`의 `bundle.fileAssociations`(→ Info.plist `CFBundleDocumentTypes`).
> - 향후: Windows/macOS **single-instance**로 2번째 실행을 기존 창으로 합치기 — ROADMAP 참고.

### 4.4 상태 영속화 (localStorage)

| 키 | 내용 |
|---|---|
| `viewer.prefs.v1` | 테마·프로파일·최근문서·레이아웃 너비/표시·필터·글꼴 |
| `workspaces.v1` | 탐색기 등록 소스(로컬 폴더 + GitHub 저장소) 목록 |
| `expanded.v1` / `hidden.v1` | 탐색기 루트 펼침/숨김 상태 |

> 자격증명(GitHub 토큰)은 localStorage가 **아니라** Rust가 암호화 파일로 보관한다(§3.3).

---

## 5. 빌드 · 배포 파이프라인 (요약)

- 개발: `pnpm tauri dev` (Vite devUrl + Rust 디버그 빌드).
- 배포 빌드: `pnpm tauri build` → `src-tauri/target/release/bundle/`.
- CI: `v*` 태그 push → GitHub Actions가 3-OS 빌드 → Release 자동 게시 →
  `release: published`로 chocolatey/winget 워크플로 트리거. (Homebrew Tap은 수동 갱신)
- 자세한 배포 채널 현황은 [PROGRESS.md](PROGRESS.md), 포터블 빌드는 [PORTABLE.md](PORTABLE.md) 참고.
