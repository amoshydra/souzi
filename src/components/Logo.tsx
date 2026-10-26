export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Ciqiao"
      className="logo"
    >
      <rect width="512" height="512" rx="112" fill="currentColor" />
      <circle cx="372" cy="148" r="34" fill="#c2553f" />
      <path
        d="M78 340H434"
        stroke="#f7f3e8"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M96 340C140 214 372 214 416 340"
        fill="none"
        stroke="#f7f3e8"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M128 340V298M192 340V268M256 340V250M320 340V268M384 340V298"
        stroke="#f7f3e8"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M64 394H448"
        stroke="#f7f3e8"
        strokeWidth="10"
        strokeLinecap="round"
        opacity=".4"
      />
    </svg>
  );
}
