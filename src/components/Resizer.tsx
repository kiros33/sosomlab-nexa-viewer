/** 패널 너비 조절용 드래그 핸들(세로 막대). */
import { useViewer } from "../store/viewer";

interface Props {
  /** 드래그 증분(dx)을 어떻게 적용할지 */
  onResize: (dx: number) => void;
}

export function Resizer({ onResize }: Props) {
  const commitLayout = useViewer((s) => s.commitLayout);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      if (dx !== 0) onResize(dx);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      commitLayout();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="resizer" onPointerDown={onPointerDown} role="separator" aria-orientation="vertical" />
  );
}
