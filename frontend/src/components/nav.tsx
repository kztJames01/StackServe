import { REPO_URL } from "@/lib/data";
import { Wordmark } from "./logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#demo", label: "Demo" },
  { href: "#connect", label: "Connect" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-ui focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <nav className="frame gutter flex h-16 items-center justify-between gap-6" aria-label="Primary">
        <a href="#top" className="-mx-2 flex h-11 items-center px-2" aria-label="StackServe, back to top">
          <Wordmark />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex h-11 items-center rounded-ui px-3 text-[15px] text-fg-2 transition-colors hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center rounded-ui border border-hairline-strong px-4 text-[15px] font-medium text-fg transition-colors hover:border-fg/40"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
