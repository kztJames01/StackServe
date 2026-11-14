"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RECEIPT_TEX, paintReceipt } from "./receipt-texture";
import { clamp01, easeInOut } from "./shared";

const W = 2.4;
const H = (W * RECEIPT_TEX.height) / RECEIPT_TEX.width;
const SX = 20;
const SY = 72;
const SETTLE_SECONDS = 1.6;
const BASE_ROT = { x: 0.1, y: -0.2, z: -0.05 };

function monoFamily(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return value || "ui-monospace, monospace";
}

function useReceiptTexture(): THREE.CanvasTexture | null {
  const gl = useThree((s) => s.gl);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const family = monoFamily();
    Promise.all([
      document.fonts.load(`400 36px ${family}`),
      document.fonts.load(`600 36px ${family}`),
      document.fonts.load(`700 36px ${family}`),
    ])
      .catch(() => [])
      .then(() => document.fonts.ready)
      .then(() => {
        if (!alive) return;
        const canvas = document.createElement("canvas");
        if (!paintReceipt(canvas, family)) return;
        made = new THREE.CanvasTexture(canvas);
        made.colorSpace = THREE.SRGBColorSpace;
        made.anisotropy = gl.capabilities.getMaxAnisotropy();
        setTexture(made);
      });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [gl]);

  return texture;
}

function shapeStrip(geo: THREE.PlaneGeometry, t: number, settle: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let j = 0; j <= SY; j++) {
    const v = j / SY;
    const wave = 0.15 * Math.sin(v * Math.PI * 1.1 + 0.5) + 0.03 * Math.sin(t * 0.5 + v * 4);
    const tail = Math.max(0, v - 0.8) / 0.2;
    const head = Math.max(0, 0.1 - v) / 0.1;
    const curl = 0.6 * tail * tail - 0.25 * head * head;
    for (let i = 0; i <= SX; i++) {
      const across = (i / SX - 0.5) * 2;
      const z = settle * (wave + curl - 0.08 * across * across);
      const y = H / 2 - v * H + settle * Math.max(0, curl) * 0.3;
      pos.setXYZ(j * (SX + 1) + i, (i / SX - 0.5) * W, y, z);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function Strip({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const texture = useReceiptTexture();
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const readyAt = useRef<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geo = useMemo(() => new THREE.PlaneGeometry(W, H, SX, SY), []);

  useEffect(() => () => geo.dispose(), [geo]);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  useEffect(() => {
    if (texture) invalidate();
  }, [texture, invalidate]);

  useFrame((state, delta) => {
    if (!texture) return;
    const now = state.clock.elapsedTime;
    if (readyAt.current === null) {
      readyAt.current = now;
      onReady();
    }
    const elapsed = now - readyAt.current;
    const settle = reduced ? 1 : easeInOut(clamp01(elapsed / SETTLE_SECONDS));
    shapeStrip(geo, reduced ? 0 : elapsed, settle);
    const g = group.current;
    if (!g) return;
    const k = reduced ? 1 : 1 - Math.exp(-delta * 3);
    const tx = settle * (BASE_ROT.x + pointer.current.y * 0.05);
    const ty = settle * (BASE_ROT.y + pointer.current.x * 0.08);
    const tz = settle * BASE_ROT.z;
    g.rotation.x += (tx - g.rotation.x) * k;
    g.rotation.y += (ty - g.rotation.y) * k;
    g.rotation.z += (tz - g.rotation.z) * k;
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} visible={Boolean(texture)}>
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} side={THREE.DoubleSide} alphaTest={0.5} />
      </mesh>
    </group>
  );
}

export default function ReceiptScene({
  reduced,
  active,
  onReady,
}: {
  reduced: boolean;
  active: boolean;
  onReady: () => void;
}) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      frameloop={active && !reduced ? "always" : "demand"}
      camera={{ position: [0, 0, 7.8], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <ambientLight intensity={1.5} color="#f4efe6" />
      <directionalLight position={[-5, 3, 4]} intensity={2.6} color="#fff6ea" />
      <directionalLight position={[4, -2, 2]} intensity={0.3} color="#ffffff" />
      <Strip reduced={reduced} onReady={onReady} />
    </Canvas>
  );
}
