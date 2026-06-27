/** 비-마크다운(일반텍스트/코드) 파일 뷰어 — 고정 글꼴, 크기는 설정/Ctrl +/-. */
import { useViewer } from "../store/viewer";

export function PlainTextView({ text }: { text: string }) {
  const fontFamily = useViewer((s) => s.plainFontFamily);
  const fontSize = useViewer((s) => s.plainFontSize);
  return (
    <pre className="plain-view" style={{ fontFamily, fontSize: `${fontSize}px` }}>
      {text}
    </pre>
  );
}
