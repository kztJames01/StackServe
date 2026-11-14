import * as THREE from "three";
import {
  BUNDLE_FILES,
  COMPARED_STACKS,
  COMPAT_CHECKS,
  DOC_CHUNKS,
  PROFILE_DEPENDENCIES,
  PROFILE_QUESTIONS,
  PROFILE_REQUIREMENTS,
  RECOMMEND_COUNTS,
  SCENARIO_LABELS,
  padDecimal,
} from "@/lib/data";
import { INK, MUTE, SIGNAL, band, fitFont, font, paperCanvas, rule, toTexture, wrapLines, type Ctx } from "./paper";

export const PX = 1 / 320;
export const STRIP_SCALE = 0.11;
export const BRIEF_FILE = "a-node-postgres-uploads.json";

export type Slip = { tex: THREE.CanvasTexture; w: number; h: number };
export type TicketKind = "candidate" | "rejected" | "feasible" | "low" | "perf";
export type Strip = Slip & { scenario: number; stack: number; rejected: boolean };

export type DemoTextures = {
  files: Slip[];
  requirements: Slip;
  chunks: Slip[];
  tickets: Record<TicketKind, Slip>;
  counter: Slip;
  strips: Strip[];
  sheets: Slip[];
};

type Painter = (ctx: Ctx, w: number, h: number) => void;

function make(width: number, height: number, aniso: number, paint: Painter, seed = 3): Slip | null {
  const made = paperCanvas(width, height, seed);
  if (!made) return null;
  const [canvas, ctx] = made;
  paint(ctx, width, height);
  return { tex: toTexture(canvas, aniso), w: width * PX, h: height * PX };
}

function fileCards(family: string, aniso: number): (Slip | null)[] {
  const constraints = PROFILE_REQUIREMENTS.filter((r) => r.label === "constraint");
  const inferred = PROFILE_REQUIREMENTS.find((r) => r.label === "inference");
  const files = [
    {
      name: BRIEF_FILE,
      line: `${constraints.length} constraints`,
      detail: constraints.map((r) => r.field).join(" · "),
    },
    {
      name: "package.json",
      line: "dependencies",
      detail: PROFILE_DEPENDENCIES.map((d) => `${d.name}@${d.version}`).join(" · "),
    },
    {
      name: inferred?.source?.split(":")[0] ?? "src/uploads.js",
      line: "inference",
      detail: inferred ? `${inferred.field}: ${inferred.value}` : "",
    },
  ];
  return files.map((f, i) =>
    make(
      760,
      330,
      aniso,
      (ctx, w) => {
        ctx.fillStyle = INK;
        ctx.textAlign = "left";
        fitFont(ctx, family, f.name, 48, w - 96, 600);
        ctx.fillText(f.name, 48, 84);
        rule(ctx, 48, w - 48, 122);
        ctx.fillStyle = MUTE;
        ctx.font = font(family, 34);
        ctx.fillText(f.line, 48, 186);
        ctx.fillStyle = INK;
        ctx.font = font(family, 34);
        wrapLines(ctx, f.detail, w - 96)
          .slice(0, 2)
          .forEach((l, k) => ctx.fillText(l, 48, 244 + k * 46));
      },
      10 + i,
    ),
  );
}

function requirementSlip(family: string, aniso: number): Slip | null {
  const rowH = 58;
  const top = 250;
  const height = top + PROFILE_REQUIREMENTS.length * rowH + 260;
  return make(1100, height, aniso, (ctx, w) => {
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.font = font(family, 50, 700);
    ctx.fillText("profile_project", 60, 100);
    ctx.fillStyle = MUTE;
    ctx.font = font(family, 34);
    ctx.fillText(BRIEF_FILE, 60, 152);
    rule(ctx, 60, w - 60, 196);
    PROFILE_REQUIREMENTS.forEach((r, i) => {
      const y = top + i * rowH;
      const unknown = r.value === null;
      ctx.textAlign = "left";
      ctx.font = font(family, 38, unknown ? 400 : 500);
      ctx.fillStyle = unknown ? MUTE : INK;
      ctx.fillText(r.field, 60, y);
      ctx.fillText(r.value ?? "unknown", 540, y);
      ctx.textAlign = "right";
      ctx.fillStyle = MUTE;
      ctx.font = font(family, 34);
      ctx.fillText(r.label, w - 60, y);
    });
    const qTop = top + PROFILE_REQUIREMENTS.length * rowH;
    rule(ctx, 60, w - 60, qTop - 10);
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = font(family, 36, 600);
    ctx.fillText(`${PROFILE_QUESTIONS.length} questions back to you`, 60, qTop + 64);
    ctx.font = font(family, 34);
    ctx.fillStyle = MUTE;
    wrapLines(ctx, `“${PROFILE_QUESTIONS[0]}”`, w - 120).forEach((l, i) => ctx.fillText(l, 60, qTop + 124 + i * 46));
  });
}

