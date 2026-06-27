/** 파일 트리 — 폴더는 지연 확장(펼침만), 파일 클릭 시 열람. 다중 루트 지원. */
import { useEffect, useState } from "react";

import type { ContentSource, TreeEntry } from "../sources/types";
import { useViewer } from "../store/viewer";
import { sourceKey } from "../sources/registry";
import { isFileVisible, isMarkdownName } from "../lib/filetypes";

type ContextHandler = (e: React.MouseEvent) => void;

function TreeNode({
  entry,
  source,
  depth,
  onContext,
}: {
  entry: TreeEntry;
  source: ContentSource;
  depth: number;
  onContext?: ContextHandler;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const openInSource = useViewer((s) => s.openInSource);
  const activeSource = useViewer((s) => s.source);
  const currentPath = useViewer((s) => s.docPath);
  const filters = useViewer((s) => s.filters);

  const onClick = async () => {
    if (entry.isDir) {
      // 폴더: 목록만 펼침/접힘 (우측 열린 문서는 그대로 유지)
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
    } else {
      void openInSource(source, entry.path);
    }
  };

  const isActiveSource =
    activeSource != null && sourceKey(activeSource.ref) === sourceKey(source.ref);
  const selected = !entry.isDir && isActiveSource && currentPath === entry.path;
  const md = isMarkdownName(entry.name);

  // 아이콘: 폴더(닫힘/열림) vs 파일(마크다운/일반)
  const icon = entry.isDir ? (open ? "📂" : "📁") : md ? "📄" : "📃";

  return (
    <div className="tree-node">
      <button
        className={`tree-row${selected ? " selected" : ""}${!entry.isDir && !md ? " dimmed" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={onClick}
        onContextMenu={onContext}
        title={entry.name}
      >
        {entry.isDir && <span className="tree-caret">{open ? "▾" : "▸"}</span>}
        <span className="tree-icon">{icon}</span>
        <span className="tree-name">{entry.name}</span>
      </button>
      {open && (
        <div>
          {loading && (
            <div className="tree-loading" style={{ paddingLeft: `${22 + depth * 14}px` }}>
              …
            </div>
          )}
          {children
            ?.filter((c) => c.isDir || isFileVisible(c.name, filters))
            .map((c) => (
              <TreeNode
                key={c.path}
                entry={c}
                source={source}
                depth={depth + 1}
                onContext={onContext}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/** 단일 소스의 트리(루트 항목들). */
export function FileTree({
  source,
  onContext,
}: {
  source: ContentSource;
  onContext?: ContextHandler;
}) {
  const [roots, setRoots] = useState<TreeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filters = useViewer((s) => s.filters);

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
      {roots
        .filter((entry) => entry.isDir || isFileVisible(entry.name, filters))
        .map((entry) => (
          <TreeNode
            key={entry.path}
            entry={entry}
            source={source}
            depth={0}
            onContext={onContext}
          />
        ))}
    </div>
  );
}
