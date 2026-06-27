/**
 * 렌더링 결과 내보내기.
 *  - HTML: github-markdown-css/highlight.js 스타일을 인라인한 단독 .html 저장
 *  - PDF: 웹뷰 인쇄(사용자가 "PDF로 저장" 선택)
 *
 * 추후 확장: 서버사이드 렌더 PDF, 이미지 임베드(현재는 data URL이라 자동 포함) 등.
 */
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
// Vite raw 임포트로 CSS 텍스트를 인라인한다.
import githubCss from "github-markdown-css/github-markdown.css?raw";
import hlCss from "highlight.js/styles/github.css?raw";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
}

function buildStandaloneHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${githubCss}
${hlCss}
body { margin: 0; }
.markdown-body { box-sizing: border-box; max-width: 880px; margin: 0 auto; padding: 32px 24px; }
</style>
</head>
<body>
<article class="markdown-body">
${bodyHtml}
</article>
</body>
</html>`;
}

/** 현재 렌더된 본문 HTML을 단독 .html 파일로 저장. */
export async function exportHtml(title: string, bodyHtml: string): Promise<void> {
  const path = await save({
    defaultPath: `${safeFileName(title)}.html`,
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!path) return;
  await invoke("write_text_file", {
    path,
    contents: buildStandaloneHtml(title, bodyHtml),
  });
}

/** 웹뷰 인쇄 다이얼로그 → "PDF로 저장" 선택. */
export function exportPdfViaPrint(): void {
  window.print();
}
