/**
 * 콘텐츠 소스 추상화 (프론트엔드).
 *
 * 로컬/GitHub/(추후) Bitbucket 등 서로 다른 출처를 동일한 인터페이스로 다룬다.
 * UI는 `ContentSource`만 의존하며, 신규 소스는 이 인터페이스 구현체를 추가하고
 * registry에 등록하는 것으로 끼워진다.
 */

/** 소스 종류 식별자. 신규 소스 추가 시 여기에 유니온을 확장한다. */
export type SourceKind = "local" | "github" | "bitbucket" | "gitlab";

/** Rust `SourceRef`와 1:1 대응되는 직렬화 컨텍스트. */
export interface SourceRef {
  kind: SourceKind;
  /** local: 열린 폴더 절대 경로 / remote: "owner/repo" */
  root: string;
  /** remote 브랜치·태그·커밋 (local은 미사용) */
  gitRef?: string | null;
}

/** 디렉터리 트리 한 항목. */
export interface TreeEntry {
  name: string;
  /** root 기준 상대 경로(슬래시 구분) */
  path: string;
  isDir: boolean;
}

/** 파일 텍스트 내용. */
export interface FileContent {
  path: string;
  text: string;
}

/**
 * 모든 소스가 구현하는 공통 인터페이스.
 * 메서드 시그니처는 Rust `ContentProvider` 트레잇과 의도적으로 대칭이다.
 */
export interface ContentSource {
  readonly kind: SourceKind;
  /** 사람이 읽는 라벨(탭/사이드바 표시용) */
  readonly label: string;
  /** Rust 커맨드로 넘길 컨텍스트 */
  readonly ref: SourceRef;

  listDir(path: string): Promise<TreeEntry[]>;
  readFile(path: string): Promise<FileContent>;
  /** 상대 경로 에셋(이미지 등)을 표시 가능한 URL(data URL 등)로 해석 */
  resolveAsset(path: string): Promise<string>;
  /** 원격 전용. 로컬은 빈 배열 */
  listBranches(): Promise<string[]>;
}
