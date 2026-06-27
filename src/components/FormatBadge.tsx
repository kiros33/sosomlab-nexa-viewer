/**
 * 내보내기용 통합 아이콘 — 색상 문서(포맷 라벨) + 우하단 다운로드 배지 overlay.
 * (화살표/문서를 따로 두지 않고 하나의 아이콘으로 구성)
 */
export function FormatBadge({
  label,
  color,
  size = 22,
}: {
  label: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      aria-label={`${label} 다운로드`}
      style={{ display: "inline-block", verticalAlign: "middle", flex: "0 0 auto" }}
    >
      {/* 문서 본체 + 접힌 모서리 */}
      <path
        d="M6 2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill="#fff"
        stroke={color}
        strokeWidth="1.4"
      />
      <path d="M14.3 2.2V8h5.4" fill="none" stroke={color} strokeWidth="1.4" />
      {/* 포맷 라벨 밴드 */}
      <rect x="2.6" y="11.2" width="14" height="6.6" rx="1.3" fill={color} />
      <text
        x="9.6"
        y="16.1"
        textAnchor="middle"
        fontSize="4.8"
        fontWeight="700"
        fill="#fff"
        fontFamily="-apple-system, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
      {/* 다운로드 배지 overlay (우하단) */}
      <circle cx="20.5" cy="20.5" r="6" fill={color} stroke="#fff" strokeWidth="1.4" />
      <path
        d="M20.5 17.4v5M18 20l2.5 2.6L23 20"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
