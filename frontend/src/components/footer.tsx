import Link from "next/link";
import { CATALOG_VERSION, REPO_URL } from "@/lib/data";
import { Wordmark } from "./logo";

type FooterLink = { label: string; href: string; external?: boolean };

const PRODUCT_LINKS: FooterLink[] = [
  { label: "How it works", href: "/#how" },
  { label: "Demo", href: "/#demo" },
  { label: "Connect", href: "/#connect" },
];

const RESOURCE_LINKS: FooterLink[] = [
  { label: "GitHub", href: REPO_URL, external: true },
  { label: "Issues", href: `${REPO_URL}/issues`, external: true },
  { label: "Support", href: "/support" },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    "inline-flex items-center text-[14px] text-fg-2 underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg";
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[12px] tracking-[0.08em] text-fg-3 uppercase">{title}</span>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <FooterLinkItem link={l} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="frame gutter grid grid-cols-2 gap-x-8 gap-y-10 py-14 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-16">
        <div className="col-span-2 flex flex-col gap-4 sm:col-span-3 md:col-span-1">
          <a href="#top" className="-mx-2 inline-flex h-11 w-fit items-center px-2" aria-label="StackServe, back to top">
            <Wordmark />
          </a>
          <p className="max-w-[26rem] text-[14px] leading-relaxed text-fg-2">
            A local-first MCP server that prices infrastructure in exact decimals before you touch a billing console.
          </p>
        </div>
        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Resources" links={RESOURCE_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>
      <div className="border-t border-hairline">
        <div className="frame gutter flex flex-col gap-3 py-6 text-[13px] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} StackServe</span>
            <span className="h-3 w-px bg-hairline-strong" aria-hidden />
            <span className="font-mono text-[12px]">catalog {CATALOG_VERSION}</span>
            <span className="h-3 w-px bg-hairline-strong" aria-hidden />
            <span>MIT OR Apache-2.0</span>
          </div>
          <p>Estimates are not invoices — verify each source before purchase.</p>
        </div>
      </div>
    </footer>
  );
}
