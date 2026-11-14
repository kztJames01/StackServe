import { RECEIPT } from "@/lib/receipt";
import { seeded } from "./shared";

export const RECEIPT_TEX = { width: 1200, height: 1880 } as const;

const PAPER = "#EDEBE6";
const INK = "#111111";
const MUTE = "#4a4945";
const SIGNAL = "#FF5A36";
const MARGIN = 92;
const TEAR = 30;

type Ctx = CanvasRenderingContext2D;

function font(family: string, size: number, weight = 400): string {
  return `${weight} ${size}px ${family}`;
}

function fitFont(ctx: Ctx, family: string, text: string, size: number, maxWidth: number, weight = 400): number {
  let s = size;
  ctx.font = font(family, s, weight);
  while (s > 18 && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = font(family, s, weight);
  }
  return s;
}

function paperPath(ctx: Ctx) {
  const { width: w, height: h } = RECEIPT_TEX;
  const tooth = 40;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h - TEAR);
  for (let x = w; x > 0; x -= tooth) {
    ctx.lineTo(x - tooth / 2, h);
    ctx.lineTo(x - tooth, h - TEAR);
  }
  ctx.closePath();
}

function grain(ctx: Ctx) {
  const rand = seeded(11);
  const { width: w, height: h } = RECEIPT_TEX;
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(rand() * 0.035).toFixed(3)})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
}

function rule(ctx: Ctx, y: number, dashed: boolean) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = dashed ? 0.45 : 0.75;
  ctx.lineWidth = 3;
  ctx.setLineDash(dashed ? [14, 10] : []);
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(RECEIPT_TEX.width - MARGIN, y);
  ctx.stroke();
  ctx.restore();
}

function header(ctx: Ctx, family: string) {
  const cx = RECEIPT_TEX.width / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = font(family, 58, 600);
  ctx.letterSpacing = "18px";
  ctx.fillText(RECEIPT.brand, cx + 9, 160);
  ctx.letterSpacing = "0px";
  ctx.font = font(family, 38);
  ctx.fillText(RECEIPT.workload, cx, 238);
  ctx.fillStyle = MUTE;
  ctx.font = font(family, 34);
  ctx.fillText(RECEIPT.catalog, cx, 290);
}

function rows(ctx: Ctx, family: string): number {
  const right = RECEIPT_TEX.width - MARGIN;
  let y = 440;
  for (const r of RECEIPT.rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = font(family, 44);
    ctx.fillText(r.name, MARGIN, y);
    const nameWidth = ctx.measureText(r.name).width;
    ctx.fillStyle = MUTE;
    ctx.font = font(family, 34);
    ctx.fillText(` · ${r.qty}`, MARGIN + nameWidth, y);
    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    ctx.font = font(family, 44);
    ctx.fillText(r.amount, right, y);
    y += 92;
  }
  return y;
}

function total(ctx: Ctx, family: string, top: number) {
  const right = RECEIPT_TEX.width - MARGIN;
  rule(ctx, top, false);
  rule(ctx, top + 12, false);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = font(family, 40, 600);
  ctx.fillText(RECEIPT.totalLabel, MARGIN, top + 100);
  ctx.textAlign = "right";
  ctx.font = font(family, 50, 600);
  ctx.fillText(RECEIPT.total, right, top + 102);
  ctx.textAlign = "left";
  ctx.fillStyle = MUTE;
  ctx.font = font(family, 32);
  ctx.fillText(RECEIPT.role, MARGIN, top + 156);
}

function cliff(ctx: Ctx, family: string, top: number) {
  const width = RECEIPT_TEX.width - MARGIN * 2;
  ctx.fillStyle = SIGNAL;
  ctx.fillRect(MARGIN, top, width, 150);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  const [head, detail] = RECEIPT.cliffLines;
  fitFont(ctx, family, head, 46, width - 56, 600);
  ctx.fillText(head, MARGIN + 28, top + 68);
  ctx.font = font(family, 46, 600);
  ctx.fillText(detail, MARGIN + 28, top + 128);
}

function stamp(ctx: Ctx, family: string, cy: number) {
  const cx = RECEIPT_TEX.width / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.06);
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  const size = fitFont(ctx, family, RECEIPT.stamp, 50, 820, 700);
  const w = ctx.measureText(RECEIPT.stamp).width + 80;
  const h = size + 64;
  ctx.lineWidth = 6;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
  ctx.fillText(RECEIPT.stamp, 2, size * 0.36);
  ctx.restore();
  ctx.letterSpacing = "0px";
}

export function paintReceipt(canvas: HTMLCanvasElement, family: string): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = RECEIPT_TEX.width;
  canvas.height = RECEIPT_TEX.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  paperPath(ctx);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.clip();
  grain(ctx);
  ctx.textBaseline = "alphabetic";
  header(ctx, family);
  rule(ctx, 360, true);
  const end = rows(ctx, family);
  total(ctx, family, end - 20);
  rule(ctx, end + 200, true);
  cliff(ctx, family, end + 250);
  stamp(ctx, family, end + 570);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTE;
  ctx.font = font(family, 30);
  ctx.fillText(RECEIPT.footer, RECEIPT_TEX.width / 2, end + 770);
  ctx.restore();
  return true;
}
