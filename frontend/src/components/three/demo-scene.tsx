"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { CHAPTER_SECONDS } from "@/lib/demo";
import { RECOMMEND_COUNTS } from "@/lib/data";
import { buildDemoTextures, disposeDemoTextures, type DemoTextures, type Slip, type TicketKind } from "./demo-textures";
import { fontsReady, monoFamily } from "./paper";
import { clamp01, easeInOut, seeded } from "./shared";

const GAP = 16;

type TimeRef = RefObject<number>;
type StationProps = { time: TimeRef; index: number; tex: DemoTextures };

const span = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const localU = (t: number, index: number) => clamp01((t - index * CHAPTER_SECONDS) / CHAPTER_SECONDS);

function paperMaterial(tex: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
}

function printSlip(mesh: THREE.Mesh | null, slip: Slip, x: number, top: number, p: number) {
  if (!mesh) return;
  const q = Math.max(0.002, p);
  mesh.scale.set(slip.w, slip.h * q, 1);
  mesh.position.set(x, top - (slip.h * q) / 2, 0);
  slip.tex.repeat.set(1, q);
  slip.tex.offset.set(0, 1 - q);
}

function CameraRig({ time, reduced }: { time: TimeRef; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const t = time.current;
    const c = Math.min(4, Math.floor(t / CHAPTER_SECONDS));
    const u = localU(t, c);
    const blend = c < 4 ? easeInOut(span(u, 0.9, 1)) : 0;
    const x = THREE.MathUtils.lerp(c * GAP, (c + 1) * GAP, blend);
    const sway = reduced ? 0 : Math.sin(t * 0.3) * 0.35;
    camera.position.set(x + sway, 0.25, 9.4);
    look.set(x, 0, 0);
    camera.lookAt(look);
  });
  return null;
}

function ProfileStation({ time, index, tex }: StationProps) {
  const files = useRef<(THREE.Mesh | null)[]>([]);
  const slip = useRef<THREE.Mesh>(null);
  const fileMats = useMemo(() => tex.files.map((f) => paperMaterial(f.tex)), [tex]);
  const slipMat = useMemo(() => paperMaterial(tex.requirements.tex), [tex]);
  const slipTop = tex.requirements.h / 2;

  useFrame(() => {
    const u = localU(time.current, index);
    files.current.forEach((m, i) => {
      if (!m) return;
      const p = easeInOut(span(u, 0.02 + i * 0.07, 0.24 + i * 0.07));
      m.position.set(THREE.MathUtils.lerp(-7.5, -2.55, p), 1.15 - i * 1.15, 0);
      m.rotation.set(0, THREE.MathUtils.lerp(0.5, 0.12, p), THREE.MathUtils.lerp(0.08, -0.015 + i * 0.015, p));
    });
    printSlip(slip.current, tex.requirements, 1.75, slipTop, easeInOut(span(u, 0.3, 0.82)));
  });

  return (
    <group position={[index * GAP, 0, 0]}>
      {tex.files.map((f, i) => (
        <mesh
          key={i}
          ref={(m) => {
            files.current[i] = m;
          }}
          material={fileMats[i]}
          scale={[f.w, f.h, 1]}
        >
          <planeGeometry />
        </mesh>
      ))}
      <group rotation={[0, -0.12, 0]}>
        <mesh ref={slip} material={slipMat}>
          <planeGeometry />
        </mesh>
      </group>
    </group>
  );
}

function RetrieveStation({ time, index, tex }: StationProps) {
  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => tex.chunks.map((c) => paperMaterial(c.tex)), [tex]);

  useFrame(() => {
    const u = localU(time.current, index);
    cards.current.forEach((m, i) => {
      if (!m) return;
      const p = easeInOut(span(u, 0.04 + i * 0.1, 0.34 + i * 0.1));
      const x = (i - 1.5) * 2.2;
      m.position.set(x, THREE.MathUtils.lerp(4.6, 0, p), THREE.MathUtils.lerp(-1, 0, p));
      m.rotation.set(THREE.MathUtils.lerp(-0.5, 0, p), -x * 0.035, (i - 1.5) * -0.02);
    });
  });

  return (
    <group position={[index * GAP, 0, 0]}>
      {tex.chunks.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            cards.current[i] = m;
          }}
          material={mats[i]}
          scale={[c.w, c.h, 1]}
        >
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}

