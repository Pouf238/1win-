import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BRAND, FONT_HAND, FONT_SANS, fontFaces} from '../config/brand';
import {useLayout, Rect} from '../lib/layout';
import {anim, clamp, ease, prog, rand, useT} from '../lib/time';

/* =========================================================================
 * Styles globaux (polices embarquées)
 * ========================================================================= */
export const GlobalStyle: React.FC = () => (
  <style>{`${fontFaces}
  * { box-sizing: border-box; }
  .sans { font-family: '${FONT_SANS}', 'Inter', sans-serif; }
  .hand { font-family: '${FONT_HAND}', cursive; }
  `}</style>
);

/* =========================================================================
 * Zone : boîte virtuelle 1000 × 1000 mise à l'échelle dans un rectangle
 * ========================================================================= */
export const Zone: React.FC<{rect: Rect; box?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  rect,
  box = 1000,
  children,
  style,
}) => {
  const s = Math.min(rect.w / box, rect.h / box);
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x + (rect.w - s * box) / 2,
        top: rect.y + (rect.h - s * box) / 2,
        width: box,
        height: box,
        transform: `scale(${s})`,
        transformOrigin: '0 0',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* =========================================================================
 * Fonds : sombre (bleu pétrole) et clair (gris clair) — charte SYMO Print
 * ========================================================================= */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id={`grain${frame % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 6} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${frame % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<{mode: 'dark' | 'light'; glow?: number}> = ({mode, glow = 0}) => {
  const t = useT();
  const {W, H} = useLayout();
  const m = Math.max(W, H);
  if (mode === 'dark') {
    return (
      <AbsoluteFill style={{background: BRAND.petrolNight, overflow: 'hidden'}}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% ${42 + Math.sin(t * 0.3) * 4}%, ${BRAND.petrol} 0%, ${BRAND.petrolDeep} 48%, ${BRAND.petrolNight} 100%)`,
          }}
        />
        {/* halos lents */}
        <div
          style={{
            position: 'absolute', width: m * 0.7, height: m * 0.7, borderRadius: '50%',
            left: W * 0.5 - m * 0.35 + Math.sin(t * 0.21) * W * 0.25, top: H * 0.15 + Math.cos(t * 0.17) * H * 0.1,
            background: BRAND.orange, opacity: 0.07 + glow * 0.18, filter: `blur(${m * 0.12}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute', width: m * 0.6, height: m * 0.6, borderRadius: '50%',
            left: W * 0.1 + Math.cos(t * 0.13) * W * 0.2, top: H * 0.55 + Math.sin(t * 0.19) * H * 0.08,
            background: '#3FA3B6', opacity: 0.16, filter: `blur(${m * 0.1}px)`,
          }}
        />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)'}} />
        <Grain opacity={0.08} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: BRAND.grey, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 60% at 50% 45%, ${BRAND.white} 0%, ${BRAND.grey} 70%)`}} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${BRAND.petrol}22 2px, transparent 2.5px)`,
          backgroundSize: `${42 * (W / 1080)}px ${42 * (W / 1080)}px`,
          backgroundPosition: `${t * 8}px ${t * 14}px`,
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: 'absolute', width: m * 0.55, height: m * 0.55, borderRadius: '50%',
          left: -m * 0.12 + Math.sin(t * 0.2) * 60, top: -m * 0.1,
          background: BRAND.petrol, opacity: 0.1, filter: `blur(${m * 0.09}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', width: m * 0.45, height: m * 0.45, borderRadius: '50%',
          right: -m * 0.1, bottom: -m * 0.05 + Math.cos(t * 0.23) * 60,
          background: BRAND.orange, opacity: 0.12, filter: `blur(${m * 0.09}px)`,
        }}
      />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* =========================================================================
 * Feuilles de papier flottantes (profondeur / parallax)
 * ========================================================================= */
