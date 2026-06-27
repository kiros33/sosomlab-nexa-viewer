/** 파일 확장자 분류 및 표시 필터. */

export type FileCategory = "markdown" | "text" | "web" | "other";

const MD = ["md", "markdown", "mdx"];
const TEXT = ["txt", "text", "log", "csv", "tsv", "rtf"];
const WEB = ["html", "htm", "css", "scss", "sass", "less"];

export function categoryOf(name: string): FileCategory {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (MD.includes(ext)) return "markdown";
  if (TEXT.includes(ext)) return "text";
  if (WEB.includes(ext)) return "web";
  return "other";
}

export function isMarkdownName(name: string): boolean {
  return categoryOf(name) === "markdown";
}

/** 탐색기 표시 필터(카테고리별 on/off, all=전체 표시). */
export interface FileFilters {
  all: boolean;
  markdown: boolean;
  text: boolean;
  web: boolean;
}

export const DEFAULT_FILTERS: FileFilters = {
  all: false,
  markdown: true,
  text: false,
  web: false,
};

/** 해당 파일명이 현재 필터에서 보이는지. */
export function isFileVisible(name: string, f: FileFilters): boolean {
  if (f.all) return true;
  const c = categoryOf(name);
  if (c === "markdown") return f.markdown;
  if (c === "text") return f.text;
  if (c === "web") return f.web;
  return false; // other는 전체(all)에서만
}
