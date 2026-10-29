export function Logo({ size = 40 }: { size?: number }) {
  const remSize = `${size / 16}rem`;

  return (
    <svg
      width={remSize}
      height={remSize}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Souzi"
      className="logo"
      style={{ width: remSize, height: remSize }}
      fill="none"
      stroke="currentColor"
      strokeWidth="30"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="236" cy="230" r="118" />
      <line x1="322" y1="316" x2="402" y2="396" strokeWidth="40" />
      <circle cx="402" cy="396" r="16" fill="#c2553f" stroke="none" />
      <text
        x="236"
        y="222"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Noto Sans CJK SC', 'Noto Sans CJK', sans-serif"
        fontSize="160"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        字
      </text>
    </svg>
  );
}
