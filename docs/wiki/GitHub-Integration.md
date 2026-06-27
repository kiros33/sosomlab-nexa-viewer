# GitHub 연동

좌측 액티비티 바의 **GitHub(옥토캣)** 아이콘으로 패널을 엽니다. 패널은 3구역으로 구성됩니다.

> 📷 _스크린샷: GitHub 패널 전체(등록/직접등록/내 저장소)_ — `images/github-panel.png`

## 1) 등록된 저장소
- 현재 탐색기에 추가된 GitHub 저장소 목록입니다.
- 각 항목 **⋯** 메뉴: **탐색기에서 표시/숨김**, **삭제**.
- 이름이 길어도 잘리지 않고 전부 표시되며, 그 아래에 "내 저장소" 영역이 옵니다.

## 2) 직접 등록
- `owner/repo` 형식 입력 후 **+** (GitHub URL 붙여넣기도 인식).
- **공개 저장소는 로그인 없이** 바로 추가/열람됩니다.

## 3) 내 저장소 (로그인 시)
- **미로그인**: PAT 입력란 + **로그인** 아이콘 버튼
- **로그인됨**: 계정 정보 + **로그아웃** 아이콘 버튼
- 계정이 접근 가능한 저장소 목록이 표시되며 **실시간 검색** 가능.
  - 미등록 항목은 **+**(추가), 등록된 항목은 **−**(등록 해제) 버튼.
- 목록은 창 높이에 맞춰 채워지고 내부 스크롤됩니다.

> 📷 _스크린샷: PAT 로그인 후 내 저장소 목록 + 검색_ — `images/github-myrepos.png`

## Personal Access Token(PAT) 발급
비공개 저장소나 요청 한도 상향이 필요할 때만 사용합니다. **읽기 전용**이면 충분합니다.

**Fine-grained 토큰(권장)**
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate
2. **Repository access**: 대상 저장소(또는 All)
3. **Permissions → Repository → Contents: Read-only**
4. 생성된 `github_pat_…` 복사 → 앱 PAT 입력란에 붙여넣기 → 로그인

**Classic 토큰**: scope `repo` 체크 → `ghp_…` 복사.

> 🔒 토큰은 **Rust 측에 AES-256-GCM으로 암호화 저장**되며 프론트엔드(JS)로 노출되지 않습니다.
> 외부 통신은 HTTPS(`api.github.com`)만 사용합니다.

## 온라인 갱신 감지
- 문서를 열 때 GitHub blob `sha`를 기억합니다.
- **창에 다시 포커스**하면 최신 sha와 비교 → 변경 시 상단에 **🔄 갱신 가능** 배지 표시.
- 배지/새로고침 버튼 클릭 시 최신 내용으로 다시 불러옵니다.

> 📷 _스크린샷: "갱신 가능" 배지_ — `images/github-update.png`

## 요청 한도
- 미인증(공개): 시간당 60회 · 인증(PAT): 시간당 5,000회.
