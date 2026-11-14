export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 2.5h14v18l-2.33-1.5-2.34 1.5L12 19l-2.33 1.5L7.33 19 5 20.5v-18Z" fill="#EDEBE6" />
      <path d="M8 7.5h8M8 11h8M8 14.5h4.5" stroke="#0B0B0C" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo />
      <span className="text-[16px] font-medium tracking-[-0.01em] text-fg">StackServe</span>
    </span>
  );
}
