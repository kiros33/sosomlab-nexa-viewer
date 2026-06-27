/** 목차(ToC) 패널 — 렌더된 본문의 헤딩을 추출해 클릭 이동 아웃라인을 만든다. */
import { useEffect, useState } from "react";
import { useViewer } from "../store/viewer";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  /** 렌더된 본문 컨테이너 ref */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  /** 본문이 바뀔 때 재추출하기 위한 의존 키(예: docPath) */
  dep: string | null;
}

export function Toc({ bodyRef, dep }: Props) {
  const [items, setItems] = useState<TocItem[]>([]);
  const navigateAnchor = useViewer((s) => s.navigateAnchor);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) {
      setItems([]);
      return;
    }
    const headings = Array.from(
      el.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
    );
    setItems(
      headings
        .filter((h) => h.id)
        .map((h) => ({
          id: h.id,
          text: h.textContent?.trim() ?? "",
          level: Number(h.tagName[1]),
        })),
    );
  }, [dep, bodyRef]);

  if (items.length === 0) {
    return <div className="toc-empty">목차 없음</div>;
  }

  const minLevel = Math.min(...items.map((i) => i.level));

  return (
    <nav className="toc">
      <div className="panel-title">목차</div>
      <ul>
        {items.map((item, i) => (
          <li
            key={`${item.id}-${i}`}
            style={{ paddingLeft: `${(item.level - minLevel) * 12}px` }}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                // 이동 기록에 #앵커로 남기고 스크롤(스토어가 스크롤 트리거)
                void navigateAnchor(item.id);
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
