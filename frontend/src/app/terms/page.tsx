import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SubHeader } from "@/components/sub-header";
import { REPO_URL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Terms of Service — StackServe",
  description:
    "Terms of use, licensing, and estimation disclaimers for StackServe.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-ink text-fg">
      <SubHeader />
      <main id="main" className="frame gutter flex-1 py-16 md:py-24 max-w-3xl">
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 font-mono text-[13px] text-fg-2">
          Last updated: November 14, 2026
        </p>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">1. Estimates Are Not Invoices</h2>
          <p className="text-fg-2 leading-relaxed">
            StackServe provides architectural compatibility checks and
            deterministic cost estimates based on a pinned catalog snapshot.
            Estimates are not invoices or binding vendor quotes. Always verify
            current pricing, limits, and terms directly with each cloud
            provider before purchasing or deploying.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">2. Review-Only Setup Artifacts</h2>
          <p className="text-fg-2 leading-relaxed">
            StackServe does not connect to cloud accounts, hold deployment
            credentials, or provision infrastructure. Generated setup bundles
            are prepared for human review and must be inspected before use.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">3. Open-Source License &amp; Availability</h2>
          <p className="text-fg-2 leading-relaxed">
            StackServe is dual-licensed under{" "}
            <code className="font-mono text-fg">MIT OR Apache-2.0</code>. The
            hosted public endpoint (
            <code className="font-mono text-fg">
              https://mcp.stackserve.net/mcp
            </code>
            ) is provided on an as-is, best-effort basis with per-IP rate
            limiting (60 requests/minute). Source code and issue tracking are
            hosted at{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
            >
              {REPO_URL}
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
