"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { ChevronDown, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAPTER_SECONDS, DEMO_CHAPTERS, DEMO_TOTAL } from "@/lib/demo";
import { STEPS } from "@/lib/data";
import { useMedia } from "@/lib/use-media";
import { DemoCard } from "./demo-card";
import { Section, SectionHead } from "./ui";
import { useInView, useSceneTier, useSeenOnce } from "./three/use-scene-support";

const DemoScene = dynamic(() => import("./three/demo-scene"), { ssr: false });

const SETTLED = CHAPTER_SECONDS * 0.87;
const END = DEMO_TOTAL - 0.01;

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

const span = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-ui text-fg transition-colors hover:bg-white/[0.05]";

function usePlayback(inView: boolean, reduce: boolean) {
  const timeRef = useRef(0);
  const [uiTime, setUiTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const autoStarted = useRef(false);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (reduce && timeRef.current === 0) {
      timeRef.current = SETTLED;
      const id = requestAnimationFrame(() => setUiTime(timeRef.current));
      return () => cancelAnimationFrame(id);
    }
  }, [reduce]);

  useEffect(() => {
    if (inView && !autoStarted.current && !reduce) {
      autoStarted.current = true;
      const id = requestAnimationFrame(() => setPlaying(true));
      return () => cancelAnimationFrame(id);
    }
  }, [inView, reduce]);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let last: number | null = null;
    let lastUi = 0;
    const loop = (now: number) => {
      if (last !== null && playingRef.current) {
        timeRef.current += Math.min(0.1, (now - last) / 1000);
        if (timeRef.current >= END) {
          timeRef.current = END;
          playingRef.current = false;
          setPlaying(false);
        }
      }
      last = now;
      if (now - lastUi > 90) {
        lastUi = now;
        setUiTime(timeRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const seek = useCallback((t: number) => {
    timeRef.current = Math.min(END, Math.max(0, t));
    setUiTime(timeRef.current);
  }, []);

  const toggle = useCallback(() => {
    if (!playingRef.current && timeRef.current >= END - 0.05) seek(0);
    setPlaying((p) => !p);
  }, [seek]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
  }, []);

  return { timeRef, uiTime, playing, seek, toggle, pause };
}

function Timeline({ uiTime, onSeek, label }: { uiTime: number; onSeek: (t: number) => void; label: string }) {
  return (
    <div className="relative h-11 min-w-0 flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 gap-1" aria-hidden>
        {DEMO_CHAPTERS.map((c, i) => {
          const fill = Math.min(1, Math.max(0, (uiTime - i * CHAPTER_SECONDS) / CHAPTER_SECONDS));
          return (
            <div key={c.id} className="h-[3px] flex-1 overflow-hidden bg-hairline-strong">
              <div className="h-full bg-fg" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>
      <input
        type="range"
        min={0}
        max={DEMO_TOTAL}
        step={0.1}
        value={uiTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Demo timeline"
        aria-valuetext={label}
        className="relative h-11 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-1 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-fg [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-fg"
      />
    </div>
  );
}

function useChipScroll(chapter: number) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.children[chapter] as HTMLElement | undefined;
    if (!list || !chip) return;
    const left = chip.offsetLeft - list.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [chapter]);
  return listRef;
}

export function DemoPlayer() {
  const reduce = useReducedMotion() ?? false;
  const tier = useSceneTier();
  const wide = useMedia("(min-width: 640px)");
  const [frameRef, inView] = useInView<HTMLDivElement>("0px");
  const [sectionRef, near] = useSeenOnce<HTMLDivElement>();
  const { timeRef, uiTime, playing, seek, toggle, pause } = usePlayback(inView, reduce);
  const [showOutput, setShowOutput] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  const chapter = Math.min(DEMO_CHAPTERS.length - 1, Math.floor(uiTime / CHAPTER_SECONDS));
  const u = (uiTime - chapter * CHAPTER_SECONDS) / CHAPTER_SECONDS;
  const ch = DEMO_CHAPTERS[chapter];
  const typed = Math.round(span(u, 0, 0.14) * ch.command.length);
  const shownLines = Math.ceil(span(u, 0.16, 0.75) * ch.output.length);
  const webgl = (tier === "full" || tier === "lite") && near && wide;
  const showScene = webgl && sceneReady;
  const counter = `${String(chapter + 1).padStart(2, "0")} / ${String(DEMO_CHAPTERS.length).padStart(2, "0")}`;
  const chipsRef = useChipScroll(chapter);

  const goTo = (i: number) => {
    pause();
    seek(i * CHAPTER_SECONDS + SETTLED);
  };

  return (
    <Section id="demo" labelledBy="demo-title">
      <div ref={sectionRef}>
        <SectionHead
          id="demo-title"
          title="Watch one project go from brief to bundle."
          lede="Five chapters, 35 seconds. Scrub it like a video."
        />

        <div className="mt-12 overflow-hidden rounded-ui border border-hairline-strong">
          <div
            ref={frameRef}
            className="relative flex min-h-[22rem] items-center justify-center bg-ink px-5 pt-16 pb-8 sm:aspect-video sm:min-h-0 sm:p-0"
          >
            <div
              className={`transition-opacity duration-300 sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center ${showScene ? "opacity-0" : "opacity-100"}`}
              aria-hidden={showScene}
            >
              <DemoCard chapterId={ch.id} />
            </div>
            {webgl ? (
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${showScene ? "opacity-100" : "opacity-0"}`}
              >
                <DemoScene time={timeRef} chapter={chapter} reduced={reduce} active={inView} onReady={onReady} />
              </div>
            ) : null}
            <p className="pointer-events-none absolute top-4 right-5 left-5 font-mono text-[12px] text-fg-2">
              recorded fixture output · nothing runs in your browser
            </p>
          </div>

          <div className="border-t border-hairline px-5 py-5 sm:px-8" aria-live="polite">
            <p className="font-mono text-[13px] text-fg-2">{counter}</p>
            <p className="display mt-1 max-w-[40rem] text-[1.375rem] leading-[1.2] text-fg sm:text-[1.75rem]">
              {ch.caption}
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-hairline px-2 sm:px-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause demo" : "Play demo"}
              className={ICON_BUTTON}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <button type="button" onClick={() => seek(0)} aria-label="Restart demo" className={ICON_BUTTON}>
              <RotateCcw className="size-4" />
            </button>
            <Timeline
              uiTime={uiTime}
              onSeek={seek}
              label={`${fmt(uiTime)} of ${fmt(DEMO_TOTAL)}, chapter ${chapter + 1}: ${ch.title}`}
            />
            <span className="shrink-0 px-2 font-mono text-[13px] text-fg-2 tabular-nums">
              {fmt(uiTime)} / {fmt(DEMO_TOTAL)}
            </span>
          </div>

          <div
            ref={chipsRef}
            className="no-scrollbar flex overflow-x-auto border-t border-hairline"
            role="group"
            aria-label="Demo chapters"
          >
            {DEMO_CHAPTERS.map((c, i) => {
              const current = i === chapter;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Chapter ${i + 1}: ${c.title}`}
                  className={`flex h-12 min-w-[7rem] flex-1 shrink-0 items-center gap-2 border-r border-hairline px-4 text-[15px] transition-colors last:border-r-0 ${
                    current ? "bg-white/[0.04] text-fg" : "text-fg-2 hover:text-fg"
                  }`}
                >
                  <span className="font-mono text-[12px] text-fg-2">{String(i + 1).padStart(2, "0")}</span>
                  {STEPS[i]?.verb ?? c.title}
                </button>
              );
            })}
          </div>

          <div className="border-t border-hairline">
            <button
              type="button"
              aria-expanded={showOutput}
              aria-controls="demo-output"
              onClick={() => setShowOutput((v) => !v)}
              className="flex h-12 w-full items-center gap-2 px-5 text-left text-[15px] text-fg-2 transition-colors hover:text-fg"
            >
              <ChevronDown
                className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${showOutput ? "rotate-180" : ""}`}
                aria-hidden
              />
              {showOutput ? "Hide command output" : "Show command output"}
            </button>
            <div
              id="demo-output"
              hidden={!showOutput}
              className="max-h-72 overflow-auto border-t border-hairline bg-raised px-5 py-4 font-mono text-[13px] leading-relaxed"
            >
              <p className="break-all text-fg">
                <span className="text-fg-2">$ </span>
                {ch.command.slice(0, typed)}
              </p>
              <div className="mt-3 space-y-0.5">
                {ch.output.slice(0, shownLines).map((line, i) => (
                  <p key={`${ch.id}-${i}`} className="wrap-break-word whitespace-pre-wrap text-fg-2">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
