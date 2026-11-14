import { CATALOG_VERSION, REPO_URL } from "@/lib/data";
import { Wordmark } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="frame gutter flex flex-col gap-4 py-10 text-[15px] text-fg-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Wordmark />
          <span className="font-mono text-[13px]">catalog {CATALOG_VERSION}</span>
          <span>MIT OR Apache-2.0</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
          >
            GitHub
          </a>
        </div>
        <p>Estimates are not invoices — verify each source before purchase.</p>
      </div>
    </footer>
  );
}
