/**
 * 내보내기용 라인 아이콘 — 문서(접힌 모서리) + 원형 다운로드 화살표 + 하단 라벨.
 * 라벨(PDF/HTML)만 바꿔 재사용. 색은 currentColor(라인 스타일).
 */
export function FormatBadge({ label, size = 22 }: { label: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={`${label} 다운로드`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", flex: "0 0 auto" }}
    >
      {/* 문서 외곽 + 접힌 모서리 */}
      <path d="M6.3 1.7h6.6L18.6 7.4V20.5a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V3.5a1.8 1.8 0 0 1 1.8-1.8z" />
      <path d="M12.9 1.9v3.9a1.6 1.6 0 0 0 1.6 1.6h3.9" />
      {/* 원형 다운로드 화살표 */}
      <circle cx="11.55" cy="10.2" r="4.2" />
      <path d="M11.55 7.9v4.3M9.5 10.2l2.05 2.2 2.05-2.2" />
      {/* 라벨 구분선 + 텍스트 */}
      <path d="M4.7 16.6h13.9" />
      <text
        x="11.6"
        y="20.6"
        textAnchor="middle"
        fontSize="3.9"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="-apple-system, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}
