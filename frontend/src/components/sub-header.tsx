import Link from "next/link";
import { Wordmark } from "./logo";

export function SubHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-ui focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="frame gutter flex h-16 items-center justify-between gap-6">
        <Link href="/" className="-mx-2 flex h-11 items-center px-2" aria-label="StackServe, back to home">
          <Wordmark />
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-ui border border-hairline-strong px-4 text-[15px] font-medium text-fg transition-colors hover:border-fg/40"
        >
          ← Back to StackServe
        </Link>
      </div>
    </header>
  );
}
