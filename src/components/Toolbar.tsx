/** 상단 툴바 — 열기/렌더 프로파일/테마/내보내기. */
import { useState } from "react";
import { pickLocalFolder, pickLocalMarkdownFile } from "../sources/localSource";
import { listProfiles } from "../renderer/profiles";
import { exportHtml, exportPdfViaPrint } from "../lib/exporters";
import { useViewer } from "../store/viewer";
import { Preferences } from "./Preferences";
import { Icon } from "./Icon";
import { FormatBadge } from "./FormatBadge";

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
  const [prefsOpen, setPrefsOpen] = useState(false);

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
        <button className="tb-btn" onClick={onOpenFolder}>
          <Icon name="folder_open" /> 폴더 열기
        </button>
        <button className="tb-btn" onClick={onOpenFile}>
          <Icon name="description" /> 파일 열기
        </button>
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
        <button className="tb-btn" onClick={onExportHtml} disabled={!docPath} title="HTML로 내보내기">
          <Icon name="download" size={16} />
          <FormatBadge label="HTML" color="#e44d26" />
        </button>
        <button className="tb-btn" onClick={exportPdfViaPrint} disabled={!docPath} title="인쇄/PDF로 저장">
          <Icon name="download" size={16} />
          <FormatBadge label="PDF" color="#d93831" />
        </button>
        <button className="tb-icon" onClick={toggleTheme} title="테마 전환">
          <Icon name={theme === "light" ? "dark_mode" : "light_mode"} size={18} />
        </button>
        <button className="tb-icon" onClick={() => setPrefsOpen(true)} title="환경설정">
          <Icon name="settings" size={18} />
        </button>
      </div>

      {prefsOpen && <Preferences onClose={() => setPrefsOpen(false)} />}
    </header>
  );
}