function chunkCard(family: string, aniso: number, index: number): Slip | null {
  const c = DOC_CHUNKS[index];
  return make(
    640,
    860,
    aniso,
    (ctx, w, h) => {
      const m = 48;
      ctx.textAlign = "left";
      ctx.fillStyle = MUTE;
      ctx.font = font(family, 30, 600);
      ctx.letterSpacing = "6px";
      ctx.fillText(c.provider.toUpperCase(), m, 78);
      ctx.letterSpacing = "0px";
      ctx.textAlign = "right";
      ctx.font = font(family, 28);
      ctx.fillText(c.documentType, w - m, 78);
      ctx.textAlign = "left";
      ctx.fillStyle = INK;
      ctx.font = font(family, 46, 700);
      const heading = wrapLines(ctx, c.heading, w - m * 2);
      heading.forEach((l, i) => ctx.fillText(l, m, 160 + i * 56));
      const ruleY = 160 + heading.length * 56 - 16;
      rule(ctx, m, w - m, ruleY);
      ctx.font = font(family, 34);
      wrapLines(ctx, c.text, w - m * 2).forEach((l, i) => ctx.fillText(l, m, ruleY + 70 + i * 46));
      rule(ctx, m, w - m, h - 150);
      ctx.fillStyle = INK;
      const url = c.sourceUrl.replace("https://", "");
      fitFont(ctx, family, url, 30, w - m * 2);
      ctx.fillText(url, m, h - 96);
      ctx.fillStyle = MUTE;
      ctx.font = font(family, 28);
      ctx.fillText(`verified ${c.verifiedAt} · ${c.freshness}`, m, h - 48);
    },
    20 + index,
  );
}

function ticket(family: string, aniso: number, kind: TicketKind): Slip | null {
  const label: Record<TicketKind, string> = {
    candidate: "candidate",
    rejected: "REJECTED",
    feasible: "FEASIBLE",
    low: "LOWEST COST",
    perf: "PERFORMANCE",
  };
  return make(
    240,
    136,
    aniso,
    (ctx, w, h) => {
      ctx.textAlign = "center";
      if (kind === "rejected") {
        ctx.fillStyle = SIGNAL;
        ctx.fillRect(0, h * 0.42, w, h * 0.58);
        ctx.fillStyle = INK;
        fitFont(ctx, family, label[kind], 34, w - 24, 700);
        ctx.fillText(label[kind], w / 2, h * 0.82);
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 3;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(24, 30 + i * 18);
          ctx.lineTo(w - 24 - i * 50, 30 + i * 18);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
      }
      if (kind === "candidate") {
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(24, 36 + i * 30);
          ctx.lineTo(w - 24 - (i % 2) * 60, 36 + i * 30);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
      }
      ctx.fillStyle = INK;
      fitFont(ctx, family, label[kind], 34, w - 24, 700);
      ctx.fillText(label[kind], w / 2, h * 0.62);
      if (kind !== "feasible") {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, w - 8, h - 8);
      }
    },
    30,
  );
}

function counterSlip(family: string, aniso: number): Slip | null {
  const example = COMPAT_CHECKS.find((c) => c.verdict === "reject");
  return make(840, 900, aniso, (ctx, w) => {
    const m = 56;
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = font(family, 48, 700);
    ctx.fillText("recommend_stacks", m, 96);
    ctx.fillStyle = MUTE;
    ctx.font = font(family, 32);
    ctx.fillText("node-sporadic.json", m, 146);
    rule(ctx, m, w - m, 186);
    ctx.fillStyle = INK;
    ctx.font = font(family, 40, 600);
    ctx.fillText(`${RECOMMEND_COUNTS.candidates} candidate stacks`, m, 262);
    band(ctx, family, `${RECOMMEND_COUNTS.rejected} rejected before ranking`, m, 300, w - m * 2, 40);
    ctx.fillStyle = INK;
    ctx.font = font(family, 40, 600);
    ctx.fillText(`${RECOMMEND_COUNTS.feasible} feasible, then ranked`, m, 452);
    rule(ctx, m, w - m, 500);
    if (!example) return;
    ctx.fillStyle = MUTE;
    ctx.font = font(family, 32);
    ctx.fillText("for example", m, 566);
    ctx.fillStyle = INK;
    ctx.font = font(family, 34, 600);
    ctx.fillText(example.subject, m, 618);
    ctx.font = font(family, 32);
    wrapLines(ctx, example.detail, w - m * 2).forEach((l, i) => ctx.fillText(l, m, 672 + i * 44));
  });
}

