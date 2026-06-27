/** 환경설정 모달 — 탐색기 표시 파일 + 일반텍스트 글꼴/크기. */
import { useViewer } from "../store/viewer";

export function Preferences({ onClose }: { onClose: () => void }) {
  const filters = useViewer((s) => s.filters);
  const setFilters = useViewer((s) => s.setFilters);
  const plainFontFamily = useViewer((s) => s.plainFontFamily);
  const plainFontSize = useViewer((s) => s.plainFontSize);
  const setPlainFontFamily = useViewer((s) => s.setPlainFontFamily);
  const setPlainFontSize = useViewer((s) => s.setPlainFontSize);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>환경설정</b>
          <button className="modal-close" onClick={onClose} title="닫기">
            ×
          </button>
        </div>

        <section className="pref-section">
          <h4>탐색기에 보여질 파일</h4>
          <label className="pref-check">
            <input
              type="checkbox"
              checked={filters.all}
              onChange={(e) => setFilters({ all: e.target.checked })}
            />
            전체 파일
          </label>
          <label className="pref-check">
            <input
              type="checkbox"
              disabled={filters.all}
              checked={filters.markdown}
              onChange={(e) => setFilters({ markdown: e.target.checked })}
            />
            마크다운 <span className="pref-dim">(.md .markdown .mdx)</span>
          </label>
          <label className="pref-check">
            <input
              type="checkbox"
              disabled={filters.all}
              checked={filters.text}
              onChange={(e) => setFilters({ text: e.target.checked })}
            />
            일반텍스트 <span className="pref-dim">(.txt .log .csv …)</span>
          </label>
          <label className="pref-check">
            <input
              type="checkbox"
              disabled={filters.all}
              checked={filters.web}
              onChange={(e) => setFilters({ web: e.target.checked })}
            />
            HTML / CSS <span className="pref-dim">(.html .css .scss …)</span>
          </label>
        </section>

        <section className="pref-section">
          <h4>일반텍스트 / 코드 글꼴</h4>
          <label className="pref-row">
            <span>글꼴(font-family)</span>
            <input
              type="text"
              value={plainFontFamily}
              onChange={(e) => setPlainFontFamily(e.target.value)}
            />
          </label>
          <label className="pref-row">
            <span>기본 크기</span>
            <input
              type="number"
              min={8}
              max={48}
              value={plainFontSize}
              onChange={(e) => setPlainFontSize(Number(e.target.value) || 14)}
            />
            <span className="pref-dim">px · 본문에서 Ctrl/⌘ +/- 로도 변경</span>
          </label>
        </section>
      </div>
    </div>
  );
}
