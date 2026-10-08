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

/**
 * 퍼센트 인코딩 해제(잘못된 인코딩이면 원문 유지).
 * 렌더러(mdast-util-to-hast)가 href/src를 인코딩하므로 `가이드.md` → `%EA%B0%80…`로 온다.
 */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * 현재 문서(docPath) 기준 참조 `ref`를 root 기준 경로로 해석.
 * - 퍼센트 인코딩 해제(한글·공백 파일명)
 * - `?쿼리`·`#앵커` 제거(예: `img.png?raw=true`)
 * - `/`로 시작하면 저장소(root) 기준 — GitHub과 같은 해석
 */
export function resolveRelative(docPath: string, ref: string): string {
  const path = safeDecode(ref.split(/[?#]/)[0]);
  if (path.startsWith("/")) return normalizePath(path);
  const cleaned = path.replace(/^\.\//, "");
  const dir = dirname(docPath);
  return normalizePath(dir ? `${dir}/${cleaned}` : cleaned);
}

/** http(s)/data/mailto 등 외부(절대) 링크 여부. */
export function isExternalUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}