function strips(family: string, aniso: number): Strip[] {
  const names = ["Neon Free", "Neon Launch"];
  const out: Strip[] = [];
  [0, 1, 2].forEach((s) => {
    COMPARED_STACKS.forEach((stack, k) => {
      const sc = stack.scenarios[s];
      const len = Math.round((Number(sc.total) * STRIP_SCALE) / PX);
      const rejected = Boolean(sc.rejection);
      const slip = make(
        320,
        len,
        aniso,
        (ctx, w, h) => {
          ctx.textAlign = "left";
          ctx.fillStyle = MUTE;
          fitFont(ctx, family, SCENARIO_LABELS[sc.id], 30, w - 56);
          ctx.fillText(SCENARIO_LABELS[sc.id], 28, 52);
          ctx.fillStyle = INK;
          ctx.font = font(family, 36, 700);
          ctx.fillText(names[k] ?? stack.name, 28, 100);
          rule(ctx, 28, w - 28, 128);
          const total = `$${padDecimal(sc.total)}`;
          ctx.font = font(family, 46, 700);
          ctx.fillStyle = INK;
          ctx.fillText(total, 28, h - 34);
          if (!rejected) return;
          const tw = ctx.measureText(total).width;
          band(ctx, family, "REJECTED", 0, h - 150, w, 32);
          ctx.strokeStyle = SIGNAL;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(22, h - 50);
          ctx.lineTo(34 + tw, h - 50);
          ctx.stroke();
        },
        40 + s * 2 + k,
      );
      if (slip) out.push({ ...slip, scenario: s, stack: k, rejected });
    });
  });
  return out;
}

function sheet(family: string, aniso: number, index: number): Slip | null {
  const f = BUNDLE_FILES[index];
  return make(
    544,
    748,
    aniso,
    (ctx, w) => {
      const m = 40;
      ctx.textAlign = "left";
      ctx.fillStyle = INK;
      fitFont(ctx, family, f.name, 40, w - m * 2, 700);
      ctx.fillText(f.name, m, 74);
      ctx.fillStyle = MUTE;
      ctx.font = font(family, 28);
      wrapLines(ctx, f.description, w - m * 2).forEach((l, i) => ctx.fillText(l, m, 122 + i * 36));
      rule(ctx, m, w - m, 196);
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.8;
      ctx.font = font(family, 19);
      f.preview.split("\n").forEach((l, i) => ctx.fillText(l, m, 240 + i * 27, w - m * 2));
      ctx.globalAlpha = 1;
    },
    60 + index,
  );
}

function compact<T>(items: (T | null)[]): T[] | null {
  return items.every((x) => x !== null) ? (items as T[]) : null;
}

export function buildDemoTextures(family: string, aniso: number): DemoTextures | null {
  const files = compact(fileCards(family, aniso));
  const requirements = requirementSlip(family, aniso);
  const chunks = compact(DOC_CHUNKS.map((_, i) => chunkCard(family, aniso, i)));
  const kinds: TicketKind[] = ["candidate", "rejected", "feasible", "low", "perf"];
  const ticketList = compact(kinds.map((k) => ticket(family, aniso, k)));
  const counter = counterSlip(family, aniso);
  const sheets = compact(BUNDLE_FILES.map((_, i) => sheet(family, aniso, i)));
  if (!files || !requirements || !chunks || !ticketList || !counter || !sheets) return null;
  const tickets = Object.fromEntries(kinds.map((k, i) => [k, ticketList[i]])) as Record<TicketKind, Slip>;
  return { files, requirements, chunks, tickets, counter, strips: strips(family, aniso), sheets };
}

export function disposeDemoTextures(t: DemoTextures) {
  const all: Slip[] = [
    ...t.files,
    t.requirements,
    ...t.chunks,
    ...Object.values(t.tickets),
    t.counter,
    ...t.strips,
    ...t.sheets,
  ];
  all.forEach((s) => s.tex.dispose());
}
