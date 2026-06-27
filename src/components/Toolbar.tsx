/** 상단 툴바 — 열기/렌더 프로파일/테마/내보내기. */
import { pickLocalFolder, pickLocalMarkdownFile } from "../sources/localSource";
import { listProfiles } from "../renderer/profiles";
import { exportHtml, exportPdfViaPrint } from "../lib/exporters";
import { useViewer } from "../store/viewer";

interface Props {
  bodyRef: React.RefObject<HTMLDivElement | null>;
}

export function Toolbar({ bodyRef }: Props) {
  const theme = useViewer((s) => s.theme);
  const profileId = useViewer((s) => s.profileId);
  const docPath = useViewer((s) => s.docPath);
  const toggleTheme = useViewer((s) => s.toggleTheme);
  const setProfile = useViewer((s) => s.setProfile);
  const addWorkspace = useViewer((s) => s.addWorkspace);
  const openInSource = useViewer((s) => s.openInSource);
  const showSidebarView = useViewer((s) => s.showSidebarView);

  const profiles = listProfiles();
  const title = docPath ? (docPath.split("/").pop() ?? docPath) : "Markdown Viewer";

  const onOpenFolder = async () => {
    const src = await pickLocalFolder();
    if (src) {
      addWorkspace(src.ref); // 탐색기에 루트로 추가(접힘 상태)
      showSidebarView("files");
    }
  };

  const onOpenFile = async () => {
    const picked = await pickLocalMarkdownFile();
    if (picked) {
      addWorkspace(picked.source.ref); // 부모 폴더를 탐색기에 등록
      await openInSource(picked.source, picked.filePath); // 파일은 바로 열기
    }
  };

  const onExportHtml = async () => {
    const html = bodyRef.current?.innerHTML;
    if (!html) return;
    await exportHtml(title, html);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button onClick={onOpenFolder}>📂 폴더 열기</button>
        <button onClick={onOpenFile}>📄 파일 열기</button>
      </div>

      <div className="toolbar-title" title={docPath ?? ""}>
        {title}
      </div>

      <div className="toolbar-right">
        <label className="profile-select">
          렌더링
          <select
            value={profileId}
            onChange={(e) => setProfile(e.target.value)}
            title="렌더 프로파일 선택"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onExportHtml} disabled={!docPath} title="HTML로 내보내기">
          ⬇ HTML
        </button>
        <button onClick={exportPdfViaPrint} disabled={!docPath} title="인쇄/PDF로 저장">
          ⬇ PDF
        </button>
        <button onClick={toggleTheme} title="테마 전환">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </header>
  );
}
