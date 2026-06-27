import { useEffect, useRef } from "react";
// 테마별 GitHub 마크다운 CSS + highlight.js 테마를 raw로 가져와 토글한다.
import githubLight from "github-markdown-css/github-markdown-light.css?raw";
import githubDark from "github-markdown-css/github-markdown-dark.css?raw";
import hlLight from "highlight.js/styles/github.css?raw";
import hlDark from "highlight.js/styles/github-dark.css?raw";

import { Toolbar } from "./components/Toolbar";
import { FileTree } from "./components/FileTree";
import { Toc } from "./components/Toc";
import { HistoryBar } from "./components/HistoryBar";
import { MarkdownView } from "./renderer/MarkdownView";
import { useViewer } from "./store/viewer";
import type { RecentItem, Theme } from "./store/viewer";
import "./App.css";

function themeCss(theme: Theme): string {
  return theme === "dark" ? `${githubDark}\n${hlDark}` : `${githubLight}\n${hlLight}`;
}

export default function App() {
  const theme = useViewer((s) => s.theme);
  const source = useViewer((s) => s.source);
  const docPath = useViewer((s) => s.docPath);
  const markdown = useViewer((s) => s.markdown);
  const profileId = useViewer((s) => s.profileId);
  const loading = useViewer((s) => s.loading);
  const error = useViewer((s) => s.error);
  const recent = useViewer((s) => s.recent);
  const openRecent = useViewer((s) => s.openRecent);
  const openDoc = useViewer((s) => s.openDoc);
  const navigateAnchor = useViewer((s) => s.navigateAnchor);
  const navSeq = useViewer((s) => s.navSeq);
  const pendingHash = useViewer((s) => s.pendingHash);

  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // 이동(navSeq)마다 앵커로 스크롤(없으면 본문 맨 위로)
  useEffect(() => {
    if (navSeq === 0) return;
    requestAnimationFrame(() => {
      if (pendingHash) {
        document
          .getElementById(pendingHash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        contentRef.current?.scrollTo({ top: 0 });
      }
    });
    // navSeq만 의존: 같은 앵커 재이동도 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSeq]);

  return (
    <div className={`app theme-${theme}`}>
      {/* 활성 테마 CSS만 주입 */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />

      <Toolbar bodyRef={bodyRef} />

      <div className="layout">
        <aside className="sidebar">
          {source ? (
            <>
              <div className="panel-title" title={source.ref.root}>
                {source.label}
              </div>
              <FileTree source={source} />
            </>
          ) : (
            <div className="sidebar-empty">폴더를 열어 시작하세요</div>
          )}
        </aside>

        {/* 메인 + ToC 를 묶고, 그 위에 이동 기록 탐색 바를 둔다 */}
        <section className="main-area">
          <HistoryBar />
          <div className="doc-area">
            <main className="content" ref={contentRef}>
              {loading ? (
                <div className="placeholder">불러오는 중…</div>
              ) : error ? (
                <div className="placeholder error">{error}</div>
              ) : docPath && source ? (
                <MarkdownView
                  markdown={markdown}
                  source={source}
                  docPath={docPath}
                  profileId={profileId}
                  onNavigateDoc={(p, hash) => void openDoc(p, hash)}
                  onNavigateAnchor={(h) => void navigateAnchor(h)}
                  bodyRef={bodyRef}
                />
              ) : (
                <Welcome recent={recent} onOpenRecent={(item) => void openRecent(item)} />
              )}
            </main>

            <aside className="toc-panel">
              <Toc bodyRef={bodyRef} dep={docPath} />
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function Welcome({
  recent,
  onOpenRecent,
}: {
  recent: RecentItem[];
  onOpenRecent: (item: RecentItem) => void;
}) {
  return (
    <div className="welcome">
      <h1>Nexa Markdown Viewer</h1>
      <p>
        좌측 상단의 <b>폴더 열기</b> 또는 <b>파일 열기</b>로 시작하세요.
      </p>
      {recent.length > 0 && (
        <div className="recent">
          <div className="panel-title">최근 문서</div>
          <ul>
            {recent.map((item) => (
              <li key={`${item.ref.root}#${item.path}`}>
                <button onClick={() => onOpenRecent(item)} title={item.path}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
