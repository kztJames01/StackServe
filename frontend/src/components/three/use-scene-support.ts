"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type SceneTier = "pending" | "none" | "lite" | "full";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useSceneTier(): SceneTier {
  const [tier, setTier] = useState<SceneTier>("pending");
  useEffect(() => {
    const decide = () => {
      if (!hasWebGL()) return "none" as const;
      const small = window.matchMedia("(max-width: 767px)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      return small || coarse ? ("lite" as const) : ("full" as const);
    };
    const id = requestAnimationFrame(() => setTier(decide()));
    return () => cancelAnimationFrame(id);
  }, []);
  return tier;
}

export function useSeenOnce<T extends Element>(margin = "600px"): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, seen]);
  return [ref, seen];
}

export function useInView<T extends Element>(margin = "200px"): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView];
}
