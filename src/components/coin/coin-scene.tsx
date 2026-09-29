"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { coinFrame, type AnchorBox } from "./coin-path";
import { COIN_TEXTURES } from "./coin-assets";

// The 3D 1975 Lebanese 1 Livre coin (brief §2, restart brief): a thin metal
// body with a raised lip and beaded rim, both faces textured from the real
// photo with bump maps so the relief catches the light, shining in a studio
// environment. Intro: fast spin with a light sweep, then it slows down and
// follows the scroll path in coin-path.ts.

type Anchors = { hero: AnchorBox | null; lira: AnchorBox | null };

const INTRO_SECONDS = 2.2;
const INTRO_TURNS = 3;
const IDLE_SPEED = 0.3; // rad/s after the intro
const SCROLL_SPIN = 0.0035; // rad per scrolled px

// Coin proportions, radius 1. The flat field ends where the lip rises.
const FIELD_R = 0.975;
const HALF_T = 0.055;
const LIP_T = 0.074;
const BEAD_RING_R = 0.958;
const BEAD_R = 0.0115;
const BEADS = 120;

// Face tint multiplies the grey photo. Above 1 on purpose: the photo is
// darker than polished nickel.
const tones = {
  silver: { face: [1.3, 1.3, 1.32], rim: "#d3d7dc" },
  gold: { face: [1.35, 1.1, 0.7], rim: "#d8b46a" },
} as const;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function readAnchors(): Anchors {
  const read = (id: string): AnchorBox | null => {
    const el = document.querySelector(`[data-coin-anchor="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 + window.scrollY, size: r.width };
  };
  return { hero: read("hero"), lira: read("lira") };
}

/** True when every sample point of the coin is under a section that hides it. */
function isHidden(anchors: Anchors): boolean {
  if (!anchors.hero) return true;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const f = coinFrame(window.scrollY, anchors.hero, anchors.lira, vw, vh);
  if (f.opacity < 0.01) return true;
  const r = f.size * 0.35;
  const points = [
    [f.x, f.y],
    [f.x - r, f.y],
    [f.x + r, f.y],
    [f.x, f.y - r],
    [f.x, f.y + r],
  ];
  return points.every(([x, y]) => {
    if (x < 0 || y < 0 || x > vw || y > vh) return true;
    return Boolean(document.elementFromPoint(x, y)?.closest("[data-coin-cover], header, footer"));
  });
}

export default function CoinScene({ tone = "silver" }: { tone?: keyof typeof tones }) {
  const anchors = useRef<Anchors>({ hero: null, lira: null });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(true);
  const [dpr, setDpr] = useState(1.75);

  // Measure the slots now and whenever the layout changes; pause rendering
  // while the coin is completely hidden behind other sections. A paused
  // canvas keeps its last frame, so hide it too (the next frame shows it).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        anchors.current = readAnchors();
        const hidden = isHidden(anchors.current);
        if (hidden && canvas.current) canvas.current.style.opacity = "0";
        setActive(!hidden);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <Canvas
      ref={canvas}
      dpr={[1, dpr]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 30, position: [0, 0, 10], near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1} environmentIntensity={1.1}>
          {/* Warm grey studio walls so the metal never reflects black. */}
          <color attach="background" args={["#9d968d"]} />
          <Lightformer form="rect" intensity={4} position={[0, 4, 3]} scale={[8, 1.5, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[-5, 0.5, 2]} rotation-y={Math.PI / 2} scale={[6, 2.5, 1]} />
          <Lightformer form="rect" intensity={1.6} position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 2.5, 1]} />
          <Lightformer form="ring" intensity={3} position={[2.5, 2, 5]} scale={1.6} />
          {/* Big soft box behind the camera: what the flat faces reflect. */}
          <Lightformer form="rect" intensity={2.2} color="#fffaf2" position={[0, 0.5, 8]} scale={[12, 8, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#f3e3c4" position={[0, -4, 2]} rotation-x={-Math.PI / 2} scale={[8, 3, 1]} />
        </Environment>
        <Coin anchors={anchors} tone={tone} />
      </Suspense>
    </Canvas>
  );
}

function Coin({ anchors, tone }: { anchors: RefObject<Anchors>; tone: keyof typeof tones }) {
  const group = useRef<THREE.Group>(null);
  const beads = useRef<THREE.InstancedMesh>(null);
  const sweep = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);

  const [front, back, frontBump, backBump] = useTexture(COIN_TEXTURES);

  useMemo(() => {
    for (const map of [front, back]) map.colorSpace = THREE.SRGBColorSpace;
    for (const map of [front, back, frontBump, backBump]) map.anisotropy = 8;
    // The back disc faces away from the front one; turn its picture so
    // "1 LIVRE" reads upright when the coin shows its back.
    for (const map of [back, backBump]) {
      map.center.set(0.5, 0.5);
      map.rotation = Math.PI;
    }
  }, [front, back, frontBump, backBump]);

  // Body: the lip and edge, turned on a lathe around Y.
  const body = useMemo(() => {
    const profile = [
      [FIELD_R, -HALF_T],
      [FIELD_R + 0.004, -LIP_T],
      [0.992, -LIP_T],
      [1, -LIP_T + 0.01],
      [1, LIP_T - 0.01],
      [0.992, LIP_T],
      [FIELD_R + 0.004, LIP_T],
      [FIELD_R, HALF_T],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 180);
  }, []);
  const face = useMemo(() => new THREE.CircleGeometry(FIELD_R, 180), []);
  const bead = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);

  useLayoutEffect(() => {
    const mesh = beads.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(BEAD_R, BEAD_R * 0.55, BEAD_R);
    let i = 0;
    for (const side of [1, -1]) {
      for (let k = 0; k < BEADS; k++) {
        const a = (k / BEADS) * Math.PI * 2;
        const p = new THREE.Vector3(
          Math.cos(a) * BEAD_RING_R,
          side * (HALF_T + BEAD_R * 0.2),
          Math.sin(a) * BEAD_RING_R,
        );
        mesh.setMatrixAt(i++, m.compose(p, q, s));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    const a = anchors.current;
    if (!g || !a?.hero) {
      if (g) g.visible = false;
      return;
    }
    g.visible = true;
    // Animation time advances at most 1/30 s per frame: the first frames
    // stall on shader compilation, and a wall clock would skip the intro.
    elapsed.current += Math.min(delta, 1 / 30);
    const t = elapsed.current;

    const { width: vw, height: vh } = state.size;
    const f = coinFrame(window.scrollY, a.hero, a.lira, vw, vh);
    const unit = state.viewport.height / vh; // world units per CSS px at z=0

    const pop = easeOutBack(clamp01(t / 0.9));
    const radius = (f.size / 2) * unit * (0.55 + 0.45 * pop);
    g.position.set((f.x - vw / 2) * unit, -(f.y - vh / 2) * unit, 0);
    g.scale.setScalar(radius);

    const intro = clamp01(t / INTRO_SECONDS);
    g.rotation.y =
      INTRO_TURNS * Math.PI * 2 * easeOutCubic(intro) +
      Math.max(0, t - INTRO_SECONDS) * IDLE_SPEED +
      window.scrollY * SCROLL_SPIN;
    g.rotation.x = 0.12 * Math.sin(t * 0.6);
    g.rotation.z = 0.05 * Math.sin(t * 0.45);

    state.gl.domElement.style.opacity = String(f.opacity * clamp01(t / 0.35));

    // Light sweep across the face during the intro.
    const light = sweep.current;
    if (light) {
      const k = clamp01((t - 0.2) / 1.7);
      light.position.set(g.position.x + (k * 2 - 1) * radius * 2.2, g.position.y + radius * 0.8, radius * 1.4);
      light.intensity = Math.sin(k * Math.PI) * 45 * radius * radius;
    }
  });

  const faceColor = useMemo(() => new THREE.Color(...tones[tone].face), [tone]);
  const faceProps = {
    metalness: 0.88,
    roughness: 0.3,
    bumpScale: 1.6,
    color: faceColor,
    envMapIntensity: 1.2,
  };

  return (
    <>
      <pointLight ref={sweep} intensity={0} distance={0} decay={2} color="#fffaf0" />
      <group ref={group} visible={false}>
        <group rotation-x={Math.PI / 2}>
          <mesh geometry={body}>
            <meshStandardMaterial color={tones[tone].rim} metalness={1} roughness={0.22} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={face} position-y={HALF_T} rotation-x={-Math.PI / 2}>
            <meshStandardMaterial map={front} bumpMap={frontBump} {...faceProps} />
          </mesh>
          <mesh geometry={face} position-y={-HALF_T} rotation-x={Math.PI / 2}>
            <meshStandardMaterial map={back} bumpMap={backBump} {...faceProps} />
          </mesh>
          <instancedMesh ref={beads} args={[bead, undefined, BEADS * 2]}>
            <meshStandardMaterial color={tones[tone].rim} metalness={1} roughness={0.25} />
          </instancedMesh>
        </group>
      </group>
    </>
  );
}
