import React, {createContext, useContext} from 'react';
import timeline from '../data/timeline.json';

export const TL = timeline as {
  fps: number;
  duration: number;
  impactLogo: number;
  impactFinal: number;
  countdown: number[];
  bubbles: number[];
  scenes: {id: string; start: number; end: number}[];
  words: {w: string; s: number; e: number}[];
  sfx: {t: number; sfx: string}[];
};

/* ---------- Temps absolu (secondes) partagé par toutes les scènes ---------- */
export const TimeCtx = createContext(0);
export const useT = () => useContext(TimeCtx);
export const TimeProvider: React.FC<{t: number; children: React.ReactNode}> = ({t, children}) =>
  React.createElement(TimeCtx.Provider, {value: t}, children);

/* ---------- Mots horodatés de la voix off ---------- */
const norm = (s: string) =>
  s.toLowerCase().replace(/^['’\-]+/, '').replace(/[.,?!:;…]+$/, '');

/** Début (s) du n-ième mot prononcé égal à `word` (normalisé). */
export const ws = (word: string, n = 1): number => {
  let k = 0;
  for (const w of TL.words) {
    if (norm(w.w) === word) {
      k++;
      if (k === n) return w.s;
    }
  }
  throw new Error(`Mot introuvable dans la voix off : ${word} #${n}`);
};
/** Fin (s) du n-ième mot prononcé. */
export const we = (word: string, n = 1): number => {
  let k = 0;
  for (const w of TL.words) {
    if (norm(w.w) === word) {
      k++;
      if (k === n) return w.e;
    }
  }
  throw new Error(`Mot introuvable dans la voix off : ${word} #${n}`);
};

export const scene = (id: string) => {
  const s = TL.scenes.find((x) => x.id === id);
  if (!s) throw new Error(id);
  return s;
};

/* ---------- Courbes d'animation ---------- */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const ease = {
  linear: (p: number) => p,
  outCubic: (p: number) => 1 - Math.pow(1 - p, 3),
  inCubic: (p: number) => p * p * p,
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outExpo: (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inExpo: (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
  inOutExpo: (p: number) =>
    p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
  outBack: (p: number, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inBack: (p: number, s = 1.70158) => (s + 1) * p * p * p - s * p * p,
};

/** Animation `a→b` entre t0 et t0+d avec easing. */
export const anim = (t: number, t0: number, d: number, from = 0, to = 1, e: (p: number) => number = ease.outCubic) =>
  lerp(from, to, e(prog(t, t0, t0 + d)));

/** Ressort amorti analytique (0 → 1) démarrant à t0. */
export const spring = (t: number, t0: number, freq = 2.2, damping = 0.45) => {
  const tau = t - t0;
  if (tau <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damping;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
};

/** Opacité d'une fenêtre [a, b] avec fondus. */
export const win = (t: number, a: number, b: number, fi = 0.18, fo = 0.18) =>
  Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));

/** Vrai si t est dans [a - pad, b + pad] (pour monter/démonter les éléments). */
export const inside = (t: number, a: number, b: number, pad = 0.3) => t >= a - pad && t <= b + pad;

/* ---------- Pseudo-aléatoire déterministe ---------- */
export const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Tremblement de caméra (impact) — amplitude décroissante. */
export const shake = (t: number, t0: number, amp = 18, dur = 0.5) => {
  const p = prog(t, t0, t0 + dur);
  if (p <= 0 || p >= 1) return {x: 0, y: 0, r: 0};
  const k = (1 - p) * (1 - p) * amp;
  return {
    x: Math.sin(t * 97) * k,
    y: Math.cos(t * 83) * k,
    r: Math.sin(t * 61) * k * 0.05,
  };
};

/** Filtre de flou omis quand il est négligeable (rendu bien plus rapide). */
export const blurF = (px: number) => (px > 0.3 ? `blur(${px.toFixed(1)}px)` : undefined);
