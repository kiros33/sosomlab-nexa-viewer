/** posix 스타일 경로 유틸. */

/** `.`/`..` 정리 후 슬래시 경로로 정규화. */
export function normalizePath(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

/** 부모 디렉터리 경로(없으면 ""). */
export function dirname(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i >= 0 ? norm.slice(0, i) : "";
}

/** 현재 문서(docPath) 기준 상대 참조 `ref`를 root 기준 경로로 해석. */
export function resolveRelative(docPath: string, ref: string): string {
  const cleaned = ref.replace(/^\.\//, "");
  const dir = dirname(docPath);
  return normalizePath(dir ? `${dir}/${cleaned}` : cleaned);
}

/** http(s)/data/mailto 등 외부(절대) 링크 여부. */
export function isExternalUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}
