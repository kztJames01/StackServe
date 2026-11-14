"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export function Section({
  id,
  labelledBy,
  children,
  className = "",
}: {
  id?: string;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`border-t border-hairline ${className}`}>
      <div className="gutter section-pad">{children}</div>
    </section>
  );
}

export function SectionHead({ id, title, lede }: { id: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className="max-w-[46rem]">
      <h2 id={id} className="display text-[2.5rem] leading-[1.02] text-fg sm:text-[3.25rem] lg:text-[3.75rem]">
        {title}
      </h2>
      {lede ? <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-fg-2">{lede}</p> : null}
    </header>
  );
}

export function useTabKeys(count: number, setIndex: (i: number) => void, idFor: (i: number) => string) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>, current: number) => {
      const map: Record<string, number> = {
        ArrowRight: (current + 1) % count,
        ArrowDown: (current + 1) % count,
        ArrowLeft: (current - 1 + count) % count,
        ArrowUp: (current - 1 + count) % count,
        Home: 0,
        End: count - 1,
      };
      const next = map[e.key];
      if (next === undefined) return;
      e.preventDefault();
      setIndex(next);
      document.getElementById(idFor(next))?.focus();
    },
    [count, setIndex, idFor],
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-ui px-3 text-[14px] text-fg-2 transition-colors hover:bg-white/[0.04] hover:text-fg"
    >
      {copied ? <Check className="size-4 text-fg" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
