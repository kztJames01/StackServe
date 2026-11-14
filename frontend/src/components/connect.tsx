"use client";

import { useState } from "react";
import { AGENT_ENVS, BUILD_SNIPPET } from "@/lib/agents";
import { CopyButton, Section, SectionHead, useTabKeys } from "./ui";

const tabId = (i: number) => `env-tab-${i}`;

export function Connect() {
  const [active, setActive] = useState(0);
  const env = AGENT_ENVS[active];
  const onKey = useTabKeys(AGENT_ENVS.length, setActive, tabId);

  return (
    <Section id="connect" labelledBy="connect-title">
      <SectionHead
        id="connect-title"
        title="Works where you already code."
        lede="Connect directly to https://mcp.stackserve.net/mcp with zero local build, or install the offline CLI."
      />

      <div className="mt-12 flex flex-col gap-3 border-y border-hairline py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-[16px] text-fg-2">
          <span className="text-fg">Prefer offline local execution?</span> Install{" "}
          <span className="font-mono text-[14px] text-fg">stackserve-mcp</span> onto your{" "}
          <span className="font-mono text-[14px]">$PATH</span> or run the GHCR container with{" "}
          <span className="font-mono text-[14px] whitespace-nowrap text-fg">--network none</span>.
        </p>
        <CopyButton text={BUILD_SNIPPET.code} label="Copy cargo install" />
      </div>

      <div
        role="tablist"
        aria-label="Coding tool"
        className="no-scrollbar mt-10 flex gap-1 overflow-x-auto border-b border-hairline"
      >
        {AGENT_ENVS.map((e, i) => {
          const selected = i === active;
          return (
            <button
              key={e.id}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="env-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(ev) => onKey(ev, i)}
              className={`-mb-px h-12 shrink-0 border-b-2 px-4 text-[15px] whitespace-nowrap transition-colors ${
                selected ? "border-fg text-fg" : "border-transparent text-fg-2 hover:text-fg"
              }`}
            >
              {e.name}
            </button>
          );
        })}
      </div>

      <div
        id="env-panel"
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="mt-8 overflow-hidden rounded-ui border border-hairline-strong bg-raised"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline py-1 pr-1 pl-5">
          <span className="truncate font-mono text-[13px] text-fg-2">{env.snippet.file ?? env.snippet.label}</span>
          <CopyButton text={env.snippet.code} />
        </div>
        <div className="relative">
          <pre className="overflow-x-auto p-5 font-mono text-[14px] leading-relaxed text-fg">
            <code>{env.snippet.code}</code>
          </pre>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-raised to-transparent lg:hidden"
          />
        </div>
      </div>
      <p className="mt-5 text-[15px] text-fg-2">
        Remote HTTP connects to <span className="font-mono text-fg">https://mcp.stackserve.net/mcp</span> with no
        local build required.
      </p>
    </Section>
  );
}
