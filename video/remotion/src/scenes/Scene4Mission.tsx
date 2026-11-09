import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, Chip, KTitle, LightSweep, Pop, stagger, Zone} from '../components/core';
import {BusinessCard, Flyer, IconCheck, IconHeart, IconLock, IconMegaphone, IconShare, Printer, TShirt} from '../components/ui';
import {useLayout} from '../lib/layout';
import {clamp, ease, prog, rand, scene, useT, ws, blurF} from '../lib/time';

/**
 * SCÈNE 4 — NOTRE MISSION (26,3 → 37,9 s)
 * « Ici, pas de jargon » : les termes techniques sont barrés puis tombent.
 * Puis 5 promesses, UNE À LA FOIS, chacune avec son visuel et un compteur 1/5 → 5/5.
 */
export const Scene4Mission: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const M = CONTENT.mission;
  const S = scene('mission');
  const tIci = ws('ici'), tJar = ws('jargon');
  const starts = [ws('des', 1), ws('des', 2), ws('les', 1), ws('les', 2), ws('et', 3)];
  const ends = [...starts.slice(1).map((s) => s - 0.08), S.end + 0.5];
  const cur = starts.reduce((acc, s, i) => (t >= s - 0.2 ? i : acc), -1);

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      {/* Intro jargon */}
      <KTitle lines={stagger(M.intro, Math.min(tIci - 0.05, S.start - 0.25), 0.14, [undefined, BRAND.orange])} tOut={starts[0] - 0.3} color={BRAND.ink} maxSize={110} />
      <Zone rect={L.visual}>
        {t < starts[0] + 0.3 && <Jargon t0={S.start - 0.3} tStrike={tJar} words={M.jargon} />}
        {/* Compteur */}
        {cur >= 0 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
            <Chip size={40} bg={BRAND.petrol}>{cur + 1} / 5</Chip>
            <div style={{display: 'flex', gap: 10}}>
              {starts.map((s, i) => (
                <div key={i} style={{width: 90, height: 10, borderRadius: 10, background: '#D5E2E4', overflow: 'hidden'}}>
                  <div style={{width: `${clamp(prog(t, s - 0.2, s + 0.3)) * 100}%`, height: '100%', background: BRAND.orange}} />
                </div>
              ))}
            </div>
          </div>
        )}
        {starts.map((s, i) => (
          <Slide key={i} a={s - 0.2} b={ends[i]}>
            {i === 0 && <Conseils t0={s} />}
            {i === 1 && <Astuces t0={s} />}
            {i === 2 && <Coulisses t0={s} />}
            {i === 3 && <Techniques t0={s} tSecret={ws('secrets')} labels={M.techniques} />}
            {i === 4 && <Idees t0={s} />}
          </Slide>
        ))}
      </Zone>
      {M.items.map((it, i) => {
        const words = it.title.split(' ');
        const half = Math.ceil(words.length / 2);
        const lines = [words.slice(0, half).join(' '), words.slice(half).join(' ')];
        return (
          <KTitle key={i} lines={stagger(lines, starts[i] - 0.05, 0.06, [undefined, BRAND.orange])} tOut={ends[i] - 0.25}
            color={BRAND.ink} maxSize={86} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Diapositive qui entre par la droite et sort par la gauche (flou de mouvement). */
const Slide: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const t = useT();
  if (t < a || t > b + 0.4) return null;
  const pin = ease.outExpo(prog(t, a, a + 0.45));
  const pout = ease.inCubic(prog(t, b - 0.05, b + 0.3));
  const x = (1 - pin) * 900 - pout * 900;
  const v = (1 - pin) + pout;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${x}px)`, filter: blurF(v * 14), opacity: 1 - pout}}>
      {children}
    </div>
  );
};

const Jargon: React.FC<{t0: number; tStrike: number; words: string[]}> = ({t0, tStrike, words}) => {
  const t = useT();
  const pos = [[260, 300], [700, 250], [500, 470], [230, 640], [760, 600], [480, 800]];
  return (
    <>
      {words.map((w, i) => {
        const [x, y] = pos[i];
        const p = ease.outBack(prog(t, t0 + i * 0.08, t0 + i * 0.08 + 0.4), 2);
        const strike = ease.outCubic(prog(t, tStrike + i * 0.04, tStrike + i * 0.04 + 0.25));
        const fall = prog(t, tStrike + 0.45 + i * 0.03, tStrike + 1.3);
        return (
          <div key={w} style={{position: 'absolute', left: x, top: y + fall * fall * 900, opacity: clamp(p * 3) * (1 - fall),
            transform: `translate(-50%, -50%) rotate(${(rand(i) - 0.5) * 12 + fall * (rand(i + 4) - 0.5) * 120}deg) scale(${0.5 + 0.5 * p})`}}>
            <div className="sans" style={{position: 'relative', background: BRAND.white, color: BRAND.ink, fontSize: 58, fontWeight: 780,
              padding: '20px 38px', borderRadius: 18, boxShadow: '0 14px 40px rgba(14,58,67,0.18)', border: '2px solid #DCE6E8'}}>
              {w}
              <div style={{position: 'absolute', left: '-6%', top: '50%', height: 9, width: `${strike * 112}%`, background: BRAND.orange,
                borderRadius: 9, transform: 'rotate(-6deg)'}} />
            </div>
          </div>
        );
      })}
    </>
  );
};

const Conseils: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const rows = ['Format & fond perdu', 'Bon papier, bon rendu', 'Fichier prêt à imprimer'];
  return (
    <>
      <div style={{position: 'absolute', left: 290, top: 560, transform: 'translate(-50%, -50%) rotate(-5deg)'}}>
        <div style={{position: 'relative'}}>
          <Flyer w={330} color={0.5} />
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b], i) => (
            <div key={i} style={{position: 'absolute', [a ? 'right' : 'left']: -34, [b ? 'bottom' : 'top']: -34, width: 30, height: 30,
              borderLeft: a ? undefined : `4px solid ${BRAND.ink}`, borderRight: a ? `4px solid ${BRAND.ink}` : undefined,
              borderTop: b ? undefined : `4px solid ${BRAND.ink}`, borderBottom: b ? `4px solid ${BRAND.ink}` : undefined}} />
          ))}
        </div>
      </div>
      {rows.map((r, i) => (
        <Pop key={r} t0={t0 + 0.25 + i * 0.32} style={{position: 'absolute', left: 500, top: 330 + i * 170}}>
          <div className="sans" style={{display: 'flex', alignItems: 'center', gap: 20, fontSize: 46, fontWeight: 800, color: BRAND.ink}}>
            <div style={{width: 80, height: 80, flexShrink: 0, borderRadius: '50%', background: BRAND.orange, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <IconCheck size={46} color={BRAND.white} stroke={12} />
            </div>
            <span style={{maxWidth: 440}}>{r}</span>
          </div>
        </Pop>
      ))}
      <div style={{opacity: t > t0 ? 1 : 0}} />
    </>
  );
};

const Astuces: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  return (
    <>
      {[0, 1, 2].map((k) => {
        const p = ((t - t0) * 0.9 + k / 3) % 1;
        return (
          <div key={k} style={{position: 'absolute', left: 500, top: 540, width: 420, height: 420, borderRadius: '50%',
            border: `6px solid ${BRAND.orange}`, transform: `translate(-50%, -50%) scale(${0.8 + p * 1.2})`, opacity: (1 - p) * 0.6}} />
        );
      })}
      <div style={{position: 'absolute', left: 500, top: 540, width: 400, height: 400, borderRadius: '50%', background: BRAND.petrol,
        transform: `translate(-50%, -50%) rotate(${Math.sin(t * 5) * 4}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 30px 60px rgba(14,58,67,0.3)'}}>
        <IconMegaphone size={250} color={BRAND.white} stroke={6} />
      </div>
      <Pop t0={t0 + 0.3} style={{position: 'absolute', left: 120, top: 300}}><Bubble><IconHeart size={70} /></Bubble></Pop>
      <Pop t0={t0 + 0.5} style={{position: 'absolute', left: 760, top: 330}}><Bubble><IconShare size={70} color={BRAND.petrol} /></Bubble></Pop>
      <Pop t0={t0 + 0.7} style={{position: 'absolute', left: 740, top: 700}}><Bubble><span className="sans" style={{fontSize: 44, fontWeight: 900, color: BRAND.orange}}>+1</span></Bubble></Pop>
    </>
  );
};

const Bubble: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{width: 130, height: 130, borderRadius: '50% 50% 50% 8px', background: BRAND.white, display: 'flex', alignItems: 'center',
    justifyContent: 'center', boxShadow: '0 16px 40px rgba(14,58,67,0.2)'}}>{children}</div>
);

