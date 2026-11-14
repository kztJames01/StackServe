import { ArrowRight } from "lucide-react";
import { REPO_URL } from "@/lib/data";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";

const PROMISES = [
  { title: "Exact decimal pricing.", body: "Every charge is computed with decimals in Rust, never floating point." },
  { title: "Sources on every fact.", body: "Each price and limit carries its provider URL and checked date." },
  { title: "Runs on your machine.", body: "No cloud credentials, no billing access, no telemetry." },
  { title: "Prepares, never deploys.", body: "You get files to review. Provisioning stays in your hands." },
];

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="border-t border-hairline">
      <div className="gutter section-pad">
        <h2 id="closing-title" className="display max-w-[40rem] text-[2.5rem] leading-[1.02] sm:text-[3.25rem]">
          Audit the bill before you <em className="italic">buy</em>.
        </h2>
        <ul className="mt-12 border-t border-hairline">
          {PROMISES.map((p) => (
            <li
              key={p.title}
              className="grid gap-1 border-b border-hairline py-5 text-[17px] sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
            >
              <span className="text-fg">{p.title}</span>
              <span className="text-fg-2">{p.body}</span>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={`group ${BUTTON_PRIMARY}`}>
            Run StackServe locally
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </a>
          <a href="#how" className={BUTTON_SECONDARY}>
            Explore the workflow
          </a>
        </div>
      </div>
    </section>
  );
}
