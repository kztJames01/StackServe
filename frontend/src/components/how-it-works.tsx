"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  COMPAT_CHECKS,
  DOC_CHUNKS,
  ENV_TRACES,
  PROFILE_QUESTIONS,
  PROFILE_REQUIREMENTS,
  RECEIPT_SCENARIO,
  RECOMMEND_COUNTS,
  STEPS,
  padDecimal,
} from "@/lib/data";
import { Section, SectionHead } from "./ui";

function Row({ cells }: { cells: ReactNode[] }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 py-1 sm:grid-cols-[11rem_8rem_minmax(0,1fr)]">
      {cells.map((c, i) => (
        <span key={i} className={i === 0 ? "text-fg" : "text-fg-2 max-sm:col-start-2"}>
          {c}
        </span>
      ))}
    </div>
  );
}

function ProfileExample() {
  const pick = (field: string) => PROFILE_REQUIREMENTS.find((r) => r.field === field);
  const rows = ["runtime", "uploads", "storage_gb"].flatMap((f) => {
    const r = pick(f);
    return r ? [r] : [];
  });
  return (
    <>
      {rows.map((r) => (
        <Row key={r.field} cells={[r.field, r.value ?? "unknown", r.source ? `${r.label} · ${r.source}` : r.label]} />
      ))}
      <p className="mt-3 text-fg-2">
        Asks instead of guessing: <span className="text-fg">“{PROFILE_QUESTIONS[0]}”</span>
      </p>
    </>
  );
}

function RetrieveExample() {
  const chunk = DOC_CHUNKS[0];
  return (
    <>
      <p className="text-fg">{chunk.heading}</p>
      <p className="mt-1 max-w-[60ch] text-fg-2">“{chunk.text}”</p>
      <p className="mt-3 text-fg-2">
        <a
          href={chunk.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-fg underline decoration-hairline-strong underline-offset-4 hover:decoration-fg"
        >
          {chunk.sourceUrl.replace("https://", "")}
        </a>{" "}
        · verified {chunk.verifiedAt}
      </p>
    </>
  );
}

function RecommendExample() {
  const rejected = COMPAT_CHECKS.find((c) => c.verdict === "reject");
  return (
    <>
      <p className="text-fg">
        {RECOMMEND_COUNTS.candidates} candidate stacks → {RECOMMEND_COUNTS.rejected} rejected →{" "}
        {RECOMMEND_COUNTS.feasible} ranked
      </p>
      {rejected ? (
        <p className="mt-2 text-fg-2">
          {rejected.subject}: <span className="text-signal">{rejected.detail}</span>
        </p>
      ) : null}
    </>
  );
}

function CompareExample() {
  const lines = RECEIPT_SCENARIO.lines.filter((l) => l.allowance);
  return (
    <>
      {lines.map((l) => (
        <Row key={l.short} cells={[l.short, `${l.units} ${l.unit}`, `${l.allowance} → $${padDecimal(l.amount)}`]} />
      ))}
      <p className="mt-3 text-fg-2">Decimal arithmetic end to end. An unknown price leaves the total open.</p>
    </>
  );
}

function BundleExample() {
  return (
    <>
      {ENV_TRACES.slice(0, 3).map((t) => (
        <Row key={t.key} cells={[t.key, `${t.path}:${t.line}`, t.secret ? "secret · placeholder only" : t.role]} />
      ))}
    </>
  );
}

const EXAMPLES: Record<string, () => ReactNode> = {
  profile: ProfileExample,
  retrieve: RetrieveExample,
  recommend: RecommendExample,
  compare: CompareExample,
  bundle: BundleExample,
};

export function HowItWorks() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Section id="how" labelledBy="how-title">
      <SectionHead
        id="how-title"
        title="Five tools, one pass."
        lede="Each step is an MCP tool your coding agent can call. Open one to see real output from the repository fixtures."
      />
      <ol className="mt-14 border-t border-hairline lg:mt-20">
        {STEPS.map((s) => {
          const isOpen = open === s.id;
          const Example = EXAMPLES[s.id];
          return (
            <li key={s.id} className="border-b border-hairline">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`step-${s.id}`}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="group grid min-h-11 w-full grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] items-baseline gap-x-3 py-6 text-left lg:grid-cols-[3rem_9rem_minmax(0,1fr)_auto_2.75rem] lg:gap-x-4"
                >
                  <span className="font-mono text-[14px] text-fg-2">{s.index}</span>
                  <span className="display text-[1.875rem] leading-none text-fg sm:text-[2.125rem]">{s.verb}</span>
                  <span className="col-start-2 mt-2 text-[16px] leading-snug text-fg-2 transition-colors group-hover:text-fg lg:col-start-auto lg:mt-0 lg:text-[17px]">
                    {s.line}
                  </span>
                  <span className="col-start-2 mt-2 font-mono text-[13px] text-fg-2 lg:col-start-auto lg:mt-0">
                    {s.tool}
                  </span>
                  <span
                    aria-hidden
                    className="col-start-3 row-start-1 flex size-11 items-center justify-center self-center justify-self-end rounded-ui text-fg-2 transition-colors group-hover:text-fg lg:col-start-auto lg:row-start-auto"
                  >
                    <Plus
                      className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "rotate-45" : ""}`}
                    />
                  </span>
                </button>
              </h3>
              <div
                id={`step-${s.id}`}
                role="region"
                aria-label={`${s.verb} example`}
                hidden={!isOpen}
                className="pb-8 font-mono text-[14px] leading-relaxed"
              >
                <div className="ml-[calc(2.25rem+0.75rem)] border-l border-hairline-strong pl-5 lg:ml-[calc(3rem+1rem)]">
                  <Example />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
