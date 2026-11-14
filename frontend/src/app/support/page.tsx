import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SubHeader } from "@/components/sub-header";
import { REPO_URL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Support — StackServe",
  description: "Support channels, bug reporting, and self-hosting help for StackServe.",
};

export default function SupportPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-ink text-fg">
      <SubHeader />
      <main id="main" className="frame gutter flex-1 py-16 md:py-24 max-w-3xl">
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Support
        </h1>
        <p className="mt-4 text-fg-2 leading-relaxed">
          StackServe is an open-source, local-first MCP server and CLI for
          workload-aware cloud stack recommendations and deterministic decimal
          pricing.
        </p>

        <section className="mt-10 space-y-4 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">Contact &amp; Bug Reports</h2>
          <p className="text-fg-2 leading-relaxed">
            For bug reports, pricing catalog corrections, plugin issues, or
            feature requests, open an issue on GitHub:
          </p>
          <p>
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[14px] text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
            >
              {REPO_URL}/issues
            </a>
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">Hosted MCP Endpoint</h2>
          <p className="text-fg-2 leading-relaxed">
            The public read-only MCP endpoint is available at{" "}
            <code className="font-mono text-fg">
              https://mcp.stackserve.net/mcp
            </code>{" "}
            with a health check at{" "}
            <code className="font-mono text-fg">
              https://mcp.stackserve.net/healthz
            </code>
            . Requests are rate-limited to 60 requests per minute per client IP.
          </p>
          <p className="text-fg-2 leading-relaxed">
            If you hit rate limits or prefer offline execution, you can run the
            exact same server locally via Docker or{" "}
            <code className="font-mono text-fg">cargo install</code> as
            documented in the{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
