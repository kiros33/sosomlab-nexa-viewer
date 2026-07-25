/**
 * Mermaid 다이어그램 블록 (```mermaid 코드펜스).
 *  - 라이브러리는 지연 로딩(dynamic import) → 다이어그램 없는 문서는 비용 0
 *  - 앱 라이트/다크 테마와 동기화
 *  - 문법 오류 시 원본 코드를 오류 표시와 함께 보여준다
 * 라이선스: mermaid MIT.
 */
import { useEffect, useState } from "react";
import type { MermaidConfig } from "mermaid";

import { useViewer } from "../store/viewer";

type MermaidApi = typeof import("mermaid").default;

let mod: Promise<MermaidApi> | null = null;
function loadMermaid(): Promise<MermaidApi> {
  return (mod ??= import("mermaid").then((m) => m.default));
}

let seq = 0;

export function MermaidBlock({ code }: { code: string }) {
  const theme = useViewer((s) => s.theme);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${++seq}`;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const config: MermaidConfig = {
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
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

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error-title">Mermaid 다이어그램 오류</div>
        <pre>{code}</pre>
      </div>
    );
  }
  if (!svg) return <div className="mermaid-loading">다이어그램 렌더링 중…</div>;
  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}
