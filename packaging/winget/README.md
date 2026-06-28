# winget 등록

winget은 중앙 저장소 [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs)에
매니페스트 PR을 보내 등록합니다. (Microsoft 자동 검증 + 일부 수동 검수)

## 사전 준비 (1회)
- GitHub **classic PAT**(`public_repo` 범위) 발급 → 저장소 Secret `WINGET_TOKEN` 등록.
  - winget은 별도 API 키가 없습니다. fork→push→PR 흐름이라 GitHub 토큰이 필요합니다.

## 최초 1회 — 첫 버전 수동 제출
`vedantmgoyal9/winget-releaser`(자동화)는 **이미 등록된 패키지의 새 버전**만 올립니다.
따라서 첫 버전(0.2.1)은 아래 매니페스트로 한 번 수동 제출해야 합니다.

`0.2.1/` 폴더의 3개 파일:
- `SosomLab.NexaMarkdownViewer.yaml` (version)
- `SosomLab.NexaMarkdownViewer.installer.yaml` (installer)
- `SosomLab.NexaMarkdownViewer.locale.en-US.yaml` (defaultLocale)

제출 방법(택1):
- **komac**(권장, 크로스플랫폼): `komac submit` 으로 PR 생성
- **wingetcreate**(Windows): `wingetcreate submit .\0.2.1`
- **수동**: winget-pkgs를 fork 후
  `manifests/s/SosomLab/NexaMarkdownViewer/0.2.1/` 에 3개 파일을 넣고 PR

제출 전 검증: `winget validate .\0.2.1` (Windows) 또는 komac의 검증 기능.

## 이후 버전 — 자동
`.github/workflows/winget.yml` 가 릴리스 publish 시 자동으로 버전 PR을 생성합니다.
(`WINGET_TOKEN` 필요)

## 참고
- 설치파일은 Tauri NSIS → `InstallerType: nullsoft`, 무인설치 자동 인식.
- 미서명이라 SmartScreen 경고는 남지만 설치/검증에는 지장 없습니다.
- Chocolatey처럼 게시된 버전 삭제는 어렵습니다 → 문제 시 상위 버전으로 roll-forward.
