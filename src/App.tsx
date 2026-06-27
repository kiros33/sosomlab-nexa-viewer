import { useEffect, useRef } from "react";
// 테마별 GitHub 마크다운 CSS + highlight.js 테마를 raw로 가져와 토글한다.
import githubLight from "github-markdown-css/github-markdown-light.css?raw";
import githubDark from "github-markdown-css/github-markdown-dark.css?raw";
import hlLight from "highlight.js/styles/github.css?raw";
import hlDark from "highlight.js/styles/github-dark.css?raw";

import { Toolbar } from "./components/Toolbar";
import { Explorer } from "./components/Explorer";
import { Toc } from "./components/Toc";
import { HistoryBar } from "./components/HistoryBar";
import { ActivityBar } from "./components/ActivityBar";
import { RightBar } from "./components/RightBar";
import { Resizer } from "./components/Resizer";
import { GithubPanel } from "./components/GithubPanel";
import { MarkdownView } from "./renderer/MarkdownView";
import { PlainTextView } from "./renderer/PlainTextView";
import { useViewer } from "./store/viewer";
import type { RecentItem, Theme } from "./store/viewer";
import { isMarkdownName } from "./lib/filetypes";
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
  const pendingScroll = useViewer((s) => s.pendingScroll);
  const noteScroll = useViewer((s) => s.noteScroll);
  const adjustPlainFontSize = useViewer((s) => s.adjustPlainFontSize);
  const setPlainFontSize = useViewer((s) => s.setPlainFontSize);
  const sidebarVisible = useViewer((s) => s.sidebarVisible);
  const tocVisible = useViewer((s) => s.tocVisible);
  const sidebarWidth = useViewer((s) => s.sidebarWidth);
  const tocWidth = useViewer((s) => s.tocWidth);
  const sidebarView = useViewer((s) => s.sidebarView);
  const resizeSidebar = useViewer((s) => s.resizeSidebar);
  const resizeToc = useViewer((s) => s.resizeToc);
  const checkForUpdate = useViewer((s) => s.checkForUpdate);

  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // 이동(navSeq)마다 스크롤 복원: 저장된 위치 > 앵커 > 맨 위
  useEffect(() => {
    if (navSeq === 0) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (pendingScroll != null) {
          contentRef.current?.scrollTo({ top: pendingScroll });
        } else if (pendingHash) {
          document
            .getElementById(pendingHash)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          contentRef.current?.scrollTo({ top: 0 });
        }
      }),
    );
    // navSeq만 의존: 같은 위치 재이동도 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSeq]);

  // 창 포커스 시 원격 갱신 여부 확인
  useEffect(() => {
    const onFocus = () => void checkForUpdate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkForUpdate]);

  // 비-마크다운(plain) 문서에서 Ctrl/⌘ +/- 로 글꼴 크기 조절
  useEffect(() => {
    const isPlain = !!docPath && !isMarkdownName(docPath);
    if (!isPlain) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        adjustPlainFontSize(1);
      } else if (e.key === "-") {
        e.preventDefault();
        adjustPlainFontSize(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        setPlainFontSize(14);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docPath, adjustPlainFontSize, setPlainFontSize]);

  return (
    <div className={`app theme-${theme}`}>
      {/* 활성 테마 CSS만 주입 */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />

      <Toolbar bodyRef={bodyRef} />

      <div className="layout">
        <ActivityBar />

        {sidebarVisible && (
          <aside className="sidebar" style={{ flex: `0 0 ${sidebarWidth}px`, width: sidebarWidth }}>
            {/* 두 뷰를 항상 마운트하고 표시만 토글 → 펼침/입력 상태 유지 */}
            <div style={{ display: sidebarView === "files" ? "contents" : "none" }}>
              <Explorer />
            </div>
            <div style={{ display: sidebarView === "github" ? "contents" : "none" }}>
              <GithubPanel />
            </div>
          </aside>
        )}
        {sidebarVisible && <Resizer onResize={resizeSidebar} />}

        {/* 메인 + ToC 를 묶고, 그 위에 이동 기록 탐색 바를 둔다 */}
        <section className="main-area">
          <HistoryBar />
          <div className="doc-area">
            <main
              className="content"
              ref={contentRef}
              onScroll={(e) => noteScroll(e.currentTarget.scrollTop)}
            >
              {loading ? (
                <div className="placeholder">불러오는 중…</div>
              ) : error ? (
                <div className="placeholder error">{error}</div>
              ) : docPath && source ? (
                isMarkdownName(docPath) ? (
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
                  <PlainTextView text={markdown} />
                )
              ) : (
                <Welcome recent={recent} onOpenRecent={(item) => void openRecent(item)} />
              )}
            </main>

            {tocVisible && <Resizer onResize={resizeToc} />}
            {tocVisible && (
              <aside className="toc-panel" style={{ flex: `0 0 ${tocWidth}px`, width: tocWidth }}>
                <Toc bodyRef={bodyRef} dep={docPath} />
              </aside>
            )}
          </div>
        </section>

        <RightBar />
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
      <p className="welcome-org">GitHub 스타일 Markdown 뷰어 · by SosomLab</p>
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
