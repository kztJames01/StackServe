import Image from "next/image";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/dark.jpeg"
      alt=""
      width={size}
      height={size}
      priority
      className="rounded-[6px]"
      style={{ width: size, height: size }}
    />
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
