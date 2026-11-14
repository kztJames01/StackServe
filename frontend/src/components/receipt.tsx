import { Fragment } from "react";
import { RECEIPT } from "@/lib/receipt";

export function Receipt({ className = "" }: { className?: string }) {
  return (
    <figure
      aria-label={`Example estimate for ${RECEIPT.workload}`}
      className={`paper-light torn-bottom w-full max-w-[22rem] px-6 pt-7 pb-9 font-mono text-[13px] leading-[1.5] text-paper-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] ${className}`}
    >
      <div className="text-center">
        <p className="text-[15px] font-semibold tracking-[0.3em]">{RECEIPT.brand}</p>
        <p className="mt-1">{RECEIPT.workload}</p>
        <p className="text-[#4a4945]">{RECEIPT.catalog}</p>
      </div>
      <hr className="my-4 border-0 border-t border-dashed border-paper-ink/40" />
      <ul>
        {RECEIPT.rows.map((r) => (
          <li key={r.name} className="flex items-baseline justify-between gap-3 py-[3px]">
            <span>
              {r.name} <span className="text-[#4a4945]">· {r.qty}</span>
            </span>
            <span className="tabular-nums">{r.amount}</span>
          </li>
        ))}
      </ul>
      <hr className="mt-4 mb-3 border-0 border-t-[3px] border-double border-paper-ink/70" />
      <p className="flex items-baseline justify-between gap-3 font-semibold">
        <span>{RECEIPT.totalLabel}</span>
        <span className="text-[15px] tabular-nums">{RECEIPT.total}</span>
      </p>
      <p className="mt-0.5 text-[#4a4945]">{RECEIPT.role}</p>
      <p className="mt-4 bg-signal px-2 py-1.5 text-paper-ink">{RECEIPT.cliff}</p>
      <figcaption className="mt-6 text-center">
        <span className="inline-block -rotate-3 border-[3px] border-double border-paper-ink/80 px-3 py-1.5 font-semibold tracking-[0.08em]">
          {RECEIPT.stamp}
        </span>
        <span className="mt-5 block text-[12px] text-[#4a4945]">
          {RECEIPT.footer.split(" · ").map((part, i) => (
            <Fragment key={part}>
              {i > 0 ? " · " : null}
              <span className="whitespace-nowrap">{part}</span>
            </Fragment>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