const COLS = 8;
const CANDIDATES = RECOMMEND_COUNTS.candidates;

function RecommendStation({ time, index, tex }: StationProps) {
  const tickets = useRef<(THREE.Mesh | null)[]>([]);
  const counter = useRef<THREE.Mesh>(null);
  const kinds = useRef<TicketKind[]>(Array.from({ length: CANDIDATES }, () => "candidate"));
  const mats = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(tex.tickets) as TicketKind[]).map((k) => [k, paperMaterial(tex.tickets[k].tex)]),
      ) as Record<TicketKind, THREE.MeshStandardMaterial>,
    [tex],
  );
  const counterMat = useMemo(() => paperMaterial(tex.counter.tex), [tex]);
  const plan = useMemo(() => {
    const rand = seeded(42);
    const order = Array.from({ length: CANDIDATES }, (_, i) => i).sort(() => rand() - 0.5);
    const feasible = new Set(order.slice(0, RECOMMEND_COUNTS.feasible));
    const picks = new Map<number, TicketKind>([
      [order[0], "low"],
      [order[1], "perf"],
    ]);
    const rejectAt = new Map<number, number>();
    order
      .slice(RECOMMEND_COUNTS.feasible)
      .forEach((id, k) => rejectAt.set(id, 0.12 + (k / RECOMMEND_COUNTS.rejected) * 0.4));
    const tilt = Array.from({ length: CANDIDATES }, () => (rand() - 0.5) * 0.12);
    return { feasible, picks, rejectAt, tilt };
  }, []);
  const tw = tex.tickets.candidate.w;
  const th = tex.tickets.candidate.h;

  useFrame(() => {
    const u = localU(time.current, index);
    for (let i = 0; i < CANDIDATES; i++) {
      const m = tickets.current[i];
      if (!m) continue;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      let kind: TicketKind = "candidate";
      let z = 0;
      let rz = 0;
      let s = 1;
      const at = plan.rejectAt.get(i);
      if (at !== undefined) {
        const r = easeInOut(span(u, at, at + 0.08));
        if (r > 0) kind = "rejected";
        z = -0.12 * r;
        rz = plan.tilt[i] * r;
        s = 1 - 0.06 * r;
      } else {
        const rise = easeInOut(span(u, 0.6, 0.7));
        if (rise > 0) kind = "feasible";
        z = 0.08 * rise;
        const pick = plan.picks.get(i);
        if (pick && u > 0.74) {
          kind = pick;
          z += 0.06 * easeInOut(span(u, 0.74, 0.82));
        }
      }
      if (kinds.current[i] !== kind) {
        kinds.current[i] = kind;
        m.material = mats[kind];
      }
      m.position.set(-1.45 + (col - (COLS - 1) / 2) * (tw + 0.05), 1.12 - row * (th + 0.12), z);
      m.rotation.set(0, 0, rz);
      m.scale.set(tw * s, th * s, 1);
    }
    printSlip(counter.current, tex.counter, 3.2, tex.counter.h / 2, easeInOut(span(u, 0.08, 0.8)));
  });

  return (
    <group position={[index * GAP, 0, 0]}>
      {Array.from({ length: CANDIDATES }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            tickets.current[i] = m;
          }}
          material={mats.candidate}
        >
          <planeGeometry />
        </mesh>
      ))}
      <group rotation={[0, -0.14, 0]}>
        <mesh ref={counter} material={counterMat}>
          <planeGeometry />
        </mesh>
      </group>
    </group>
  );
}

