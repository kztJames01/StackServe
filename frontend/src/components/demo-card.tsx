import {
  BUNDLE_FILES,
  COMPARED_STACKS,
  DOC_CHUNKS,
  PROFILE_REQUIREMENTS,
  RECOMMEND_COUNTS,
  SCENARIO_LABELS,
  padDecimal,
} from "@/lib/data";

const MUTE = "text-[#4a4945]";

function ProfileCard() {
  return (
    <ul>
      {PROFILE_REQUIREMENTS.slice(0, 8).map((r) => (
        <li key={r.field} className="flex justify-between gap-3 py-[2px]">
          <span className={r.value === null ? MUTE : ""}>
            {r.field} <span className={MUTE}>{r.value ?? "unknown"}</span>
          </span>
          <span className={MUTE}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

function RetrieveCard() {
  return (
    <ul className="space-y-2">
      {DOC_CHUNKS.map((c) => (
        <li key={c.id}>
          <span className="font-semibold">{c.heading}</span>
          <span className={`block ${MUTE}`}>
            {c.provider} · verified {c.verifiedAt}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecommendCard() {
  return (
    <div className="space-y-2">
      <p className="font-semibold">{RECOMMEND_COUNTS.candidates} candidate stacks</p>
      <p className="bg-signal px-2 py-1 font-semibold">{RECOMMEND_COUNTS.rejected} rejected before ranking</p>
      <p className="font-semibold">{RECOMMEND_COUNTS.feasible} feasible, then ranked</p>
    </div>
  );
}

function CompareCard() {
  return (
    <table className="w-full">
      <thead>
        <tr className={MUTE}>
          <th scope="col" className="pb-1 text-left font-normal">
            Scenario
          </th>
          <th scope="col" className="pb-1 text-right font-normal">
            Neon Free
          </th>
          <th scope="col" className="pb-1 text-right font-normal">
            Neon Launch
          </th>
        </tr>
      </thead>
      <tbody>
        {COMPARED_STACKS[0].scenarios.map((sc, s) => (
          <tr key={sc.id}>
            <th scope="row" className="py-[2px] text-left font-normal">
              {SCENARIO_LABELS[sc.id]}
            </th>
            {COMPARED_STACKS.map((stack) => {
              const cell = stack.scenarios[s];
              return (
                <td key={stack.id} className="py-[2px] text-right tabular-nums">
                  {cell.rejection ? (
                    <span className="line-through decoration-signal decoration-2">
                      <span className="sr-only">rejected, </span>${padDecimal(cell.total)}
                    </span>
                  ) : (
                    `$${padDecimal(cell.total)}`
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BundleCard() {
  return (
    <ul>
      {BUNDLE_FILES.map((f) => (
        <li key={f.name} className="py-[2px]">
          {f.name}
        </li>
      ))}
    </ul>
  );
}

const CARDS: Record<string, () => React.ReactNode> = {
  profile: ProfileCard,
  retrieve: RetrieveCard,
  recommend: RecommendCard,
  compare: CompareCard,
  bundle: BundleCard,
};

export function DemoCard({ chapterId }: { chapterId: string }) {
  const Card = CARDS[chapterId];
  return (
    <div className="paper-light w-full max-w-[24rem] px-5 py-5 font-mono text-[13px] leading-[1.55] text-paper-ink shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]">
      {Card ? <Card /> : null}
    </div>
  );
}
