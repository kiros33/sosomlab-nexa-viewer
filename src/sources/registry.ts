/**
 * 등록된 소스 레지스트리.
 *
 * M1은 로컬 소스만 다루지만, 다중 repository(M3+)를 대비해 "등록된 소스 목록"을
 * 별도 개념으로 둔다. 신규 소스 종류는 여기에 팩토리를 추가한다.
 */
import type { ContentSource, SourceKind, SourceRef } from "./types";
import { LocalSource } from "./localSource";
import { GithubSource } from "./githubSource";

/** SourceRef → ContentSource 복원(영속화된 소스 재구성에 사용). */
export function sourceFromRef(ref: SourceRef): ContentSource {
  switch (ref.kind) {
    case "local":
      return new LocalSource(ref.root);
    case "github":
      return new GithubSource(ref.root, ref.gitRef);
    default:
      throw new Error(`지원하지 않는 소스 종류입니다: ${ref.kind as SourceKind}`);
  }
}

/** 소스의 안정적 식별 키(중복 등록 방지/최근 목록 키). */
export function sourceKey(ref: SourceRef): string {
  return `${ref.kind}:${ref.root}${ref.gitRef ? `@${ref.gitRef}` : ""}`;
}
