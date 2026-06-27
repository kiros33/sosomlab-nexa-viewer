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
  const openSource = useViewer((s) => s.openSource);
  const openDoc = useViewer((s) => s.openDoc);

  const profiles = listProfiles();
  const title = docPath ? (docPath.split("/").pop() ?? docPath) : "Markdown Viewer";

  const onOpenFolder = async () => {
    const src = await pickLocalFolder();
    if (src) openSource(src);
  };

  const onOpenFile = async () => {
    const picked = await pickLocalMarkdownFile();
    if (picked) {
      openSource(picked.source);
      await openDoc(picked.filePath);
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
