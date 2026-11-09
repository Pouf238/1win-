import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {useLayout} from '../lib/layout';
import {ease, prog, useT} from '../lib/time';

export type TransitionType = 'iris' | 'wipe' | 'push' | 'none';

/**
 * Monte une scène sur sa fenêtre [start, end] et gère sa transition d'entrée
 * (masque animé) pendant les `tin` secondes qui précèdent `start`.
 */
export const SceneShell: React.FC<{
  start: number;
  end: number;
  tin?: number;
  type?: TransitionType;
  origin?: [number, number];
  children: React.ReactNode;
}> = ({start, end, tin = 0.45, type = 'iris', origin = [0.5, 0.5], children}) => {
  const t = useT();
  const {W, H} = useLayout();
  if (t < start - tin || t >= end) return null;
  const p = type === 'none' ? 1 : ease.inOutCubic(prog(t, start - tin, start));
  let clip: string | undefined;
  let transform: string | undefined;
  let edge: React.ReactNode = null;
  if (p < 1) {
    if (type === 'iris') {
      const R = Math.hypot(W, H) * p;
      clip = `circle(${R}px at ${origin[0] * 100}% ${origin[1] * 100}%)`;
      edge = (
        <div style={{position: 'absolute', left: origin[0] * W - R, top: origin[1] * H - R, width: 2 * R, height: 2 * R, borderRadius: '50%',
          border: `${18 * (1 - p) + 4}px solid ${BRAND.orange}`, boxSizing: 'border-box'}} />
      );
    } else if (type === 'wipe') {
      const x = (1 - p) * 140 - 20;
      clip = `polygon(${x}% 0, 120% 0, 120% 100%, ${x - 20}% 100%)`;
      edge = (
        <div style={{position: 'absolute', top: '-10%', bottom: '-10%', width: 26, left: `${x - 10}%`, background: BRAND.orange, transform: 'skewX(-11deg)'}} />
      );
    } else if (type === 'push') {
      transform = `translateX(${(1 - p) * 100}%)`;
      edge = <div style={{position: 'absolute', top: 0, bottom: 0, left: -24, width: 24, background: BRAND.orange}} />;
    }
  }
  return (
    <AbsoluteFill style={{clipPath: clip, transform, overflow: 'visible'}}>
      {children}
      {p < 1 && type === 'push' && edge}
      {p < 1 && type !== 'push' && <AbsoluteFill style={{pointerEvents: 'none'}}>{edge}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/** Flash blanc bref (impacts). */
export const Flash: React.FC<{at: number; dur?: number; color?: string; max?: number}> = ({at, dur = 0.35, color = BRAND.white, max = 0.85}) => {
  const t = useT();
  const p = prog(t, at, at + dur);
  if (p <= 0 || p >= 1) return null;
  return <AbsoluteFill style={{background: color, opacity: max * (1 - ease.outCubic(p)), pointerEvents: 'none'}} />;
};
