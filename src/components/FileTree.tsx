/** 파일 트리 — 폴더는 지연 확장, 마크다운 파일 클릭 시 열람. 다중 루트 지원. */
import { useEffect, useState } from "react";

import type { ContentSource, TreeEntry } from "../sources/types";
import { useViewer } from "../store/viewer";
import { sourceKey } from "../sources/registry";

const MD_RE = /\.(md|markdown|mdx|txt)$/i;
const isMarkdown = (name: string) => MD_RE.test(name);

function TreeNode({
  entry,
  source,
  depth,
}: {
  entry: TreeEntry;
  source: ContentSource;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const openInSource = useViewer((s) => s.openInSource);
  const activeSource = useViewer((s) => s.source);
  const currentPath = useViewer((s) => s.docPath);

  const onClick = async () => {
    if (entry.isDir) {
      if (!open && children === null) {
        setLoading(true);
        try {
          setChildren(await source.listDir(entry.path));
        } catch {
          setChildren([]);
        } finally {
          setLoading(false);
        }
      }
      setOpen(!open);
    } else if (isMarkdown(entry.name)) {
      void openInSource(source, entry.path);
    }
  };

  const isActiveSource =
    activeSource != null && sourceKey(activeSource.ref) === sourceKey(source.ref);
  const selected = !entry.isDir && isActiveSource && currentPath === entry.path;
  const dimmed = !entry.isDir && !isMarkdown(entry.name);

  return (
    <div className="tree-node">
      <button
        className={`tree-row${selected ? " selected" : ""}${dimmed ? " dimmed" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={onClick}
        title={entry.name}
      >
        <span className="tree-icon">
          {entry.isDir ? (open ? "▾" : "▸") : isMarkdown(entry.name) ? "📄" : "·"}
        </span>
        <span className="tree-name">{entry.name}</span>
      </button>
      {open && (
        <div>
          {loading && (
            <div className="tree-loading" style={{ paddingLeft: `${22 + depth * 14}px` }}>
              …
            </div>
          )}
          {children?.map((c) => (
            <TreeNode key={c.path} entry={c} source={source} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 단일 소스의 트리(루트 항목들). */
export function FileTree({ source }: { source: ContentSource }) {
  const [roots, setRoots] = useState<TreeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setRoots(null);
    setError(null);
    source
      .listDir("")
      .then((r) => active && setRoots(r))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [source]);

  if (error) return <div className="tree-error">{error}</div>;
  if (!roots) return <div className="tree-loading">불러오는 중…</div>;

  return (
    <div className="file-tree">
      {roots.map((entry) => (
        <TreeNode key={entry.path} entry={entry} source={source} depth={0} />
      ))}
    </div>
  );
}