const Coulisses: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const open = ease.inOutCubic(prog(t, t0 + 0.15, t0 + 0.9));
  return (
    <div style={{position: 'absolute', left: 80, top: 170, width: 840, height: 760, borderRadius: 40, overflow: 'hidden',
      background: '#E7EEF0', boxShadow: 'inset 0 0 0 6px #D5E2E4'}}>
      <div style={{position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)'}}>
        <Printer w={560} t={t} run />
      </div>
      {[0, 1, 2].map((k) => {
        const p = ((t - t0) * 0.8 + k / 3) % 1;
        return (
          <div key={k} style={{position: 'absolute', left: 420 + (k - 1) * 90 + p * (k - 1) * 120, top: 470 + p * 300,
            transform: `translateX(-50%) rotate(${(k - 1) * 20 * p}deg)`, opacity: 1 - p}}>
            <Flyer w={140} color={k / 2} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: `repeating-linear-gradient(90deg, ${BRAND.petrol} 0 40px, ${BRAND.petrolDeep} 40px 80px)`,
        transform: `translateX(${-open * 100}%)`}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', background: `repeating-linear-gradient(90deg, ${BRAND.petrolDeep} 0 40px, ${BRAND.petrol} 40px 80px)`,
        transform: `translateX(${open * 100}%)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 50, background: BRAND.orange}} />
    </div>
  );
};

const Techniques: React.FC<{t0: number; tSecret: number; labels: string[]}> = ({tSecret, labels}) => {
  const t = useT();
  const open = ease.outBack(prog(t, tSecret - 0.1, tSecret + 0.35), 2);
  const shrink = ease.inOutCubic(prog(t, tSecret + 0.35, tSecret + 0.8));
  return (
    <>
      <div style={{position: 'absolute', left: 500, top: 470 - shrink * 170, transform: `translate(-50%, -50%) scale(${1 - shrink * 0.45}) rotate(${Math.sin(t * 20) * (1 - prog(t, tSecret - 0.6, tSecret)) * 4}deg)`}}>
        <IconLock size={380} open={open} />
      </div>
      {t > tSecret && Array.from({length: 8}, (_, i) => {
        const p = prog(t, tSecret, tSecret + 0.8);
        const a = (i / 8) * Math.PI * 2;
        return <div key={i} style={{position: 'absolute', left: 500 + Math.cos(a) * p * 260, top: 400 + Math.sin(a) * p * 260, width: 14, height: 14,
          borderRadius: '50%', background: BRAND.orange, opacity: 1 - p}} />;
      })}
      {labels.map((l, i) => (
        <Pop key={l} t0={tSecret + 0.45 + i * 0.18} style={{position: 'absolute', left: 60 + i * 310, top: 560}}>
          <div style={{width: 270, height: 300, borderRadius: 30, background: BRAND.white, boxShadow: '0 18px 44px rgba(14,58,67,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
            {i === 0 && (
              <div style={{display: 'flex'}}>{['#00A3E0', '#E6007E', '#FFE500', '#1A1A1A'].map((c, k) => (
                <div key={c} style={{width: 70, height: 70, borderRadius: '50%', background: c, marginLeft: k ? -20 : 0, mixBlendMode: 'multiply'}} />
              ))}</div>
            )}
            {i === 1 && <div style={{position: 'relative'}}><TShirt w={150} color={BRAND.petrol} logo /><div style={{position: 'absolute', right: -10, top: 30,
              width: 70, height: 70, background: 'rgba(255,255,255,0.75)', borderRadius: 8, transform: `rotate(${20 + Math.sin(t * 3) * 6}deg)`, boxShadow: '0 4px 10px rgba(0,0,0,0.2)'}} /></div>}
            {i === 2 && (
              <svg width="150" height="120" viewBox="0 0 150 120">
                <path d="M10 90 Q40 20 75 60 T140 30" fill="none" stroke={BRAND.orange} strokeWidth="9" strokeDasharray="14 9" strokeLinecap="round" />
                <path d="M120 10 L145 35" stroke={BRAND.ink} strokeWidth="7" strokeLinecap="round" />
              </svg>
            )}
            <div className="sans" style={{fontSize: 38, fontWeight: 900, color: BRAND.ink}}>{l}</div>
          </div>
        </Pop>
      ))}
    </>
  );
};

const Idees: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const flip = ease.outBack(prog(t, t0 + 0.1, t0 + 0.8), 1.3);
  const ry = 180 - flip * 180;
  return (
    <>
      {Array.from({length: 7}, (_, i) => {
        const p = prog(t, t0 + 0.5 + i * 0.1, t0 + 1.0 + i * 0.1);
        const a = (i / 7) * Math.PI * 2 + 0.3;
        return (
          <div key={i} style={{position: 'absolute', left: 500 + Math.cos(a) * 360, top: 520 + Math.sin(a) * 280,
            transform: `translate(-50%, -50%) scale(${ease.outBack(p, 3)}) rotate(${t * 40 + i * 30}deg)`, opacity: clamp(p * 3)}}>
            <svg width="60" height="60" viewBox="0 0 100 100"><path d="M50 4 61 39 96 50 61 61 50 96 39 61 4 50 39 39Z" fill={BRAND.orange} /></svg>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 500, top: 520, transform: `translate(-50%, -50%) perspective(1400px) rotateY(${ry}deg) rotateX(8deg) scale(1.5)`}}>
        <div style={{position: 'relative', borderRadius: 18, overflow: 'hidden'}}>
          <BusinessCard w={420} />
          <LightSweep t0={t0 + 0.8} dur={0.8} />
        </div>
      </div>
    </>
  );
};
