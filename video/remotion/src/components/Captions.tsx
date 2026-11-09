import React from 'react';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {useLayout} from '../lib/layout';
import {clamp, ease, prog, useT, we, ws} from '../lib/time';

/**
 * Sous-titres (version sous-titrée + fichier .srt).
 * Le texte est la version CORRIGÉE du script ; les horaires viennent des mots
 * détectés dans la voix off (début du 1er mot → fin du dernier mot).
 */
import captions from '../data/captions.json';

export const CAPTIONS = (captions as {text: string; from: [string, number]; to: [string, number]}[]).map((c) => ({
  text: c.text,
  start: ws(c.from[0], c.from[1]),
  end: we(c.to[0], c.to[1]),
}));

const KW = new Set(CONTENT.keywords);
const isKw = (w: string) => {
  const n = w.toLowerCase().replace(/^['’]+/, '').replace(/[.,?!:;…]+$/, '').replace(/^l'/, '');
  return KW.has(n) || (n === 'symo') || (n === 'print');
};

export const CaptionPill: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const i = CAPTIONS.findIndex((c, k) => t >= c.start - 0.08 && t < (CAPTIONS[k + 1]?.start ?? c.end + 0.6) - 0.08 && t <= c.end + 0.6);
  if (i < 0) return null;
  const c = CAPTIONS[i];
  const p = ease.outBack(prog(t, c.start - 0.08, c.start + 0.17), 1.8);
  const out = prog(t, c.end + 0.35, c.end + 0.6);
  const size = 46 * L.u;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: L.pillY, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
      <div className="sans" style={{maxWidth: L.landscape ? L.W * 0.62 : L.W * 0.86, background: 'rgba(11,45,52,0.88)', color: BRAND.white,
        fontSize: size, fontWeight: 760, lineHeight: 1.22, padding: `${size * 0.42}px ${size * 0.75}px`, borderRadius: size * 0.6, textAlign: 'center',
        transform: `translateY(-50%) scale(${0.85 + 0.15 * p})`, opacity: clamp(p * 2) * (1 - out),
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.08)'}}>
        {c.text.split(' ').map((w, k) => (
          <span key={k} style={{color: isKw(w) ? BRAND.orange : BRAND.white}}>{w} </span>
        ))}
      </div>
    </div>
  );
};

/** Export SRT (utilisé par scripts/render.mjs). */
export const toSrt = () => {
  const f = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    const p = (n: number, l = 2) => String(n).padStart(l, '0');
    return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
  };
  return CAPTIONS.map((c, i) => `${i + 1}\n${f(c.start)} --> ${f(Math.min(c.end + 0.3, CAPTIONS[i + 1]?.start ?? c.end + 0.3))}\n${c.text}\n`).join('\n');
};
