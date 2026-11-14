import * as THREE from "three";

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const HEX = {
  ink: "#0B0B0C",
  raised: "#131315",
  body: "#1A1A1D",
  edge: "#3A3936",
  mute: "#5C5A56",
  paper: "#EDEBE6",
  signal: "#FF5A36",
} as const;

export const COLORS = {
  ink: new THREE.Color(HEX.ink),
  body: new THREE.Color(HEX.body),
  edge: new THREE.Color(HEX.edge),
  mute: new THREE.Color(HEX.mute),
  paper: new THREE.Color(HEX.paper),
  signal: new THREE.Color(HEX.signal),
};
