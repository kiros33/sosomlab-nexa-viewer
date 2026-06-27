/**
 * 마크다운 렌더러.
 *
 * 활성 렌더 프로파일(remark/rehype 플러그인 + 본문 클래스)을 적용하고,
 * 상대 경로 이미지/문서 간 링크를 소스 추상화로 해석한다.
 */
import { memo, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { openUrl } from "@tauri-apps/plugin-opener";

import type { ContentSource } from "../sources/types";
import { getProfile } from "./profiles";
import { isExternalUrl, resolveRelative } from "../lib/paths";
import { AsyncImage } from "./AsyncImage";

interface Props {
  markdown: string;
  source: ContentSource;
  /** 현재 문서 경로(root 기준) — 상대 링크/이미지 해석 기준점 */
  docPath: string;
  profileId: string;
  /** 문서 내 다른 .md 링크 클릭 시 호출(root 기준 경로, 선택적 앵커) */
  onNavigateDoc: (path: string, hash: string | null) => void;
  /** 같은 문서 내 앵커 링크 클릭 시 호출 */
  onNavigateAnchor: (hash: string) => void;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
}

/** "path#frag" → [path, frag|null] */
function splitHash(href: string): [string, string | null] {
  const i = href.indexOf("#");
  if (i < 0) return [href, null];
  return [href.slice(0, i), href.slice(i + 1) || null];
}

function MarkdownViewImpl({
  markdown,
  source,
  docPath,
  profileId,
  onNavigateDoc,
  onNavigateAnchor,
  bodyRef,
}: Props) {
  const profile = getProfile(profileId);

  const components = useMemo<Components>(() => {
    const img = (props: ComponentPropsWithoutRef<"img">) => (
      <AsyncImage source={source} docPath={docPath} {...props} />
    );

    const a = ({
      href,
      children,
      ...rest
    }: ComponentPropsWithoutRef<"a">) => {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!href) return;
        if (href.startsWith("#")) {
          // 같은 문서 내 앵커 이동 → 기록에 #앵커로 남긴다
          e.preventDefault();
          onNavigateAnchor(href.slice(1));
          return;
        }
        e.preventDefault();
        if (isExternalUrl(href)) {
          void openUrl(href); // 외부 링크는 기본 브라우저로
          return;
        }
        // 저장소 내 다른 문서(+선택적 앵커)로 이동
        const [p, frag] = splitHash(href);
        onNavigateDoc(resolveRelative(docPath, p), frag);
      };
      return (
        <a href={href} onClick={handleClick} {...rest}>
          {children}
        </a>
      );
    };

    return { ...profile.components, img, a };
  }, [source, docPath, profile, onNavigateDoc, onNavigateAnchor]);

  return (
    <div className={profile.bodyClassName} ref={bodyRef}>
      <ReactMarkdown
        remarkPlugins={profile.remarkPlugins}
        rehypePlugins={profile.rehypePlugins}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/** 무관한 리렌더(탭 전환 등)로 인한 재파싱/깜빡임 방지 */
export const MarkdownView = memo(MarkdownViewImpl);
