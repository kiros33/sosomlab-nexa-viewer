# FAQ

## 실행 시 "확인되지 않은 개발자"/SmartScreen 경고가 떠요
코드 서명 전이라 정상입니다. macOS는 앱 우클릭→열기(또는 `xattr -dr com.apple.quarantine`),
Windows는 "추가 정보 → 실행". 자세히 → [설치](Installation).

## 공개 저장소도 로그인해야 하나요?
아니요. 공개 저장소는 로그인 없이 `owner/repo`로 바로 추가/열람됩니다. 비공개 저장소나
요청 한도 상향이 필요할 때만 PAT 로그인하세요. → [GitHub 연동](GitHub-Integration)

## 폴더 안의 파일이 안 보여요
기본 표시가 "마크다운만"입니다. 전체 파일을 보려면 **⚙️ 환경설정 → 보여질 파일 → 전체**(전역),
또는 탐색기에서 **우클릭 → 파일 보기**(저장소별). 폴더 자체는 항상 표시됩니다.

## 비마크다운 파일(.txt/.json/.css)은 어떻게 열리나요?
고정 글꼴의 일반텍스트 뷰어로 열립니다. `Ctrl/⌘ +/-` 로 크기 조절. → [문서 보기](Viewing-Documents)

## 온라인에서 바뀐 GitHub 문서를 어떻게 갱신하나요?
창에 다시 포커스하면 변경을 감지해 상단에 "🔄 갱신 가능"이 표시됩니다. 클릭 시 최신으로 갱신.
> 예정: 설정에서 **미사용 / 변경 알림 / 자동 갱신(현재 위치 유지)** 모드와 로컬 파일 변경 감지를
> 지원할 계획입니다(로드맵 [AUTO-REFRESH.md](https://github.com/kiros33/sosomlab-nexa-viewer/blob/main/docs/AUTO-REFRESH.md)).

## 문서 안에서 검색이 되나요?
아직 지원하지 않습니다(로드맵 예정). 단어 단위 검색 + 정규식부터 저장소 전체 검색까지 단계적으로
추가할 계획입니다 — 설계 [SEARCH.md](https://github.com/kiros33/sosomlab-nexa-viewer/blob/main/docs/SEARCH.md).

## 파일을 더블클릭해서 이 앱으로 바로 열 수 있나요?
네. **Windows**는 파일을 앱에 끌어다 놓거나 "연결 프로그램"으로, 명령줄 `Viewer.exe "문서.md"`로
바로 열립니다. **macOS**는 Finder에서 `.md` 파일 **우클릭 → 다음으로 열기 → Nexa Markdown Viewer**,
또는 Dock 아이콘에 드래그하면 열립니다(앱 실행 중이면 그 창에서 바로 열림). 폴더를 열면 탐색기에
등록·펼쳐집니다.

## 토큰은 안전하게 저장되나요?
네. PAT는 Rust 측에서 AES-256-GCM으로 **암호화되어 로컬 저장**되며, 프론트엔드로 노출되지 않고,
통신은 HTTPS만 사용합니다.

---

## 📷 위키에 스크린샷 추가하는 법
이 위키 문서들에는 `images/…png` 형태의 스크린샷 자리가 표시되어 있습니다. 실제 캡처를 추가하려면:

1. 앱에서 해당 기능 화면을 캡처(예: macOS `⌘⇧4`, Windows `Win+Shift+S`).
2. 위키 저장소를 클론: `git clone https://github.com/kiros33/sosomlab-nexa-viewer.wiki.git`
3. 캡처 파일을 `images/` 폴더에 문서에 적힌 파일명으로 저장.
4. 커밋 후 push → 해당 위치에 이미지가 표시됩니다.

> 참고: 앱 실행 환경/권한 제약으로 자동 캡처는 제공되지 않아, 스크린샷은 위 방법으로 직접 추가합니다.
