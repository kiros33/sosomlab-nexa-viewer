/**
 * 렌더 프로파일 추상화.
 *
 * "어떤 방식으로 렌더링할지"를 교체 가능한 프로파일로 정의한다. 지금은 GitHub
 * 표준 프로파일 하나지만, 새 프로파일(예: 수식/그래프 강화, GitLab 스타일, 순수
 * 텍스트 등)을 이 레지스트리에 추가하면 툴바에서 선택해 렌더링을 전환할 수 있다.
 *
 * 확장 지점:
 *  1) remark/rehype 플러그인 배열을 프로파일별로 구성
 *  2) 본문 CSS 클래스(테마) 지정
 *  3) react-markdown 커스텀 컴포넌트(선택)
 */
import type { Components, Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

type PluginList = NonNullable<Options["remarkPlugins"]>;

export interface RenderProfile {
  id: string;
  label: string;
  /** 본문 래퍼에 적용할 CSS 클래스(테마) */
  bodyClassName: string;
  remarkPlugins: PluginList;
  rehypePlugins: PluginList;
  /** 프로파일 고유 커스텀 컴포넌트(이미지/링크 등 공통 처리는 MarkdownView에서 주입) */
  components?: Partial<Components>;
}

/** GitHub 표준 프로파일 (M1 기본). */
export const githubProfile: RenderProfile = {
  id: "github",
  label: "GitHub",
  bodyClassName: "markdown-body",
  remarkPlugins: [remarkGfm, [remarkFrontmatter, ["yaml"]]],
  rehypePlugins: [
    rehypeRaw,
    rehypeSlug,
    [rehypeAutolinkHeadings, { behavior: "wrap" }],
    rehypeHighlight,
  ],
};

/**
 * 등록된 렌더 프로파일.
 * 신규 프로파일 추가 지점: 여기에 한 항목을 더하면 툴바 선택지에 자동 노출된다.
 *   예) [mathProfile.id]: mathProfile,   // M2: KaTeX/Mermaid 강화
 */
export const renderProfiles: Record<string, RenderProfile> = {
  [githubProfile.id]: githubProfile,
};

export const defaultProfileId = githubProfile.id;

export function getProfile(id: string): RenderProfile {
  return renderProfiles[id] ?? githubProfile;
}

export function listProfiles(): RenderProfile[] {
  return Object.values(renderProfiles);
}
