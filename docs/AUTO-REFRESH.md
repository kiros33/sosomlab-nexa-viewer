# 파일 변경 갱신 설계 (Auto Refresh)

문서가 외부에서 바뀌었을 때의 갱신 방식을 **설정으로 선택**할 수 있게 한다.

세 가지 모드
- **미사용(manual)**: 자동 표시 없음. 사용자가 직접 **갱신 버튼**을 눌러야 다시 읽는다.
- **변경 알림(notify)**: 변경을 감지하면 **갱신 버튼에/옆에 "변경됨" 텍스트(배지)** 를 표시. 갱신은 수동.
- **자동(auto)**: 변경을 감지하면 **알아서 다시 읽는다.** 이때 **현재 보던 위치를 최대한 유지**한다.

---

## 현재 상태(기반)
- **GitHub**: 창 포커스 시 blob `sha` 비교로 변경 감지 → "🔄 갱신 가능" 배지 + 수동 갱신 버튼
  (`checkForUpdate`, `source_latest_version`). → notify 모드의 토대가 이미 존재.
- **로컬**: 변경 감지 **없음**. (R2에서 추가)
- **위치 복원**: 이동 시 스크롤 위치 복원 로직 존재(`navSeq` 기반). → auto 모드 위치 유지에 재사용.

## 설정 모델
```ts
// store/viewer.ts 확장
type RefreshMode = 'manual' | 'notify' | 'auto';
refreshMode: RefreshMode;              // 전역 기본값: 'notify'(현재 동작에 가장 근접)
// (R4) refreshOverrides: Record<sourceKey, RefreshMode>  // 저장소별 override
// (R4) pollIntervalSec?: number                          // 주기 폴링(선택)
```
- Preferences 모달에 라디오 3개(미사용 / 변경 알림 / 자동) + 설명 문구. 영속화(localStorage).

---

## 단계별 구현 대상

### R1 — 갱신 모드 설정 + 알림(notify) 정비 — *최우선*
- [ ] store에 `refreshMode` 추가(기본 `notify`), Preferences 모달에 라디오 UI + 영속화
- [ ] **manual**: 변경 배지/텍스트 숨김, 수동 갱신 버튼만 노출
- [ ] **notify**: 변경 감지 시 갱신 버튼에/옆에 **"변경됨"** 상태 텍스트 표시
      (기존 "🔄 갱신 가능"을 모드에 맞춰 통합·명확화)
- [ ] 갱신 버튼 상태 컴포넌트 정리(정상 / 변경됨 / 갱신 중)

### R2 — 로컬 파일 변경 감지
- [ ] **버전 개념 일반화**: `ContentProvider`의 "버전"을 소스별로 — 로컬은 `mtime`(+size),
      GitHub은 blob `sha`. `checkForUpdate`가 로컬도 처리하도록 확장.
- [ ] 감지 방식(둘 중 택1, 권장 A):
      - **A. 파일 워처(notify 크레이트)**: 열린 문서/워크스페이스 폴더를 watch →
        변경 시 `emit("source-changed", { sourceKey, path })`. 디바운스 적용.
      - **B. 폴링**: 창 포커스 + 주기적으로 `file_version`(mtime) 비교(가벼움, 즉시성 낮음).
- [ ] 감지 범위는 **열린 워크스페이스로 한정**(성능/보안), 바이너리·대용량 가드.

### R3 — 자동 갱신 + 현재 위치 유지 — *핵심 난도*
- [ ] **auto** 모드: 변경 이벤트 수신 시 현재 문서를 자동 reload(재요청 → 본문 갱신)
- [ ] **위치 유지** 전략(순서대로 폴백):
      1. reload 직전 **화면 최상단에 보이는 heading id** + 그 heading으로부터의 오프셋 저장 →
         reload 후 같은 heading 기준으로 복원(문서 길이가 바뀌어도 안정적)
      2. heading이 없으면 **스크롤 비율**(scrollTop / scrollHeight) 저장·복원
      3. 기존 `navSeq` 스크롤 복원 메커니즘 재사용
- [ ] **디바운스/중복 방지**: 저장 연타 시 마지막 1회만 reload, reload 중 재진입 차단
- [ ] (선택) 자동 갱신 시 짧은 표시("자동 갱신됨") — 과도하지 않게

### R4 — 고도화/세분화
- [ ] **주기 폴링 간격** 설정(특히 GitHub — 레이트리밋 고려), 창 백그라운드 시 일시정지
- [ ] **저장소별 override**(`refreshOverrides`) — 기존 `filterOverrides` 패턴 재사용
- [ ] **트리 변경 감지**(파일 추가/삭제를 탐색기에 반영)
- [ ] 예외 처리: 열린 파일이 삭제/이동된 경우 안내

---

## 권장 진행 순서
1. **R1**(설정 + manual/notify) — 기존 GitHub 감지 위에 모드 개념만 얹으면 바로 사용 가능 →
2. **R2**(로컬 변경 감지) →
3. **R3**(자동 갱신 + 위치 유지) →
4. **R4**(폴링/override/트리 동기화)

비고: GitHub는 R1만으로 notify가 거의 완성되고, 로컬 자동 갱신은 R2→R3가 필요하다.
auto 모드의 체감 품질은 **R3의 위치 유지**가 좌우하므로 heading 기준 복원을 우선 구현한다.
