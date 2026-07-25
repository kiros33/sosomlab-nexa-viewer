/**
 * Mermaid 다이어그램 블록 (```mermaid 코드펜스).
 *  - 라이브러리는 지연 로딩(dynamic import) → 다이어그램 없는 문서는 비용 0
 *  - VS Code 스타일 색/폰트(라이트/다크 테마 동기화, base 테마 + themeVariables)
 *  - 뷰어 컨트롤: 우상단 축소/확대/원래대로 버튼 + 드래그 이동(팬) + Ctrl+휠 확대/축소
 *  - 문법 오류 시 원본 코드를 오류 표시와 함께 보여준다
 * 라이선스: mermaid MIT.
 */
import { useEffect, useRef, useState } from "react";
import type { MermaidConfig } from "mermaid";

import { useViewer } from "../store/viewer";
import type { Theme } from "../store/viewer";
import { Icon } from "../components/Icon";

type MermaidApi = typeof import("mermaid").default;

let mod: Promise<MermaidApi> | null = null;
function loadMermaid(): Promise<MermaidApi> {
  return (mod ??= import("mermaid").then((m) => m.default));
}

/** VS Code UI 폰트 스택(한글 포함) */
const VSCODE_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

/** VS Code 라이트/다크 팔레트 → mermaid base 테마 변수 */
function vscodeThemeVariables(theme: Theme): NonNullable<MermaidConfig["themeVariables"]> {
  if (theme === "dark") {
    return {
      darkMode: true,
      background: "#1e1e1e",
      primaryColor: "#252526", // 노드 배경
      primaryTextColor: "#cccccc",
      primaryBorderColor: "#3794ff", // VS Code 포커스 블루
      lineColor: "#3794ff",
      secondaryColor: "#2d2d30",
      tertiaryColor: "#252526",
      clusterBkg: "#2d2d30",
      clusterBorder: "#3c3c3c",
      edgeLabelBackground: "#1e1e1e",
      nodeTextColor: "#cccccc",
      textColor: "#cccccc",
      titleColor: "#cccccc",
      fontFamily: VSCODE_FONT,
    };
  }
  return {
    background: "#ffffff",
    primaryColor: "#f8f8f8",
    primaryTextColor: "#3b3b3b",
    primaryBorderColor: "#005fb8",
    lineColor: "#005fb8",
    secondaryColor: "#f3f3f3",
    tertiaryColor: "#f8f8f8",
    clusterBkg: "#f3f3f3",
    clusterBorder: "#c8c8c8",
    edgeLabelBackground: "#ffffff",
    nodeTextColor: "#3b3b3b",
    textColor: "#3b3b3b",
    titleColor: "#3b3b3b",
    fontFamily: VSCODE_FONT,
  };
}

let seq = 0;

const SCALE_MIN = 0.25;
const SCALE_MAX = 4;
const clampScale = (v: number) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));

export function MermaidBlock({ code }: { code: string }) {
  const theme = useViewer((s) => s.theme);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${++seq}`;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const config: MermaidConfig = {
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: vscodeThemeVariables(theme),
          fontFamily: VSCODE_FONT,
        };
        mermaid.initialize(config);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (e) {
        // 렌더 실패 시 mermaid가 남기는 임시 노드 제거
        document.getElementById(`d${id}`)?.remove();
        document.getElementById(id)?.remove();
        if (!cancelled) {
          setError(String(e));
          setSvg(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  // Ctrl/⌘ + 휠 — 다이어그램 확대/축소 (본문 줌보다 우선; preventDefault 위해 non-passive)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setScale((s) => clampScale(s * (e.deltaY < 0 ? 1.1 : 0.9)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svg]);

  // 드래그로 이동(팬)
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    const onMove = (ev: MouseEvent) =>
      setPan({ x: start.px + (ev.clientX - start.sx), y: start.py + (ev.clientY - start.sy) });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const reset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error-title">Mermaid 다이어그램 오류</div>
        <pre>{code}</pre>
      </div>
    );
  }
  if (!svg) return <div className="mermaid-loading">다이어그램 렌더링 중…</div>;

  return (
    <div className="mermaid-block">
      <div
        className="mermaid-viewport"
        ref={viewportRef}
        onMouseDown={onMouseDown}
        title="드래그: 이동 · Ctrl+휠: 확대/축소"
      >
        <div className="mermaid-toolbar" onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => setScale((s) => clampScale(s / 1.25))} title="축소">
            <Icon name="zoom_out" size={16} />
          </button>
          <button onClick={() => setScale((s) => clampScale(s * 1.25))} title="확대">
            <Icon name="zoom_in" size={16} />
          </button>
          <button onClick={reset} title="원래 크기·위치로">
            <Icon name="fit_screen" size={16} />
          </button>
        </div>
        <div
          className="mermaid-canvas"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
