/**
 * 좌측 액티비티 바 (VSCode 스타일).
 * 아이콘 클릭으로 파일 탐색기/목차(ToC) 패널을 토글(숨김↔표시).
 */
import { useViewer } from "../store/viewer";

export function ActivityBar() {
  const sidebarVisible = useViewer((s) => s.sidebarVisible);
  const tocVisible = useViewer((s) => s.tocVisible);
  const toggleSidebar = useViewer((s) => s.toggleSidebar);
  const toggleToc = useViewer((s) => s.toggleToc);

  return (
    <div className="activity-bar">
      <button
        className={`activity-btn${sidebarVisible ? " active" : ""}`}
        onClick={toggleSidebar}
        title="탐색기 (파일 목록)"
        aria-pressed={sidebarVisible}
      >
        🗂
      </button>
      <button
        className={`activity-btn${tocVisible ? " active" : ""}`}
        onClick={toggleToc}
        title="목차 (ToC)"
        aria-pressed={tocVisible}
      >
        ☰
      </button>
    </div>
  );
}
