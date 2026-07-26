/**
 * Mermaid 다이어그램 블록 (```mermaid 코드펜스).
 *  - 라이브러리는 지연 로딩(dynamic import) → 다이어그램 없는 문서는 비용 0
 *  - VS Code 스타일 색/폰트(라이트/다크 테마 동기화, base 테마 + themeVariables)
 *  - 뷰어 컨트롤: 우상단 축소/배율%/확대/1:1/화면맞춤 버튼 + 드래그 이동(팬) + Ctrl+휠 확대/축소
 *  - 뷰포트 높이는 fit 상태 기준으로 고정 — 확대해도 문서가 밀리지 않고 팬으로 본다
 *  - 문법 오류 시 원본 코드를 오류 표시와 함께 보여준다
 * 라이선스: mermaid MIT.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
      fontSize: "16px", // 본문(markdown-body 16px)과 동일 비율 유지
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
    fontSize: "16px",
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
  const canvasRef = useRef<HTMLDivElement>(null);
  /** 다이어그램 자연 폭/높이(px, viewBox 기준) */
  const naturalW = useRef(0);
  const naturalH = useRef(0);
  /** 컨테이너 폭 맞춤(fit) 배율 — 초기값이자 "화면 맞춤"의 기준 */
  const fitScale = useRef(1);
  /** 뷰포트 고정 높이(px) — fit 상태 기준. 확대해도 문서 레이아웃이 밀리지 않는다. */
  const [vpHeight, setVpHeight] = useState<number | null>(null);

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

  // 렌더 직후: 자연 폭 측정 → VS Code처럼 컨테이너 폭에 맞춰 초기 축척(fit) 결정.
  // 확대/축소는 svg 실폭을 바꾸는 방식이라 레이아웃 높이도 함께 줄어든다(잘림 방지).
  useLayoutEffect(() => {
    if (!svg) return;
    const el = canvasRef.current?.querySelector("svg");
    const vp = viewportRef.current;
    if (!el || !vp) return;
    const rect = el.getBoundingClientRect();
    const w = el.viewBox?.baseVal?.width || rect.width;
    const h = el.viewBox?.baseVal?.height || rect.height;
    if (!w) return;
    naturalW.current = w;
    naturalH.current = h;
    const fit = Math.min(1, (vp.clientWidth - 32) / w); // 패딩 16px*2 제외
    fitScale.current = fit;
    setScale(fit);
    setPan({ x: 0, y: 0 });
    setVpHeight(h ? Math.round(h * fit) + 32 : null);
  }, [svg]);

  // scale 변경 → svg 실폭 반영 (mermaid가 넣는 max-width는 해제)
  useLayoutEffect(() => {
    const el = canvasRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!el || !naturalW.current) return;
    el.style.width = `${naturalW.current * scale}px`;
    el.style.maxWidth = "none";
    el.style.height = "auto";
  }, [scale, svg]);

  // 컨테이너 크기 변화 시, 사용자가 줌을 만지지 않았다면 fit 배율 재계산
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => {
      if (!naturalW.current) return;
      const prevFit = fitScale.current;
      const fit = Math.min(1, (vp.clientWidth - 32) / naturalW.current);
      fitScale.current = fit;
      if (naturalH.current) setVpHeight(Math.round(naturalH.current * fit) + 32);
      setScale((s) => (Math.abs(s - prevFit) < 0.001 ? fit : s));
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [svg]);

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

  /** 기본 크기(1:1) 보기 — 실제 크기로 두고 넘치는 부분은 드래그(팬)로 본다 */
  const toActual = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  /** 화면 맞춤 — 전체 다이어그램이 뷰포트 안에 들어오도록(자연 크기 초과 확대는 안 함) */
  const toFit = () => {
    setScale(fitScale.current);
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
        style={vpHeight ? { height: vpHeight } : undefined}
      >
        <div className="mermaid-toolbar" onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => setScale((s) => clampScale(s / 1.25))} title="축소">
            <Icon name="zoom_out" size={16} />
          </button>
          <button className="mermaid-zoom-label" onClick={toActual} title="현재 배율 — 클릭: 100%">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale((s) => clampScale(s * 1.25))} title="확대">
            <Icon name="zoom_in" size={16} />
          </button>
          <button className="mermaid-zoom-label" onClick={toActual} title="기본 크기(1:1) — 드래그로 이동하며 보기">
            1:1
          </button>
          <button onClick={toFit} title="화면 맞춤 — 전체 다이어그램 보기">
            <Icon name="fit_screen" size={16} />
          </button>
        </div>
        <div
          className="mermaid-canvas"
          ref={canvasRef}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
