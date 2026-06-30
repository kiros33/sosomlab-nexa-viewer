# 포터블 버전 설계 (Portable Build Design)

설치 없이 **단일 폴더(또는 단일 exe)** 로 실행하고, 설정·자격증명·캐시를 **앱 옆에 보관**하여
USB·네트워크 드라이브에서 흔적 없이 쓰는 "포터블" 빌드를 만들기 위한 설계 문서.
(대상 1순위: **Windows**. macOS `.app`은 그 자체가 이동 가능하나 데이터는 `~/Library`에 남는다 — §6.)

> 상태: **설계(미구현)**. 본 문서의 코드는 적용 가이드이며 실제 반영 시 [PROGRESS.md](PROGRESS.md)에 기록한다.
> 전체 구조는 [ARCHITECTURE.md](ARCHITECTURE.md) 참고.

---

## 1. 목표 / 비목표

- **목표**
  - 설치 관리자(NSIS/MSI) 없이 압축만 풀면 실행되는 배포본.
  - 설정/토큰/WebView 데이터가 **앱 폴더 내부**(`./data`)에 저장 → 시스템 사용자 프로필 미오염.
  - 일반 설치본과 **동일한 바이너리**에서 "포터블 모드"만 분기(이중 빌드 회피).
- **비목표**
  - WebView2 런타임 자체의 완전 무설치(에버그린 런타임 의존은 §4에서 별도 논의).
  - 코드 서명 변경(서명은 설치본과 동일하게 적용).

---

## 2. 포터블 모드 판별 (marker)

설치본/포터블본을 같은 exe로 처리하기 위해 **마커 파일**로 모드를 결정한다.

```
NexaMarkdownViewer-portable/
  NexaMarkdownViewer.exe
  portable.txt          ← 이 파일이 있으면 포터블 모드
  data/                 ← (자동 생성) 설정·토큰·WebView 프로필
```

- 규칙: **exe와 같은 디렉터리에 `portable.txt`(내용 무관)가 존재**하면 포터블 모드.
- 환경변수 `NEXA_PORTABLE=1`로도 강제 가능(개발/테스트용).

---

## 3. 데이터 경로 분기 (Rust)

현재 자격증명·설정은 `app_local_data_dir()`(= `%APPDATA%\com.sosomlab.nexa-markdown-viewer`)에 저장된다
([commands.rs](../src-tauri/src/commands.rs)의 `data_dir`, [secrets.rs](../src-tauri/src/secrets.rs)).
포터블 모드면 이를 **`<exe_dir>/data`** 로 바꾼다.

```rust
// commands.rs (또는 별도 portable.rs)
use std::path::PathBuf;

/// 포터블 모드면 exe 옆 `data/`, 아니면 OS 표준 앱 로컬데이터 디렉터리.
pub fn app_base_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(dir) = portable_data_dir() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        return Ok(dir);
    }
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// exe 옆에 `portable.txt`가 있으면 `<exe_dir>/data` 반환.
fn portable_data_dir() -> Option<PathBuf> {
    let forced = std::env::var("NEXA_PORTABLE").map(|v| v == "1").unwrap_or(false);
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    if forced || exe_dir.join("portable.txt").exists() {
        Some(exe_dir.join("data"))
    } else {
        None
    }
}
```

- 적용 지점: `commands.rs::data_dir`를 위 `app_base_dir`로 교체(시그니처 동일하게 유지).
  `secrets.rs`는 이미 `dir: &Path`를 인자로 받으므로 **수정 불필요**(호출부만 새 경로 전달).

---

## 4. WebView 데이터(localStorage) 경로

레이아웃/테마/최근문서/워크스페이스는 **localStorage**에 저장된다([ARCHITECTURE.md §4.4](ARCHITECTURE.md)).
Windows WebView2는 기본적으로 이를 `%LOCALAPPDATA%\…\EBWebView`에 둔다 → 포터블이 되려면 옆으로 옮겨야 한다.

