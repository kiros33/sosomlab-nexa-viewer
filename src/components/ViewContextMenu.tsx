/**
 * 본문(문서 영역) 우클릭 컨텍스트 메뉴 — 복사/텍스트만 복사/전체 복사/전체 선택.
 *  - MD 모드: 복사 시 서식 있는 HTML(Word/PPT 붙여넣기용)을 함께 클립보드에 넣는다.
 *  - TX 모드: 평문 복사.
 */
import { useViewer } from "../store/viewer";
import {
  buildRichDocumentClip,
  plainClip,
  writeClip,
  markPlainCopyOnce,
} from "../lib/richCopy";

export function ViewContextMenu({
  x,
  y,
  richScope,
  container,
  onClose,
}: {
  x: number;
  y: number;
  /** 서식 복사 기준 요소(MD 모드의 .markdown-body). TX/비마크다운이면 null */
  richScope: HTMLElement | null;
  /** 본문 스크롤 컨테이너(전체 선택 대상 탐색용) */
  container: HTMLElement | null;
  onClose: () => void;
}) {
  const markdown = useViewer((s) => s.markdown);

  const hasSelection = () => {
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed && sel.rangeCount > 0;
  };
  const selectionAvailable = hasSelection();

  /** 선택 영역 복사 — execCommand로 copy 이벤트를 발생시켜 App의 onCopy(서식 주입)를 태운다. */
  const copySelection = (plain: boolean) => {
    if (plain) markPlainCopyOnce();
    document.execCommand("copy");
    onClose();
  };

  /** 문서 전체 복사 — MD면 서식 HTML, 아니면 원문 텍스트 전체 */
  const copyAll = () => {
    if (richScope) {
      void writeClip(buildRichDocumentClip(richScope));
    } else {
      void writeClip(plainClip(markdown));
    }
    onClose();
  };

  const selectAll = () => {
    const target =
      container?.querySelector<HTMLElement>(".markdown-body, .plain-view") ?? container;
    if (target) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    onClose();
  };

  return (
    <>
      <div
        className="ctx-backdrop"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* mousedown 기본동작을 막아 메뉴 클릭으로 선택 영역이 풀리지 않게 한다 */}
      <div className="ctx-menu" style={{ left: x, top: y }} onMouseDown={(e) => e.preventDefault()}>
        <button
          className="ctx-item"
          disabled={!selectionAvailable}
          onClick={() => copySelection(false)}
        >
          복사{richScope ? " (서식 유지)" : ""}
        </button>
        {richScope && (
          <button
            className="ctx-item"
            disabled={!selectionAvailable}
            onClick={() => copySelection(true)}
          >
            텍스트만 복사
          </button>
        )}
        <button className="ctx-item" onClick={copyAll}>
          문서 전체 복사
        </button>
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={selectAll}>
          전체 선택
        </button>
      </div>
    </>
  );
}
