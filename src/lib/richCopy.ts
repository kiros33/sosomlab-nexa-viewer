/**
 * 서식 있는 복사(rich copy).
 *
 * 렌더된 마크다운 선택 영역을 "인라인 스타일 HTML"로 변환해 클립보드의
 * text/html 플레이버로 넣는다 → Word/PPT/한글 등에 붙여넣으면 렌더링된
 * 모습(제목 크기·표·코드 배경 등)이 유지된다.
 *
 * 방식: 선택 Range를 복제해 markdown-body 내부의 숨김 컨테이너에 붙인 뒤
 * (클래스 기반 CSS가 그대로 적용됨) 각 요소의 computed style을 style
 * 속성으로 인라인하고 그 HTML을 취한다. 외부 CSS 없이도 서식이 살아있다.
 */

/** 인라인할 CSS 속성 — Word/PPT가 해석하는 핵심 서식만 추린다. */
const STYLE_PROPS = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration-line",
  "text-align",
  "vertical-align",
  "line-height",
  "white-space",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-collapse",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "list-style-type",
] as const;

/** 기본값이라 인라인할 필요 없는 값 필터 */
function skipValue(prop: string, value: string): boolean {
  if (!value) return true;
  if (value === "rgba(0, 0, 0, 0)" || value === "transparent") return true;
  if (prop.startsWith("border-") && value.startsWith("0px")) return true;
  if ((prop.startsWith("padding-") || prop.startsWith("margin-")) && value === "0px") return true;
  if (prop === "white-space" && value === "normal") return true;
  if (prop === "text-decoration-line" && value === "none") return true;
  return false;
}

function inlineComputed(el: Element) {
  // SVG(다이어그램) 내부는 자체 인라인 스타일을 갖고 있어 건드리지 않는다.
  if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
  const cs = getComputedStyle(el);
  let out = "";
  for (const p of STYLE_PROPS) {
    const v = cs.getPropertyValue(p);
    if (!skipValue(p, v)) out += `${p}:${v};`;
  }
  el.setAttribute("style", out);
  el.removeAttribute("class");
}

export interface RichClip {
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 평문 클립 — html 플레이버는 줄바꿈 보존용 <pre>로 제공 */
export function plainClip(text: string): RichClip {
  return {
    html: `<pre style="font-family:Consolas,Menlo,monospace;white-space:pre-wrap;">${escapeHtml(text)}</pre>`,
    text,
  };
}

/** Range → 인라인 스타일 HTML. scope는 렌더된 본문(.markdown-body) 요소. */
function rangeToRichHtml(range: Range, scope: HTMLElement): string {
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-100000px";
  holder.style.top = "0";
  holder.appendChild(range.cloneContents());
  scope.appendChild(holder); // 본문 내부에 부착 → 클래스 CSS 적용 상태로 계산
  try {
    holder.querySelectorAll("*").forEach((el) => inlineComputed(el));
    const cs = getComputedStyle(scope);
    const base =
      `font-family:${cs.fontFamily};font-size:${cs.fontSize};` +
      `color:${cs.color};background-color:${cs.backgroundColor};`;
    return `<div style="${base}">${holder.innerHTML}</div>`;
  } finally {
    holder.remove();
  }
}

/** 현재 선택 영역(scope 내부일 때)을 서식 HTML + 평문으로 변환. 없으면 null. */
export function buildRichSelectionClip(scope: HTMLElement): RichClip | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!scope.contains(range.commonAncestorContainer)) return null;
  return { html: rangeToRichHtml(range, scope), text: sel.toString() };
}

/** 문서 전체(scope 내용)를 서식 HTML + 평문으로 변환. */
export function buildRichDocumentClip(scope: HTMLElement): RichClip {
  const range = document.createRange();
  range.selectNodeContents(scope);
  return { html: rangeToRichHtml(range, scope), text: scope.innerText };
}

/** 서식 HTML + 평문을 클립보드에 기록(비동기 API → execCommand 폴백). */
export async function writeClip(clip: RichClip): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([clip.html], { type: "text/html" }),
        "text/plain": new Blob([clip.text], { type: "text/plain" }),
      }),
    ]);
  } catch {
    // 폴백: 일회성 copy 이벤트 가로채기 + execCommand
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData("text/html", clip.html);
      e.clipboardData?.setData("text/plain", clip.text);
    };
    document.addEventListener("copy", onCopy, { capture: true, once: true });
    document.execCommand("copy");
    document.removeEventListener("copy", onCopy, { capture: true });
  }
}

// ── 우클릭 메뉴 "텍스트만 복사" 지원: 다음 copy 이벤트 1회를 평문으로 강제 ──
let plainOnce = false;
export function markPlainCopyOnce() {
  plainOnce = true;
}
export function consumePlainCopyOnce(): boolean {
  const v = plainOnce;
  plainOnce = false;
  return v;
}
