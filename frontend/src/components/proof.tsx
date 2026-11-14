"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import {
  CATALOG_VERSION,
  COMPARED_STACKS,
  RECEIPT_WORKLOAD,
  SCENARIO_LABELS,
  padDecimal,
  type ComparedStack,
  type ScenarioId,
} from "@/lib/data";
import { Section, SectionHead, useTabKeys } from "./ui";

const SCENARIOS = Object.keys(SCENARIO_LABELS) as ScenarioId[];
const tabId = (i: number) => `scenario-tab-${i}`;

function splitRejection(text: string): { code: string; reason: string } {
  const [code, reason = ""] = text.split(" — ");
  return { code, reason };
}

const MUTE = "text-[#4a4945]";

function LineItems({ stack, scenario }: { stack: ComparedStack; scenario: ScenarioId }) {
  const sc = stack.scenarios.find((s) => s.id === scenario);
  if (!sc) return null;
  return (
    <table className="mt-4 w-full text-[13px]">
      <caption className="sr-only">Line items for {stack.name}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Usage</th>
          <th scope="col">USD</th>
        </tr>
      </thead>
      <tbody>
        {sc.lines.map((l) => (
          <tr key={l.label}>
            <td className="py-[3px] pr-3">{l.short}</td>
            <td className={`py-[3px] pr-3 ${MUTE}`}>
              {l.units} {l.unit}
            </td>
            <td className="py-[3px] text-right tabular-nums">{padDecimal(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StackReceipt({
  stack,
  index,
  scenario,
  showLines,
}: {
  stack: ComparedStack;
  index: number;
  scenario: ScenarioId;
  showLines: boolean;
}) {
  const sc = stack.scenarios.find((s) => s.id === scenario);
  if (!sc) return null;
  const rejected = sc.rejection ? splitRejection(sc.rejection) : null;
  return (
    <div className="flex h-full flex-col px-6 pt-7 pb-8 font-mono sm:px-8">
      <p className={`text-[13px] ${MUTE}`}>{stack.role}</p>
      <p className="mt-1 text-[15px] font-semibold">{stack.name}</p>
      <div id={`items-${index}`} hidden={!showLines}>
        <hr className="mt-4 border-0 border-t border-dashed border-paper-ink/40" />
        <LineItems stack={stack} scenario={scenario} />
      </div>
      <div className="mt-auto">
        <hr className="mt-5 mb-4 border-0 border-t-[3px] border-double border-paper-ink/70" />
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold">KNOWN TOTAL</span>
          <span className="text-[2rem] leading-none tracking-[-0.03em] tabular-nums sm:text-[2.5rem]">
            <span
              key={`${scenario}-${sc.total}`}
              className={`enter inline-block font-semibold [animation-duration:300ms] ${
                rejected ? "line-through decoration-signal decoration-4" : ""
              }`}
            >
              ${padDecimal(sc.total)}
            </span>
            <span className={`ml-1.5 text-[14px] tracking-normal ${MUTE}`}>/ mo</span>
          </span>
        </p>
        <div className="mt-5 min-h-[4.5rem] text-[13px] leading-snug">
          {rejected ? (
            <p className="bg-signal px-3 py-2">
              <span className="font-semibold">Rejected.</span> {rejected.reason}.
              <span className="mt-0.5 block">{rejected.code}</span>
            </p>
          ) : (
            <p className={MUTE}>Feasible in this scenario.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Proof() {
  const [active, setActive] = useState(0);
  const [showLines, setShowLines] = useState(false);
  const scenario = SCENARIOS[active];
  const onKey = useTabKeys(SCENARIOS.length, setActive, tabId);
  const select = useCallback((i: number) => setActive(i), []);

  return (
    <Section id="proof" labelledBy="proof-title">
      <SectionHead
        id="proof-title"
        title={
          <>
            The cheapest stack isn’t always one you can <em className="italic">use</em>.
          </>
        }
        lede={
          <>
            Two feasible stacks for the same Node app, <span className="font-mono text-[15px]">{RECEIPT_WORKLOAD}</span>
            , priced from catalog {CATALOG_VERSION}. Grow the workload and watch the free database hit its limit.
          </>
        }
      />

      <div
        role="tablist"
        aria-label="Workload scenario"
        className="no-scrollbar mt-12 flex gap-1 overflow-x-auto border-b border-hairline"
      >
        {SCENARIOS.map((id, i) => {
          const selected = i === active;
          return (
            <button
              key={id}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="scenario-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKey(e, i)}
              className={`-mb-px h-12 shrink-0 border-b-2 px-4 text-[15px] whitespace-nowrap transition-colors ${
                selected ? "border-fg text-fg" : "border-transparent text-fg-2 hover:text-fg"
              }`}
            >
              {SCENARIO_LABELS[id]}
            </button>
          );
        })}
      </div>

      <div id="scenario-panel" role="tabpanel" aria-labelledby={tabId(active)} className="mt-10">
        <div className="paper-light torn-bottom grid text-paper-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] md:grid-cols-2">
          {COMPARED_STACKS.map((stack, i) => (
            <div
              key={stack.id}
              className={
                i > 0 ? "h-full border-t-2 border-dashed border-paper-ink/30 md:border-t-0 md:border-l-2" : "h-full"
              }
            >
              <StackReceipt stack={stack} index={i} scenario={scenario} showLines={showLines} />
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={showLines}
          aria-controls="items-0 items-1"
          onClick={() => setShowLines((v) => !v)}
          className="mt-4 flex h-12 items-center gap-2 rounded-ui px-2 text-left text-[15px] text-fg-2 transition-colors hover:text-fg"
        >
          <ChevronDown
            className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${showLines ? "rotate-180" : ""}`}
            aria-hidden
          />
          {showLines ? "Hide line items" : "See line items"}
        </button>
      </div>
    </Section>
  );
}
