/** 로컬 파일 시스템 소스 — Rust 커맨드를 감싼다. */
import { invoke } from "@tauri-apps/api/core";
import type { ContentSource, FileContent, SourceRef, TreeEntry } from "./types";

export class LocalSource implements ContentSource {
  readonly kind = "local" as const;
  readonly ref: SourceRef;
  readonly label: string;

  constructor(rootAbsPath: string) {
    this.ref = { kind: "local", root: rootAbsPath, gitRef: null };
    // 경로 마지막 세그먼트를 라벨로
    const seg = rootAbsPath.replace(/[\\/]+$/, "").split(/[\\/]/);
    this.label = seg[seg.length - 1] || rootAbsPath;
  }

  listDir(path: string): Promise<TreeEntry[]> {
    return invoke<TreeEntry[]>("source_list_dir", { source: this.ref, path });
  }

  readFile(path: string): Promise<FileContent> {
    return invoke<FileContent>("source_read_file", { source: this.ref, path });
  }

  resolveAsset(path: string): Promise<string> {
    return invoke<string>("source_read_asset", { source: this.ref, path });
  }

  async listBranches(): Promise<string[]> {
    return [];
  }
}

/** 폴더 선택 다이얼로그 → LocalSource. 취소 시 null. */
export async function pickLocalFolder(): Promise<LocalSource | null> {
  const dir = await invoke<string | null>("pick_folder");
  return dir ? new LocalSource(dir) : null;
}

/** 단일 .md 파일 선택 → { source, filePath(상대) }. 취소 시 null. */
export async function pickLocalMarkdownFile(): Promise<{
  source: LocalSource;
  filePath: string;
} | null> {
  const abs = await invoke<string | null>("pick_markdown_file");
  if (!abs) return null;
  const norm = abs.replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/");
  const dir = idx >= 0 ? norm.slice(0, idx) : norm;
  const file = idx >= 0 ? norm.slice(idx + 1) : norm;
  return { source: new LocalSource(dir), filePath: file };
}
