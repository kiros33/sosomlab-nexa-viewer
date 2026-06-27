/** 파일 포맷 배지(문서 모양 + 색상 라벨). HTML/PDF 등 내보내기 버튼용 "이미지" 아이콘. */
export function FormatBadge({
  label,
  color,
  size = 20,
}: {
  label: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={label}
      style={{ display: "inline-block", verticalAlign: "middle", flex: "0 0 auto" }}
    >
      {/* 문서 외곽 + 접힌 모서리 */}
      <path
        d="M6 1.5h7L18.5 7v15.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="M13 1.8V7h5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      {/* 색상 라벨 */}
      <rect x="3.2" y="12.5" width="17.6" height="8" rx="1.6" fill={color} />
      <text
        x="12"
        y="18.6"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="-apple-system, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}
