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
      <g strokeWidth="20">
        <line x1="176" y1="172" x2="296" y2="172" />
        <line x1="196" y1="200" x2="276" y2="200" />
        <line x1="186" y1="232" x2="286" y2="232" />
        <line x1="236" y1="172" x2="236" y2="290" />
        <line x1="236" y1="260" x2="196" y2="300" />
        <line x1="236" y1="260" x2="276" y2="300" />
      </g>
    </svg>
  );
}
