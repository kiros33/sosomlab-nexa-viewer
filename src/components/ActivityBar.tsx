/**
 * 좌측 액티비티 바 (VSCode 스타일).
 * 파일 탐색기 패널을 토글(숨김↔표시).
 */
import { useViewer } from "../store/viewer";

export function ActivityBar() {
  const sidebarVisible = useViewer((s) => s.sidebarVisible);
  const toggleSidebar = useViewer((s) => s.toggleSidebar);

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
    </div>
  );
}
