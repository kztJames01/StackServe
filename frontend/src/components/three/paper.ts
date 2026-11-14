import * as THREE from "three";
import { seeded } from "./shared";

export const PAPER = "#EDEBE6";
export const INK = "#111111";
export const MUTE = "#4a4945";
export const SIGNAL = "#FF5A36";

export type Ctx = CanvasRenderingContext2D;

export function monoFamily(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return value || "ui-monospace, monospace";
}

export async function fontsReady(family: string): Promise<void> {
  await Promise.all([
    document.fonts.load(`400 36px ${family}`),
    document.fonts.load(`600 36px ${family}`),
    document.fonts.load(`700 36px ${family}`),
  ]).catch(() => undefined);
  await document.fonts.ready;
}

export function font(family: string, size: number, weight = 400): string {
  return `${weight} ${size}px ${family}`;
}

export function fitFont(ctx: Ctx, family: string, text: string, size: number, maxWidth: number, weight = 400) {
  let s = size;
  ctx.font = font(family, s, weight);
  while (s > 14 && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = font(family, s, weight);
  }
  return s;
}

export function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

export function paperCanvas(width: number, height: number, seed = 3): [HTMLCanvasElement, Ctx] | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  const rand = seeded(seed);
  const specks = Math.round((width * height) / 260);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(rand() * 0.035).toFixed(3)})`;
    ctx.fillRect(rand() * width, rand() * height, 2, 2);
  }
  ctx.textBaseline = "alphabetic";
  return [canvas, ctx];
}

export function rule(ctx: Ctx, x0: number, x1: number, y: number, dashed = true, alpha = 0.45) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3;
  ctx.setLineDash(dashed ? [12, 9] : []);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

export function band(ctx: Ctx, family: string, text: string, x: number, y: number, w: number, size: number) {
  const h = Math.round(size * 1.9);
  ctx.fillStyle = SIGNAL;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  fitFont(ctx, family, text, size, w - size, 600);
  ctx.fillText(text, x + size * 0.5, y + h * 0.66);
  return h;
}

export function toTexture(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}