- **방법**: WebView2의 사용자 데이터 폴더(UDF)를 `<exe_dir>/data/webview`로 지정.
  - 가장 단순한 방법은 **앱 부팅 전 환경변수** `WEBVIEW2_USER_DATA_FOLDER`를 설정하는 것:
    ```rust
    // main.rs — run() 호출 전
    fn main() {
        #[cfg(target_os = "windows")]
        if let Some(dir) = /* portable_data_dir() */ None::<std::path::PathBuf> {
            std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", dir.join("webview"));
        }
        tauri_scaffold_lib::run()
    }
    ```
  - 또는 `tauri.conf.json`의 `app.windows[].additionalBrowserArgs` /
    Tauri의 WebView 옵션으로 UDF를 지정(버전별 API 확인 필요).
- **주의**: UDF는 WebView 생성 **이전**에 정해져야 한다. 따라서 §3와 동일한 `portable_data_dir()`
  판별을 `main()` 최상단(플러그인 초기화 전)에서 수행한다.

---

## 5. 빌드 산출물 만들기

Tauri 번들 타겟에는 "portable"이 없다. 두 가지 실용 경로:

1. **Raw exe + 동봉(권장, 간단)**
   - `pnpm tauri build` 후 `src-tauri/target/release/NexaMarkdownViewer.exe`를 사용.
   - 배포 폴더 구성: `exe` + `portable.txt`(빈 파일) → zip 압축
     (`NexaMarkdownViewer_<버전>_x64-portable.zip`).
   - 사용자: 압축 해제 → exe 실행. 데이터는 `./data`에 생성.
   - CI: 기존 [release.yml](../.github/workflows/release.yml) windows 잡에 "exe+portable.txt zip"
     스텝을 추가하고 zip을 Release 자산으로 업로드.

2. **NSIS 포터블 옵션**
   - Tauri NSIS는 표준 포터블 모드를 제공하지 않음 → 1안이 단순/안정적.

> WebView2 런타임: 포터블이라도 대상 PC에 **WebView2 Runtime**(Win10/11 다수 기본 내장)이 필요.
> 완전 무설치를 원하면 **Fixed Version WebView2 Runtime**을 동봉하고 UDF와 함께 경로를 지정하는
> 방식이 있으나 용량(수십 MB)이 커진다 — 1차 포터블에서는 에버그린 런타임 의존을 권장.

---

## 6. 플랫폼 메모

- **Windows**: 본 설계의 1순위. `portable.txt` + `./data` + WebView2 UDF로 완결.
- **macOS**: `.app` 번들은 그 자체로 이동 가능하지만 데이터는 `~/Library/Application Support`,
  WebKit 저장소도 시스템 영역. 진정한 포터블은 어려움 → "이동 가능한 앱" 수준으로 한정.
- **Linux**: AppImage가 사실상 포터블 실행 파일. 데이터 경로 분기(§3)만 적용하면 `./data` 사용 가능.

---

## 7. 적용 체크리스트

- [ ] `portable_data_dir()` 추가(`current_exe` 기준 `portable.txt`/`NEXA_PORTABLE` 판별).
- [ ] `commands.rs::data_dir` → `app_base_dir`로 교체(포터블 시 `<exe>/data`).
- [ ] `main.rs`에서 포터블 시 `WEBVIEW2_USER_DATA_FOLDER` 설정(WebView 생성 전).
- [ ] CI: windows 잡에 `exe + portable.txt` zip 산출 + Release 업로드.
- [ ] 문서: README 다운로드 섹션에 "포터블(zip)" 안내 추가, 위키 Installation 반영.
- [ ] 검증: zip 해제 → 다른 사용자 계정/USB에서 실행 → `./data`에 설정/토큰 생성 확인,
      설치본과 데이터가 섞이지 않음 확인.

---

## 8. 외부 인자 연동(이미 구현됨)

포터블 사용자는 보통 `NexaMarkdownViewer.exe "문서.md"` 형태나 "연결 프로그램"으로 실행한다.
이 **외부 인자 → 즉시 열기**는 이미 구현되어 있다(`startup_target` 커맨드, [ARCHITECTURE.md §4.3](ARCHITECTURE.md)).
포터블 배포 시 `.md` 확장자 연결을 안내하면 더블클릭으로 바로 열람 가능.

> 확장(설계): 실행 중인 인스턴스에 새 파일 전달(single-instance 플러그인), macOS `Opened` 이벤트 처리.