export const FloatingPapers: React.FC<{count?: number; seed?: number; speed?: number; opacity?: number; t0?: number}> = ({
  count = 14,
  seed = 1,
  speed = 1,
  opacity = 1,
  t0 = 0,
}) => {
  const t = useT() - t0;
  const {W, H} = useLayout();
  const items = Array.from({length: count}, (_, i) => {
    const r = (k: number) => rand(seed * 100 + i * 7 + k);
    const depth = 0.25 + r(1) * 0.75; // 0.25 loin → 1 près
    const w = (90 + r(2) * 160) * depth * (W / 1080) * 1.4;
    const span = W + H;
    const v = (40 + r(3) * 60) * depth * speed;
    const d = ((r(4) * span + t * v) % span) - w * 2;
    const x = r(5) > 0.5 ? d : W - d;
    const y = H * (0.05 + r(6) * 0.9) + Math.sin(t * 0.6 + i) * 30 * depth - t * v * 0.25;
    const rot = r(7) * 360 + t * (r(8) - 0.5) * 40;
    const ry = Math.sin(t * 0.8 + i) * 50;
    const printed = r(9) > 0.45;
    return (
      <div
        key={i}
        style={{
          position: 'absolute', left: x, top: ((y % (H * 1.2)) + H * 1.2) % (H * 1.2) - H * 0.1,
          width: w, height: w * 1.41,
          transform: `perspective(900px) rotateZ(${rot}deg) rotateY(${ry}deg) rotateX(${ry * 0.6}deg)`,
          background: BRAND.white,
          borderRadius: 4,
          opacity: (0.35 + depth * 0.65) * opacity,
          filter: `blur(${(1 - depth) * 6}px)`,
          boxShadow: `0 ${10 * depth}px ${30 * depth}px rgba(0,0,0,0.25)`,
          padding: w * 0.1,
          overflow: 'hidden',
        }}
      >
        {printed && (
          <>
            <div style={{height: w * 0.32, background: i % 3 === 0 ? BRAND.orange : BRAND.petrol, borderRadius: 3, opacity: 0.9}} />
            {[0.9, 0.7, 0.8, 0.5].map((k, j) => (
              <div key={j} style={{marginTop: w * 0.07, height: w * 0.045, width: `${k * 100}%`, background: '#C9D6D9', borderRadius: 2}} />
            ))}
          </>
        )}
      </div>
    );
  });
  return <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>{items}</AbsoluteFill>;
};

/* =========================================================================
 * Particules (ambiance + explosion à un instant donné)
 * ========================================================================= */
export const Particles: React.FC<{count?: number; seed?: number; color?: string; burstAt?: number; cx?: number; cy?: number; ambient?: boolean}> = ({
  count = 40,
  seed = 3,
  color = BRAND.white,
  burstAt,
  cx = 0.5,
  cy = 0.42,
  ambient = true,
}) => {
  const t = useT();
  const {W, H, u} = useLayout();
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => rand(seed * 1000 + i * 13 + k);
    if (ambient) {
      const x = r(1) * W + Math.sin(t * 0.4 + i) * 20 * u;
      const y = ((r(2) * H - t * (12 + r(3) * 30) * u) % H + H) % H;
      const s = (2 + r(4) * 5) * u;
      dots.push(
        <div key={`a${i}`} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%',
          background: i % 4 === 0 ? BRAND.orange : color, opacity: 0.25 + 0.5 * Math.abs(Math.sin(t * 0.7 + i))}} />,
      );
    }
    if (burstAt !== undefined && t >= burstAt) {
      const tau = t - burstAt;
      if (tau < 2.2) {
        const ang = r(5) * Math.PI * 2;
        const v = (300 + r(6) * 900) * u;
        const dist = v * (1 - Math.exp(-tau * 2.2)) / 2.2 * 2.2;
        const x = W * cx + Math.cos(ang) * dist;
        const y = H * cy + Math.sin(ang) * dist + 60 * u * tau * tau;
        const s = (4 + r(7) * 9) * u * (1 - tau / 2.2);
        dots.push(
          <div key={`b${i}`} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: r(8) > 0.5 ? '50%' : 2,
            background: i % 3 === 0 ? BRAND.orange : BRAND.white, opacity: clamp(1 - tau / 2.2),
            boxShadow: `0 0 ${10 * u}px ${i % 3 === 0 ? BRAND.orange : BRAND.white}`}} />,
        );
      }
    }
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{dots}</AbsoluteFill>;
};

/* =========================================================================
 * Typographie cinétique
 * ========================================================================= */
type Word = {text: string; t: number; color?: string; hand?: boolean};

/** Construit des mots avec un décalage régulier à partir d'un instant. */
export const stagger = (lines: string[], t0: number, step = 0.07, colors?: (string | undefined)[]): Word[][] => {
  let k = 0;
  return lines.map((line, li) =>
    line.split(' ').map((w) => ({text: w, t: t0 + step * k++, color: colors?.[li]})),
  );
};

