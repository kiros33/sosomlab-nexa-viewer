/**
 * 좌측 액티비티 바 (VSCode 스타일).
 * 파일 탐색기 / GitHub 뷰를 전환(활성 뷰 재클릭 시 사이드바 숨김).
 */
import { useViewer } from "../store/viewer";
import { GithubMark } from "./GithubMark";

export function ActivityBar() {
  const sidebarVisible = useViewer((s) => s.sidebarVisible);
  const sidebarView = useViewer((s) => s.sidebarView);
  const showSidebarView = useViewer((s) => s.showSidebarView);

  const isActive = (v: "files" | "github") => sidebarVisible && sidebarView === v;

  return (
    <div className="activity-bar">
      <button
        className={`activity-btn${isActive("files") ? " active" : ""}`}
        onClick={() => showSidebarView("files")}
        title="탐색기 (파일 목록)"
        aria-pressed={isActive("files")}
      >
        🗂
      </button>
      <button
        className={`activity-btn${isActive("github") ? " active" : ""}`}
        onClick={() => showSidebarView("github")}
        title="GitHub 저장소"
        aria-pressed={isActive("github")}
      >
        <GithubMark size={20} />
      </button>
    </div>
  );
}
