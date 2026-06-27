/** 저장소(워크스페이스) 우클릭 컨텍스트 메뉴 — 제거/갱신/파일보기/온라인보기. */
import { openUrl, openPath } from "@tauri-apps/plugin-opener";

import type { SourceRef } from "../sources/types";
import { sourceKey } from "../sources/registry";
import { useViewer } from "../store/viewer";
import { Icon } from "./Icon";

export function SourceContextMenu({
  wsRef,
  x,
  y,
  onClose,
}: {
  wsRef: SourceRef;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const key = sourceKey(wsRef);
  const removeWorkspace = useViewer((s) => s.removeWorkspace);
  const bumpRefresh = useViewer((s) => s.bumpRefresh);
  const filters = useViewer((s) => s.filters);
  const setFilters = useViewer((s) => s.setFilters);

  const openOnline = () => {
    if (wsRef.kind === "github") {
      const url = `https://github.com/${wsRef.root}${wsRef.gitRef ? `/tree/${wsRef.gitRef}` : ""}`;
      void openUrl(url);
    } else {
      void openPath(wsRef.root); // 로컬: 폴더 열기(파일 관리자)
    }
    onClose();
  };

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="ctx-menu" style={{ left: x, top: y }}>
        <div className="ctx-title">{wsRef.root}</div>
        <button
          className="ctx-item"
          onClick={() => {
            bumpRefresh(key);
            onClose();
          }}
        >
          <Icon name="refresh" size={16} /> 저장소 갱신
        </button>
        <button className="ctx-item" onClick={openOnline}>
          <Icon name="open_in_new" size={16} />{" "}
          {wsRef.kind === "github" ? "온라인(브라우저)에서 보기" : "폴더 열기"}
        </button>
        <button
          className="ctx-item ctx-danger"
          onClick={() => {
            removeWorkspace(key);
            onClose();
          }}
        >
          <Icon name="close" size={16} /> 제거(닫기)
        </button>

        <div className="ctx-sep" />
        <div className="ctx-subtitle">파일 보기</div>
        <label className="ctx-check">
          <input
            type="checkbox"
            checked={filters.all}
            onChange={(e) => setFilters({ all: e.target.checked })}
          />
          전체
        </label>
        <label className="ctx-check">
          <input
            type="checkbox"
            disabled={filters.all}
            checked={filters.markdown}
            onChange={(e) => setFilters({ markdown: e.target.checked })}
          />
          마크다운
        </label>
        <label className="ctx-check">
          <input
            type="checkbox"
            disabled={filters.all}
            checked={filters.text}
            onChange={(e) => setFilters({ text: e.target.checked })}
          />
          일반텍스트
        </label>
        <label className="ctx-check">
          <input
            type="checkbox"
            disabled={filters.all}
            checked={filters.web}
            onChange={(e) => setFilters({ web: e.target.checked })}
          />
          HTML / CSS
        </label>
      </div>
    </>
  );
}
