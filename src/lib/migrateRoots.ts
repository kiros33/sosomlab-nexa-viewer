/**
 * 로컬 폴더 접근 허용 목록 이전(1회).
 *
 * 백엔드는 사용자가 직접 연 폴더만 읽는다(src-tauri/src/access.rs). 이전 버전(≤0.3.4)에서
 * 등록한 탐색기 폴더·최근 문서 폴더는 localStorage에만 있으므로, 앱 첫 렌더 전에 한 번 넘긴다.
 * 백엔드는 허용 목록 파일이 아직 없을 때만 받아들이고, 그 뒤 호출은 무시한다.
 */
import { invoke } from "@tauri-apps/api/core";
import type { SourceRef } from "../sources/types";

function localRoots(): string[] {
  const roots = new Set<string>();
  const add = (ref: SourceRef | undefined) => {
    if (ref?.kind === "local" && ref.root) roots.add(ref.root);
  };
  try {
    const ws = JSON.parse(localStorage.getItem("workspaces.v1") ?? "[]") as SourceRef[];
    ws.forEach(add);
  } catch {
    /* ignore */
  }
  try {
    const prefs = JSON.parse(localStorage.getItem("viewer.prefs.v1") ?? "{}") as {
      recent?: { ref?: SourceRef }[];
    };
    prefs.recent?.forEach((r) => add(r.ref));
  } catch {
    /* ignore */
  }
  return [...roots];
}

export async function migrateLocalRoots(): Promise<void> {
  try {
    await invoke<boolean>("migrate_local_roots", { roots: localRoots() });
  } catch {
    /* 백엔드 미지원/실패 — 폴더를 다시 열면 허용된다 */
  }
}
