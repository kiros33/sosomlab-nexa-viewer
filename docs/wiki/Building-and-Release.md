# 빌드·배포

## 개발 환경
- Node.js + pnpm, Rust(rustup), [Tauri 사전 준비물](https://tauri.app/start/prerequisites/)
- 새 터미널에서 cargo가 안 잡히면: `source "$HOME/.cargo/env"`

```bash
pnpm install
pnpm tauri dev      # 개발 실행
pnpm build          # 프론트엔드 타입체크/빌드(tsc + vite)
```

## 로컬 배포 빌드
```bash
pnpm tauri build
```
산출물: `src-tauri/target/release/bundle/`

| OS | 산출물 |
|----|--------|
| macOS | `.dmg`, `.app` (유니버설: `--target universal-apple-darwin`) |
| Windows | `.msi`, `*-setup.exe`(NSIS) |
| Linux | `.deb`, `.rpm`, `.AppImage` |

> macOS에서 DMG 단계는 Finder 자동화가 필요해 GUI 세션에서 실행해야 합니다.
> 헤드리스/CI가 아닌 본인 터미널에서 실행하세요. (`--bundles app` 으로 앱만 빌드도 가능)

## CI 자동 배포 (GitHub Actions)
`v*` 태그를 push하면 macOS·Linux·Windows 3-OS에서 빌드 후 **Release(초안)** 에 자동 업로드됩니다.

```bash
# 1) 버전 올리기: tauri.conf.json + package.json (+ Cargo.toml)
# 2) CHANGELOG.md 의 [Unreleased] → [버전] 으로 확정
# 3) 태그 push
git tag v0.2.0
git push origin v0.2.0
# 4) Actions 완료 후 Releases에서 검토 → Publish
```

- 워크플로: `.github/workflows/release.yml` (`tauri-apps/tauri-action`)
- pnpm 버전은 `package.json`의 `packageManager` 필드를 따릅니다.

## 패키지 매니저 등록(로드맵)
WinGet / Chocolatey / Homebrew 등록은 코드 서명·체크섬 자동화가 선행되면 진행합니다.
자세한 계획은 저장소의 [docs/ROADMAP.md](https://github.com/kiros33/sosomlab-nexa-viewer/blob/main/docs/ROADMAP.md) 참고.
