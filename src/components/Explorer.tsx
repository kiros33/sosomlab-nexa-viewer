/**
 * 탐색기 — 등록된 다수 소스(로컬 폴더 + GitHub 저장소)를 접이식 루트로 표시.
 * 각 루트는 기본 접힘(Collapsed) 상태이며, 펼치면 해당 소스의 트리를 로드한다.
 */
import { useState } from "react";

import type { SourceRef } from "../sources/types";
import { sourceFromRef, sourceKey } from "../sources/registry";
import { useViewer } from "../store/viewer";
import { FileTree } from "./FileTree";

function RootNode({ wsRef }: { wsRef: SourceRef }) {
  const [open, setOpen] = useState(false); // 기본 접힘
  const removeWorkspace = useViewer((s) => s.removeWorkspace);
  const source = sourceFromRef(wsRef);
  const icon = wsRef.kind === "github" ? "🐙" : "📁";

  return (
    <div className="ws-root">
      <div className="ws-head">
        <button className="ws-toggle" onClick={() => setOpen((o) => !o)} title={source.ref.root}>
          <span className="ws-caret">{open ? "▾" : "▸"}</span>
          <span className="ws-icon">{icon}</span>
          <span className="ws-label">{source.label}</span>
        </button>
        <button
          className="ws-remove"
          onClick={() => removeWorkspace(sourceKey(wsRef))}
          title="탐색기에서 제거"
        >
          ×
        </button>
      </div>
      {open && (
        <div className="ws-body">
          <FileTree source={source} />
        </div>
      )}
    </div>
  );
}

export function Explorer() {
  const workspaces = useViewer((s) => s.workspaces);

  if (workspaces.length === 0) {
    return (
      <div className="sidebar-empty">
        폴더를 열거나 GitHub 저장소를 추가하면 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="explorer">
      <div className="panel-title">탐색기</div>
      {workspaces.map((w) => (
        <RootNode key={sourceKey(w)} wsRef={w} />
      ))}
    </div>
  );
}
