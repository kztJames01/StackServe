import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SubHeader } from "@/components/sub-header";
import { REPO_URL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy Policy — StackServe",
  description:
    "How the StackServe hosted MCP endpoint handles requests, IP rate limiting, and logs.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-ink text-fg">
      <SubHeader />
      <main id="main" className="frame gutter flex-1 py-16 md:py-24 max-w-3xl">
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 font-mono text-[13px] text-fg-2">
          Last updated: November 14, 2026
        </p>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">1. No Persistent Request Storage</h2>
          <p className="text-fg-2 leading-relaxed">
            The StackServe hosted MCP server (
            <code className="font-mono text-fg">
              https://mcp.stackserve.net/mcp
            </code>
            ) processes your project brief and workload parameters strictly in
            memory to compute compatibility, cost estimates, and setup bundles.
            StackServe does not write request bodies, project briefs, or
            generated bundles to any database, and includes zero analytics or
            telemetry.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">2. IP Addresses &amp; Rate Limiting</h2>
          <p className="text-fg-2 leading-relaxed">
            To prevent abuse on the public unauthenticated endpoint, StackServe
            reads the client IP header (
            <code className="font-mono text-fg">x-forwarded-for</code>) into an
            in-memory rate-limit bucket (60 requests per 60-second window,
            bounded to 4,096 buckets in RAM). Rate-limit counters expire
            automatically in memory and are never persisted to disk.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">3. Hosting Platform Logs</h2>
          <p className="text-fg-2 leading-relaxed">
            The hosted MCP service runs on Render and the static website runs on
            IONOS. Standard infrastructure-level HTTP access and error logs
            (request timestamp, path, status code) may be retained transiently
            by the hosting provider according to their standard platform log
            retention policies.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-hairline pt-8">
          <h2 className="text-xl font-medium">4. Offline Alternative &amp; Contact</h2>
          <p className="text-fg-2 leading-relaxed">
            Do not send secrets, API keys, or private credentials in project
            briefs. For zero network transmission, run StackServe locally via
            Docker or{" "}
            <code className="font-mono text-fg">cargo install</code>. Questions
            about privacy can be raised at{" "}
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
            >
              {REPO_URL}/issues
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
