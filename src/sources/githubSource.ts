/** GitHub 원격 소스 — Rust 커맨드를 감싼다(토큰은 Rust에 보관). */
import { invoke } from "@tauri-apps/api/core";
import type { ContentSource, FileContent, SourceRef, TreeEntry } from "./types";

export class GithubSource implements ContentSource {
  readonly kind = "github" as const;
  readonly ref: SourceRef;
  readonly label: string;

  /** owner/repo, 선택적 branch */
  constructor(ownerRepo: string, branch?: string | null) {
    this.ref = { kind: "github", root: ownerRepo, gitRef: branch ?? null };
    this.label = branch ? `${ownerRepo}@${branch}` : ownerRepo;
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

  listBranches(): Promise<string[]> {
    return invoke<string[]>("source_list_branches", { source: this.ref });
  }

  latestVersion(path: string): Promise<string | null> {
    return invoke<string | null>("source_latest_version", { source: this.ref, path });
  }
}

// ===== 인증/유틸 (Rust 커맨드 래핑) =====

/** PAT 로그인 → 로그인명 반환(검증·암호화 저장은 Rust). */
export function githubLogin(token: string): Promise<string> {
  return invoke<string>("github_login", { token });
}

export function githubStatus(): Promise<string | null> {
  return invoke<string | null>("github_status");
}

export function githubLogout(): Promise<void> {
  return invoke<void>("github_logout");
}

export function githubDefaultBranch(ownerRepo: string): Promise<string> {
  return invoke<string>("github_default_branch", { ownerRepo });
}
