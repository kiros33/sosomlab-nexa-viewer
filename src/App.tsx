import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
import { ViewContextMenu } from "./components/ViewContextMenu";
import { useViewer } from "./store/viewer";
import type { RecentItem, Theme } from "./store/viewer";
import { isMarkdownName } from "./lib/filetypes";
import { buildRichSelectionClip, consumePlainCopyOnce } from "./lib/richCopy";
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
  const openExternalTarget = useViewer((s) => s.openExternalTarget);
  const viewMode = useViewer((s) => s.viewMode);
  const zoomPct = useViewer((s) => s.zoomPct);
  const setZoom = useViewer((s) => s.setZoom);
  const adjustZoom = useViewer((s) => s.adjustZoom);

  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  // 현재 문서가 "마크다운 렌더링"으로 표시 중인지 (TX 모드/비마크다운이면 원문 보기)
  const renderAsMarkdown = !!docPath && isMarkdownName(docPath) && viewMode === "md";

  // 콜백 안정화 → memo된 MarkdownView가 탭 전환 등으로 재렌더되지 않게
  const handleNavigateDoc = useCallback(
    (p: string, hash: string | null) => void openDoc(p, hash),
    [openDoc],
  );
  const handleNavigateAnchor = useCallback(
    (h: string) => void navigateAnchor(h),
    [navigateAnchor],
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // 외부 인자로 받은 파일/폴더 열기.
  // - Windows/터미널: 실행 인자(argv) → startup_target
  // - macOS Finder 더블클릭/"다음으로 열기"/Dock 드래그: Apple `Opened` 이벤트
  //   · 콜드스타트(리스너 전 발생분)는 take_opened_targets로 비워서 처리
  //   · 실행 중 추가 열기는 "open-targets" 이벤트로 수신
  useEffect(() => {
    type Target = { root: string; file: string | null };
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    // 짧은 시간 내 동일 대상 중복 열기 방지(버퍼 drain과 이벤트가 겹치는 경우 대비)
    const recent = new Map<string, number>();
    const openOne = async (t: Target) => {
      const key = `${t.root}::${t.file ?? ""}`;
      const now = Date.now();
      if (now - (recent.get(key) ?? 0) < 1500) return;
      recent.set(key, now);
      await openExternalTarget(t.root, t.file);
    };
    const openList = (list: Target[]) => {
      void (async () => {
        for (const t of list) await openOne(t);
      })();
    };
    void (async () => {
      try {
        // 1) 실행 중 추가 열기(macOS Opened)를 먼저 구독 → 버퍼 drain 전후 누락 방지
        unlisten = await listen<Target[]>("open-targets", (e) =>
          openList(e.payload ?? []),
        );
        if (cancelled) {
          unlisten?.();
          return;
        }
        // 2) 부팅 수집: argv(Windows/터미널) + macOS 콜드스타트 전역 버퍼(drain)
        const initial: Target[] = [];
        try {
          const argv = await invoke<Target | null>("startup_target");
          if (argv) initial.push(argv);
        } catch {
          /* 무시 */
        }
        try {
          const opened = await invoke<Target[]>("take_opened_targets");
          if (opened?.length) initial.push(...opened);
        } catch {
          /* 비-macOS 등은 빈 배열/무시 */
        }
        // 이미 문서가 열려 있지 않을 때만 부팅 시 자동 열기
        if (!cancelled && initial.length && !useViewer.getState().docPath) {
          for (const t of initial) await openOne(t);
        }
      } catch {
        /* 인자 없음/해석 실패는 무시 */
      }
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [openExternalTarget]);

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

  // Ctrl/⌘ +/-/0 — MD 렌더링: 줌(%) 조절, 원문(plain) 보기: 글꼴 크기 조절
  useEffect(() => {
    if (!docPath) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const plus = e.key === "=" || e.key === "+";
      const minus = e.key === "-";
      const zero = e.key === "0";
      if (!plus && !minus && !zero) return;
      e.preventDefault();
      if (renderAsMarkdown) {
        if (plus) adjustZoom(10);
        else if (minus) adjustZoom(-10);
        else setZoom(100);
      } else {
        if (plus) adjustPlainFontSize(1);
        else if (minus) adjustPlainFontSize(-1);
        else setPlainFontSize(14);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docPath, renderAsMarkdown, adjustZoom, setZoom, adjustPlainFontSize, setPlainFontSize]);

  // Ctrl/⌘ + 휠 — MD 렌더링 본문 줌(다이어그램 위에서는 다이어그램 자체 줌이 우선)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if ((e.target as HTMLElement).closest?.(".mermaid-viewport")) return;
      const s = useViewer.getState();
      if (!s.docPath || !isMarkdownName(s.docPath) || s.viewMode !== "md") return;
      e.preventDefault();
      s.adjustZoom(e.deltaY < 0 ? 10 : -10);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 드래그 선택 중 본문 가장자리에 닿으면 자동 스크롤 (TX/MD 공통)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    let speed = 0;
    let selecting = false;
    const tick = () => {
      if (speed !== 0) el.scrollTop += speed;
      raf = requestAnimationFrame(tick);
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // 다이어그램 위에서는 팬(이동) 드래그이므로 선택 자동 스크롤 제외
      if ((e.target as HTMLElement).closest?.(".mermaid-viewport")) return;
      selecting = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      if (!selecting) return;
      const r = el.getBoundingClientRect();
      const margin = 28;
      if (e.clientY < r.top + margin) speed = -Math.ceil((r.top + margin - e.clientY) / 4);
      else if (e.clientY > r.bottom - margin) speed = Math.ceil((e.clientY - (r.bottom - margin)) / 4);
      else speed = 0;
    };
    const stop = () => {
      selecting = false;
      speed = 0;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      stop();
    };
  }, []);

  // 복사 시 서식 있는 HTML을 함께 클립보드에 넣는다(MD 렌더링 중일 때).
  // → Word/PPT에 붙여넣으면 렌더된 모습이 유지된다.
  const handleCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (consumePlainCopyOnce()) return; // 우클릭 "텍스트만 복사"
      if (!renderAsMarkdown) return; // 원문 보기: 기본(평문) 복사
      const body = bodyRef.current;
      if (!body) return;
      const clip = buildRichSelectionClip(body);
      if (!clip) return;
      e.preventDefault();
      e.clipboardData.setData("text/html", clip.html);
      e.clipboardData.setData("text/plain", clip.text);
    },
    [renderAsMarkdown],
  );

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
              onCopy={handleCopy}
              onContextMenu={(e) => {
                if (!docPath) return; // 문서 없으면 기본 메뉴
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY });
              }}
            >
              {loading ? (
                <div className="placeholder">불러오는 중…</div>
              ) : error ? (
                <div className="placeholder error">{error}</div>
              ) : docPath && source ? (
                renderAsMarkdown ? (
                  <div className="zoom-wrap" style={{ zoom: zoomPct / 100 }}>
                    <MarkdownView
                      markdown={markdown}
                      source={source}
                      docPath={docPath}
                      profileId={profileId}
                      onNavigateDoc={handleNavigateDoc}
                      onNavigateAnchor={handleNavigateAnchor}
                      bodyRef={bodyRef}
                    />
                  </div>
                ) : (
                  <PlainTextView text={markdown} />
                )
              ) : (
                <Welcome recent={recent} onOpenRecent={(item) => void openRecent(item)} />
              )}
            </main>

            {ctxMenu && (
              <ViewContextMenu
                x={ctxMenu.x}
                y={ctxMenu.y}
                richScope={renderAsMarkdown ? bodyRef.current : null}
                container={contentRef.current}
                onClose={() => setCtxMenu(null)}
              />
            )}

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
