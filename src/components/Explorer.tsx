/**
 * 탐색기 — 등록된 다수 소스(로컬 폴더 + GitHub 저장소)를 접이식 루트로 표시.
 * 펼침 상태는 스토어 영속화. 루트 갱신 버튼 + 우클릭 컨텍스트 메뉴 제공.
 */
import { useMemo, useState } from "react";

import type { SourceRef } from "../sources/types";
import { sourceFromRef, sourceKey } from "../sources/registry";
import { useViewer } from "../store/viewer";
import { FileTree } from "./FileTree";
import { GithubMark } from "./GithubMark";
import { SourceContextMenu } from "./SourceContextMenu";
import { Icon } from "./Icon";

function RootNode({ wsRef }: { wsRef: SourceRef }) {
  const key = sourceKey(wsRef);
  const expanded = useViewer((s) => s.expandedKeys.includes(key));
  const toggleExpanded = useViewer((s) => s.toggleExpanded);
  const bumpRefresh = useViewer((s) => s.bumpRefresh);
  const tick = useViewer((s) => s.refreshTicks[key] ?? 0);
  const globalFilters = useViewer((s) => s.filters);
  const override = useViewer((s) => s.filterOverrides[key]);
  const filters = override ?? globalFilters;
  // 소스 객체를 key 기준 memo → 재렌더 시 재요청/깜빡임 방지
  const source = useMemo(() => sourceFromRef(wsRef), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const isGithub = wsRef.kind === "github";

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="ws-root">
      <div className="ws-head">
        <button className="ws-toggle" onClick={() => toggleExpanded(key)} onContextMenu={openMenu} title={source.ref.root}>
          <span className="ws-caret">
            <Icon name={expanded ? "expand_more" : "chevron_right"} size={16} />
          </span>
          <span className="ws-icon">
            {isGithub ? <GithubMark size={14} /> : <Icon name="folder" size={15} />}
          </span>
          <span className="ws-label">{source.label}</span>
        </button>
        <button className="ws-refresh" onClick={() => bumpRefresh(key)} title="저장소 갱신">
          <Icon name="refresh" size={16} />
        </button>
      </div>
      {expanded && (
        <div className="ws-body">
          {/* tick 변경 시 remount → 트리 새로고침 */}
          <FileTree key={`${key}:${tick}`} source={source} onContext={openMenu} />
        </div>
      )}
      {menu && (
        <SourceContextMenu wsRef={wsRef} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}

export function Explorer() {
  const workspaces = useViewer((s) => s.workspaces);
  const hiddenKeys = useViewer((s) => s.hiddenKeys);
  const visible = workspaces.filter((w) => !hiddenKeys.includes(sourceKey(w)));

  return (
    <div className="explorer">
      <div className="panel-title">탐색기</div>

      {visible.length === 0 ? (
        <div className="sidebar-empty">
          폴더를 열거나 GitHub 저장소를 추가하면 여기에 표시됩니다.
        </div>
      ) : (
        visible.map((w) => <RootNode key={sourceKey(w)} wsRef={w} />)
      )}
    </div>
  );
}