function CompareStation({ time, index, tex }: StationProps) {
  const strips = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => tex.strips.map((s) => paperMaterial(s.tex)), [tex]);
  const top = 2.05;

  useFrame(() => {
    const u = localU(time.current, index);
    tex.strips.forEach((s, i) => {
      const p = easeInOut(span(u, 0.06 + s.scenario * 0.12, 0.4 + s.scenario * 0.12));
      const x = (s.scenario - 1) * 3 + (s.stack === 0 ? -0.56 : 0.56);
      printSlip(strips.current[i], s, x, top, p);
    });
  });

  return (
    <group position={[index * GAP, 0, 0]}>
      {tex.strips.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            strips.current[i] = m;
          }}
          material={mats[i]}
        >
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}

function BundleStation({ time, index, tex }: StationProps) {
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => tex.sheets.map((s) => paperMaterial(s.tex)), [tex]);

  useFrame(() => {
    const u = localU(time.current, index);
    sheets.current.forEach((m, i) => {
      if (!m) return;
      const p = easeInOut(span(u, 0.04 + i * 0.09, 0.34 + i * 0.09));
      const x = (i - 2) * 1.9;
      m.position.set(x, THREE.MathUtils.lerp(-4.8, -0.05 + Math.abs(i - 2) * -0.06, p), -Math.abs(i - 2) * 0.12);
      m.rotation.set(THREE.MathUtils.lerp(0.4, 0, p), (2 - i) * 0.07, (i - 2) * -0.025);
    });
  });

  return (
    <group position={[index * GAP, 0, 0]}>
      {tex.sheets.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => {
            sheets.current[i] = m;
          }}
          material={mats[i]}
          scale={[s.w, s.h, 1]}
        >
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}

function useDemoTextures(onReady: () => void): DemoTextures | null {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [tex, setTex] = useState<DemoTextures | null>(null);

  useEffect(() => {
    let alive = true;
    let made: DemoTextures | null = null;
    const family = monoFamily();
    fontsReady(family).then(() => {
      if (!alive) return;
      made = buildDemoTextures(family, gl.capabilities.getMaxAnisotropy());
      if (!made) return;
      setTex(made);
      invalidate();
      onReady();
    });
    return () => {
      alive = false;
      if (made) disposeDemoTextures(made);
    };
  }, [gl, invalidate, onReady]);

  return tex;
}

function Stations({ time, chapter, onReady }: { time: TimeRef; chapter: number; onReady: () => void }) {
  const tex = useDemoTextures(onReady);
  if (!tex) return null;
  const near = (i: number) => Math.abs(chapter - i) <= 1;
  return (
    <>
      <group visible={near(0)}>
        <ProfileStation time={time} index={0} tex={tex} />
      </group>
      <group visible={near(1)}>
        <RetrieveStation time={time} index={1} tex={tex} />
      </group>
      <group visible={near(2)}>
        <RecommendStation time={time} index={2} tex={tex} />
      </group>
      <group visible={near(3)}>
        <CompareStation time={time} index={3} tex={tex} />
      </group>
      <group visible={near(4)}>
        <BundleStation time={time} index={4} tex={tex} />
      </group>
    </>
  );
}

export default function DemoScene({
  time,
  chapter,
  reduced,
  active,
  onReady,
}: {
  time: TimeRef;
  chapter: number;
  reduced: boolean;
  active: boolean;
  onReady: () => void;
}) {
  return (
    <Canvas
      flat
      style={{ position: "absolute", inset: 0 }}
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.25, 9.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <ambientLight intensity={1.5} color="#f4efe6" />
      <directionalLight position={[-4, 5, 6]} intensity={2.3} color="#fff6ea" />
      <CameraRig time={time} reduced={reduced} />
      <Stations time={time} chapter={chapter} onReady={onReady} />
    </Canvas>
  );
}
