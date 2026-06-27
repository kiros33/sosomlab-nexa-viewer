/** 글꼴 목록/조작 유틸. */

/** 기본 제공 글꼴 목록(설치 폰트 조회 불가 시 폴백). */
export const COMMON_FONTS = [
  // 모노스페이스
  "ui-monospace",
  "SFMono-Regular",
  "Menlo",
  "Monaco",
  "Consolas",
  "Courier New",
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "Source Code Pro",
  "D2Coding",
  "Noto Sans Mono",
  "monospace",
  // 산세리프
  "ui-sans-serif",
  "-apple-system",
  "Segoe UI",
  "Helvetica",
  "Arial",
  "Pretendard",
  "Noto Sans KR",
  "sans-serif",
];

/** 설치된 글꼴 목록(Local Font Access API). 미지원이면 COMMON_FONTS 반환. */
export async function listFonts(): Promise<string[]> {
  try {
    const q = (window as unknown as { queryLocalFonts?: () => Promise<Array<{ family: string }>> })
      .queryLocalFonts;
    if (typeof q === "function") {
      const fonts = await q();
      const families = Array.from(new Set(fonts.map((f) => f.family))).sort((a, b) =>
        a.localeCompare(b),
      );
      if (families.length) return families;
    }
  } catch {
    /* 권한 거부/미지원 → 폴백 */
  }
  return COMMON_FONTS;
}

/** font-family 문자열을 항목 배열로 분해. */
export function parseFontStack(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/** 글꼴 이름을 스택에 추가(중복 제외, 공백 포함 시 따옴표). */
export function addFontToStack(value: string, name: string): string {
  const parts = parseFontStack(value);
  if (parts.includes(name)) return value;
  const token = /\s/.test(name) && !/^[a-z-]+$/.test(name) ? `"${name}"` : name;
  return value.trim() ? `${value.trim()}, ${token}` : token;
}