export const KTitle: React.FC<{
  lines: Word[][];
  tOut?: number;
  rect?: Rect;
  maxSize?: number;
  color?: string;
  align?: 'left' | 'center';
  lineHeight?: number;
  weight?: number;
  shadow?: boolean;
}> = ({lines, tOut, rect, maxSize = 104, color = BRAND.white, align, lineHeight = 1.04, weight = 850, shadow}) => {
  const t = useT();
  const L = useLayout();
  const R = rect ?? L.title;
  const al = align ?? L.titleAlign;
  const maxChars = Math.max(...lines.map((l) => l.map((w) => w.text).join(' ').length));
  const size = Math.min(maxSize * L.u, R.w / (Math.max(maxChars, 6) * 0.6), R.h / (lines.length * lineHeight * 1.05));
  const q = tOut !== undefined ? prog(t, tOut, tOut + 0.35) : 0;
  if (q >= 1) return null;
  return (
    <div
      className="sans"
      style={{
        position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: al === 'left' ? 'flex-start' : 'center', textAlign: al,
        fontSize: size, fontWeight: weight, lineHeight, letterSpacing: '-0.02em', color,
        textShadow: shadow ? '0 6px 30px rgba(0,0,0,0.35)' : undefined,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{whiteSpace: 'nowrap'}}>
          {line.map((w, wi) => {
            const p = prog(t, w.t, w.t + 0.42);
            const qq = clamp(q * 1.6 - (li * 0.15 + wi * 0.04));
            const y = (1 - ease.outBack(p, 2.2)) * 0.55 + -qq * 0.5;
            return (
              <span
                key={wi}
                className={w.hand ? 'hand' : undefined}
                style={{
                  display: 'inline-block', marginRight: '0.24em',
                  transform: `translateY(${y}em) scale(${0.7 + 0.3 * ease.outBack(p, 2)})`,
                  opacity: clamp(p * 3) * (1 - qq),
                  filter: `blur(${(1 - ease.outCubic(p)) * 12 + qq * 8}px)`,
                  color: w.color ?? color,
                  fontWeight: w.hand ? 700 : undefined,
                  fontSize: w.hand ? '1.25em' : undefined,
                  letterSpacing: w.hand ? '0' : undefined,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Texte manuscrit (Caveat) révélé comme un tracé de stylo. */
export const HandText: React.FC<{text: string; t0: number; size: number; color?: string; rotate?: number; style?: React.CSSProperties; dur?: number}> = ({
  text, t0, size, color = BRAND.orange, rotate = -4, style, dur = 0.55,
}) => {
  const t = useT();
  const p = ease.outCubic(prog(t, t0, t0 + dur));
  return (
    <div
      className="hand"
      style={{
        fontSize: size, fontWeight: 700, color, lineHeight: 1, whiteSpace: 'nowrap',
        transform: `rotate(${rotate}deg) scale(${0.9 + 0.1 * p})`,
        clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)`,
        opacity: t >= t0 ? 1 : 0,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* =========================================================================
 * Balayage lumineux (reflet) sur un élément
 * ========================================================================= */
export const LightSweep: React.FC<{t0: number; dur?: number; angle?: number; opacity?: number}> = ({t0, dur = 0.9, angle = 20, opacity = 0.7}) => {
  const t = useT();
  const p = prog(t, t0, t0 + dur);
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit'}}>
      <div
        style={{
          position: 'absolute', top: '-50%', bottom: '-50%', width: '35%',
          left: `${-40 + ease.inOutCubic(p) * 150}%`,
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${opacity}), transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* =========================================================================
 * Pastille d'appui (sous-titre court / badge)
 * ========================================================================= */
export const Chip: React.FC<{children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties}> = ({
  children, bg = BRAND.orange, color = BRAND.white, size = 34, style,
}) => (
  <div className="sans" style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.35, background: bg, color,
    fontSize: size, fontWeight: 800, padding: `${size * 0.35}px ${size * 0.7}px`, borderRadius: size * 2, letterSpacing: '0.02em',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', ...style}}>
    {children}
  </div>
);

/** Apparition « pop » (échelle + opacité) d'un bloc. */
export const Pop: React.FC<{t0: number; tOut?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number; dur?: number}> = ({
  t0, tOut, children, style, from = 0.4, dur = 0.45,
}) => {
  const t = useT();
  const p = prog(t, t0, t0 + dur);
  const q = tOut !== undefined ? ease.inCubic(prog(t, tOut, tOut + 0.3)) : 0;
  if (p <= 0 || q >= 1) return null;
  const s = from + (1 - from) * ease.outBack(p, 2.4);
  return (
    <div style={{...style, transform: `${style?.transform ?? ''} scale(${s * (1 - q * 0.4)})`, opacity: clamp(p * 4) * (1 - q),
      filter: q > 0 ? `blur(${q * 10}px)` : undefined}}>
      {children}
    </div>
  );
};

export const Fade: React.FC<{a: number; b: number; children: React.ReactNode; fi?: number; fo?: number; style?: React.CSSProperties}> = ({
  a, b, children, fi = 0.25, fo = 0.25, style,
}) => {
  const t = useT();
  const o = Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
  if (o <= 0) return null;
  return <div style={{position: 'absolute', inset: 0, opacity: o, ...style}}>{children}</div>;
};

export {anim};
