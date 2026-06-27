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
