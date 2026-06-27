/**
 * 탐색기 — 등록된 다수 소스(로컬 폴더 + GitHub 저장소)를 접이식 루트로 표시.
 * 펼침 상태는 스토어에 영속화(최초 등록/최초 실행만 접힘). 숨김 처리된 항목은 제외.
 */
import type { SourceRef } from "../sources/types";
import { sourceFromRef, sourceKey } from "../sources/registry";
import { useViewer } from "../store/viewer";
import { FileTree } from "./FileTree";

function RootNode({ wsRef }: { wsRef: SourceRef }) {
  const key = sourceKey(wsRef);
  const expanded = useViewer((s) => s.expandedKeys.includes(key));
  const toggleExpanded = useViewer((s) => s.toggleExpanded);
  const removeWorkspace = useViewer((s) => s.removeWorkspace);
  const source = sourceFromRef(wsRef);
  const icon = wsRef.kind === "github" ? "🐙" : "📁";

  return (
    <div className="ws-root">
      <div className="ws-head">
        <button className="ws-toggle" onClick={() => toggleExpanded(key)} title={source.ref.root}>
          <span className="ws-caret">{expanded ? "▾" : "▸"}</span>
          <span className="ws-icon">{icon}</span>
          <span className="ws-label">{source.label}</span>
        </button>
        <button
          className="ws-remove"
          onClick={() => removeWorkspace(key)}
          title="탐색기에서 제거"
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="ws-body">
          <FileTree source={source} />
        </div>
      )}
    </div>
  );
}

export function Explorer() {
  const workspaces = useViewer((s) => s.workspaces);
  const hiddenKeys = useViewer((s) => s.hiddenKeys);
  const visible = workspaces.filter((w) => !hiddenKeys.includes(sourceKey(w)));

  if (visible.length === 0) {
    return (
      <div className="sidebar-empty">
        폴더를 열거나 GitHub 저장소를 추가하면 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="explorer">
      <div className="panel-title">탐색기</div>
      {visible.map((w) => (
        <RootNode key={sourceKey(w)} wsRef={w} />
      ))}
    </div>
  );
}
