"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMedia } from "@/lib/use-media";
import { Receipt } from "./receipt";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";
import { useInView, useSceneTier } from "./three/use-scene-support";

const ReceiptScene = dynamic(() => import("./three/receipt-scene"), { ssr: false });

const MIN_PRINT_MS = 1500;

function usePrinted(reduce: boolean): boolean {
  const [printed, setPrinted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPrinted(true), reduce ? 0 : MIN_PRINT_MS);
    return () => clearTimeout(id);
  }, [reduce]);
  return printed;
}

export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const tier = useSceneTier();
  const wide = useMedia("(min-width: 1024px)");
  const [stageRef, inView] = useInView<HTMLDivElement>("0px");
  const [sceneReady, setSceneReady] = useState(false);
  const printed = usePrinted(reduce);
  const onReady = useCallback(() => setSceneReady(true), []);
  const use3d = tier === "full" && wide;
  const show3d = use3d && sceneReady && printed;

  return (
    <section id="top" aria-labelledby="hero-title" className="gutter overflow-x-clip">
      <div className="grid items-center gap-14 pt-16 pb-20 lg:min-h-[min(calc(100svh-4rem),56rem)] lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10 lg:py-16">
        <div className="max-w-[40rem]">
          <h1
            id="hero-title"
            className="display enter text-[3.25rem] leading-[0.98] text-fg sm:text-[4.5rem] lg:text-[3.875rem] xl:text-[4.5rem]"
          >
            Stop guessing.
            <br />
            Design infrastructure around your <em className="italic">workload</em>.
          </h1>
          <p
            className="enter mt-7 max-w-[34rem] text-[18px] leading-relaxed text-fg-2 sm:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            An MCP server for your coding agent. It profiles your project, rejects services that won’t work, prices
            every line item exactly, and prepares setup files you review before anything ships.
          </p>
          <div className="enter mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "220ms" }}>
            <a href="#how" className={`group ${BUTTON_PRIMARY}`}>
              Explore the workflow
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </a>
            <a href="#connect" className={BUTTON_SECONDARY}>
              Connect your MCP
            </a>
          </div>
          <p className="enter mt-8 text-[15px] text-fg-2" style={{ animationDelay: "320ms" }}>
            <span className="whitespace-nowrap">Local-first</span> ·{" "}
            <span className="whitespace-nowrap">No cloud credentials</span> ·{" "}
            <span className="whitespace-nowrap">Any stdio MCP client</span>
          </p>
        </div>

        <div
          ref={stageRef}
          className="relative mx-auto flex w-full max-w-[25rem] justify-center lg:h-[42rem] lg:items-center"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[-15%] inset-y-[5%] hidden bg-[radial-gradient(closest-side,rgb(237_235_230/0.07),transparent)] lg:block"
          />
          <div
            className={`print-reveal relative w-full max-w-[21rem] transition-opacity duration-500 lg:max-w-[22rem] ${show3d ? "opacity-0" : "opacity-100"}`}
          >
            <Receipt className="max-lg:-rotate-2" />
          </div>
          {use3d ? (
            <div
              className={`absolute inset-y-0 -inset-x-10 transition-opacity duration-500 ${show3d ? "opacity-100" : "opacity-0"}`}
            >
              <ReceiptScene reduced={reduce} active={inView} onReady={onReady} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
