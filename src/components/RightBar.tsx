/**
 * 우측 바 (Eclipse 스타일, 작은 아이콘).
 * 목차(ToC) 패널을 토글(숨김↔표시). 세로 라벨로 Eclipse 느낌.
 */
import { useViewer } from "../store/viewer";

export function RightBar() {
  const tocVisible = useViewer((s) => s.tocVisible);
  const toggleToc = useViewer((s) => s.toggleToc);

  return (
    <div className="right-bar">
      <button
        className={`right-btn${tocVisible ? " active" : ""}`}
        onClick={toggleToc}
        title="목차 (ToC)"
        aria-pressed={tocVisible}
      >
        <span className="right-btn-icon">☰</span>
        <span className="right-btn-label">목차</span>
      </button>
    </div>
  );
}
