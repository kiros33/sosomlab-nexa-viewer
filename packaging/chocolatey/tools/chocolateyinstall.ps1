$ErrorActionPreference = 'Stop'

# __URL64__ / __CHECKSUM64__ 는 CI(.github/workflows/chocolatey.yml)에서
# 해당 릴리스의 실제 다운로드 URL과 SHA256 값으로 치환됩니다.
$packageName = 'nexa-markdown-viewer'
$url64       = '__URL64__'
$checksum64  = '__CHECKSUM64__'

$packageArgs = @{
  packageName    = $packageName
  fileType       = 'exe'
  url64bit       = $url64
  checksum64     = $checksum64
  checksumType64 = 'sha256'
  # Tauri NSIS 인스톨러: 무인 설치 = /S
  silentArgs     = '/S'
  validExitCodes = @(0)
}

Install-ChocolateyPackage @packageArgs
