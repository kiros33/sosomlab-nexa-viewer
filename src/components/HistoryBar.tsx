/**
 * 문서 이동(네비게이션) 기록 탐색 바 — 파일#앵커 단위.
 *  - ← 뒤로 / → 앞으로
 *  - 브레드크럼(최대 3개): 같은 파일 내 이동은 "#앵커", 파일이 바뀌면 "파일명#앵커"
 *  - "전체 기록" 펼침: 파일별 그룹(헤더 1-클릭 점프 + 앵커별 정확 이동)
 */
import { useMemo, useState } from "react";
import { useViewer } from "../store/viewer";
import type { HistoryEntry } from "../store/viewer";
import { sourceKey } from "../sources/registry";

function truncate(s: string, max = 16): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/** 직전 항목과 같은 파일이면 "#앵커", 아니면 "파일명#앵커" */
function trailLabel(entry: HistoryEntry, prev: HistoryEntry | undefined): string {
  const sameFile =
    prev && prev.path === entry.path && sourceKey(prev.ref) === sourceKey(entry.ref);
  if (sameFile) return `#${truncate(entry.hash ?? "처음", 14)}`;
  const base = truncate(entry.title, 16);
  return entry.hash ? `${base}#${truncate(entry.hash, 10)}` : base;
}

interface FileGroup {
  path: string;
  title: string;
  ref: HistoryEntry["ref"];
  items: { index: number; hash: string | null }[];
}

export function HistoryBar() {
  const history = useViewer((s) => s.history);
  const idx = useViewer((s) => s.historyIndex);
  const goTo = useViewer((s) => s.goTo);
  const goBack = useViewer((s) => s.goBack);
  const goForward = useViewer((s) => s.goForward);
  const [open, setOpen] = useState(false);

  // 전체 기록을 "파일별 그룹"으로 (최초 등장 순서 유지)
  const groups = useMemo<FileGroup[]>(() => {
    const out: FileGroup[] = [];
    history.forEach((e, i) => {
      const key = sourceKey(e.ref) + "#" + e.path;
      let g = out.find((g) => sourceKey(g.ref) + "#" + g.path === key);
      if (!g) {
        g = { path: e.path, title: e.title, ref: e.ref, items: [] };
        out.push(g);
      }
      g.items.push({ index: i, hash: e.hash });
    });
    return out;
  }, [history]);

  if (idx < 0 || history.length === 0) {
    return <div className="history-bar empty" />;
  }

  const trail = history.slice(0, idx + 1);
  const visible = trail.slice(-3);
  const start = trail.length - visible.length;

  return (
    <div className="history-bar">
      <button className="hist-nav" disabled={idx <= 0} onClick={() => void goBack()} title="이전">
        ←
      </button>
      <button
        className="hist-nav"
        disabled={idx >= history.length - 1}
        onClick={() => void goForward()}
        title="다음"
      >
        →
      </button>

      <nav className="hist-trail">
        {start > 0 && <span className="hist-ellipsis">…</span>}
        {visible.map((e, i) => {
          const realIndex = start + i;
          const prev = realIndex > 0 ? history[realIndex - 1] : undefined;
          const isCurrent = realIndex === idx;
          const showSep = i > 0 || start > 0;
          return (
            <span className="hist-seg" key={`${realIndex}-${e.path}-${e.hash ?? ""}`}>
              {showSep && <span className="hist-sep">›</span>}
              <button
                className={`hist-item${isCurrent ? " current" : ""}`}
                onClick={() => void goTo(realIndex)}
                title={`${e.path}${e.hash ? "#" + e.hash : ""}`}
              >
                {trailLabel(e, prev)}
              </button>
            </span>
          );
        })}
      </nav>

      <div className="hist-all">
        <button className="hist-nav" onClick={() => setOpen((o) => !o)} title="전체 이동 기록">
          ▾ 기록 ({history.length})
        </button>
        {open && (
          <>
            <div className="hist-backdrop" onClick={() => setOpen(false)} />
            <div className="hist-dropdown">
              {groups.map((g) => {
                const jumpIndex = g.items[g.items.length - 1].index; // 그 파일의 최근 방문
                return (
                  <div className="hist-group" key={sourceKey(g.ref) + "#" + g.path}>
                    <button
                      className="hist-file"
                      onClick={() => {
                        setOpen(false);
                        void goTo(jumpIndex);
                      }}
                      title={`${g.path} 로 이동`}
                    >
                      📄 {g.title}
                    </button>
                    <ul>
                      {g.items.map((it) => (
                        <li key={it.index}>
                          <button
                            className={it.index === idx ? "current" : ""}
                            onClick={() => {
                              setOpen(false);
                              void goTo(it.index);
                            }}
                            title={it.hash ? `#${it.hash}` : "문서 처음"}
                          >
                            <span className="hist-anchor">
                              {it.hash ? `# ${it.hash}` : "문서 처음"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
