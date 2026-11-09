import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, KTitle, stagger, Zone} from '../components/core';
import {BusinessCard, Flyer, IconBulb, Poster, Printer, TShirt} from '../components/ui';
import {useLayout} from '../lib/layout';
import {anim, clamp, ease, prog, scene, useT, we, ws} from '../lib/time';

/**
 * SCÈNE 2 — L'UNIVERS DE L'IMPRESSION (7,6 → 16,6 s)
 * Carte de visite, affiche puis t-shirt tombent en 2.5D sur chaque mot ;
 * une idée entre dans l'imprimante et ressort en flyer couleur pendant qu'un
 * t-shirt reçoit son impression ; écran partagé PAPIER / TEXTILE.
 */
export const Scene2Univers: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const U = CONTENT.univers;
  const S = scene('univers');
  const tDer = ws('derrière');
  const tCarte = ws('carte', 1), tAff = ws('affiche'), tTee = ws('t', 2);
  const tIdee = ws('idée'), tVie = ws('vie'), tVieE = we('vie');
  const tPap = ws('papiers', 2), tTex = ws('textiles');

  const P1out = tIdee - 0.35, P2out = tPap - 0.3;

  const drop = (t0: number, x: number, y: number, rot: number) => {
    const p = prog(t, t0 - 0.12, t0 + 0.5);
    const out = ease.inBack(prog(t, P1out, P1out + 0.4));
    const yy = y - (1 - ease.outBack(p, 1.6)) * 900 - out * 120;
    return {
      position: 'absolute' as const, left: x, top: yy + Math.sin(t * 1.4 + x) * 6,
      transform: `translate(-50%, -50%) perspective(1200px) rotateX(${(1 - p) * 70}deg) rotateZ(${rot * p}deg) scale(${1 - out * 0.6})`,
      opacity: clamp(p * 5) * (1 - out),
    };
  };

  // Phase 2 : imprimante
  const p2in = ease.outBack(prog(t, P1out + 0.1, P1out + 0.6), 1.4);
  const p2out = ease.inBack(prog(t, P2out, P2out + 0.35));
  const bulbY = anim(t, tIdee - 0.1, 0.55, 40, 300, ease.inOutCubic);
  const bulbO = 1 - prog(t, tIdee + 0.45, tIdee + 0.6);
  const flyerOut = anim(t, ws('mérite') - 0.1, 0.9, 0, 1, ease.outCubic);
  const cmyk = prog(t, tVie - 0.2, tVieE + 0.2);
  const teePrint = ease.outBack(prog(t, tVie - 0.1, tVie + 0.35), 2);

  // Phase 3 : écran partagé
  const leftIn = ease.outExpo(prog(t, tPap - 0.25, tPap + 0.4));
  const rightIn = ease.outExpo(prog(t, tTex - 0.25, tTex + 0.4));
  const exit = ease.inCubic(prog(t, S.end - 0.4, S.end));

  const titles = [
    {lines: stagger(U.titles[1].split(/(?<=QUI) /), Math.min(tDer, S.start + 0.05), 0.08, [undefined, BRAND.orange]), out: P1out},
    {lines: stagger(U.titles[0].split(/(?<=QUI) /), tIdee - 0.05, 0.08, [undefined, BRAND.orange]), out: P2out},
    {lines: stagger(U.titles[2].split(/(?<=QUI) /), tPap + 0.6, 0.08, [undefined, BRAND.orange]), out: S.end + 1},
  ];

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      {titles.map((ti, i) => (
        <KTitle key={i} lines={ti.lines} tOut={ti.out} color={BRAND.ink} maxSize={L.landscape ? 90 : 92} />
      ))}
      <Zone rect={L.visual}>
        {/* Phase 1 — supports */}
        {t < P1out + 0.5 && (
          <>
            <div style={drop(tCarte, 205, 560, -9)}><BusinessCard w={340} /></div>
            <div style={drop(tAff, 520, 470, 4)}><Poster w={310} /></div>
            <div style={drop(tTee, 815, 590, 7)}>
              <TShirt w={330} print={prog(t, tTee + 0.1, tTee + 0.5)} />
            </div>
          </>
        )}
        {/* Phase 2 — l'idée prend vie */}
        {t >= P1out && t < P2out + 0.4 && (
          <div style={{position: 'absolute', inset: 0, transform: `scale(${0.6 + 0.4 * p2in - p2out * 0.3})`, opacity: clamp(p2in * 2) * (1 - p2out)}}>
            <div style={{position: 'absolute', left: 330, top: bulbY, transform: 'translate(-50%, -50%)', opacity: bulbO}}>
              <div style={{width: 170, height: 170, borderRadius: '50%', background: BRAND.white, boxShadow: `0 0 60px ${BRAND.orange}88`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <IconBulb size={120} color={BRAND.orange} stroke={7} />
              </div>
            </div>
            <div style={{position: 'absolute', left: 330, top: 520, transform: 'translate(-50%, -50%)'}}>
              <div style={{position: 'relative'}}>
                {/* flyer qui sort */}
                <div style={{position: 'absolute', left: '50%', top: 250 + flyerOut * 230, transform: `translateX(-50%) rotate(${flyerOut * -4}deg)`,
                  clipPath: `inset(${(1 - flyerOut) * 100}% 0 0 0)`, zIndex: 0}}>
                  <div style={{position: 'relative'}}>
                    <Flyer w={250} color={cmyk} />
                    <div style={{position: 'absolute', inset: 0, display: 'flex', opacity: Math.sin(cmyk * Math.PI) * 0.75, mixBlendMode: 'multiply'}}>
                      {['#00A3E0', '#E6007E', '#FFE500', '#1A1A1A'].map((c, i) => (
                        <div key={c} style={{flex: 1, background: c, transform: `translateY(${(1 - clamp(cmyk * 1.6 - i * 0.15)) * 100}%)`}} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{position: 'relative', zIndex: 1}}>
                  <Printer w={560} t={t} run={t > tIdee} />
                </div>
              </div>
            </div>
            <div style={{position: 'absolute', left: 820, top: 560, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * teePrint})`}}>
              <TShirt w={300} color={BRAND.ink} print={teePrint} logo />
              <div style={{position: 'absolute', left: '50%', top: -40 + (1 - Math.sin(clamp(prog(t, tVie - 0.4, tVie + 0.3)) * Math.PI)) * -60,
                transform: 'translateX(-50%)', width: 190, height: 40, borderRadius: 10, background: BRAND.petrol,
                opacity: 1 - prog(t, tVie + 0.3, tVie + 0.6), boxShadow: '0 10px 20px rgba(0,0,0,0.25)'}} />
            </div>
          </div>
        )}
        {/* Phase 3 — papier / textile */}
        {t >= P2out && (
          <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + exit * 0.08})`}}>
            <SplitPanel x={0} label={U.paper} bg={BRAND.petrol} p={leftIn} dir={-1} kind="paper" />
            <SplitPanel x={510} label={U.textile} bg={BRAND.orange} p={rightIn} dir={1} kind="textile" />
          </div>
        )}
      </Zone>
    </AbsoluteFill>
  );
};

const SplitPanel: React.FC<{x: number; label: string; bg: string; p: number; dir: number; kind: 'paper' | 'textile'}> = ({x, label, bg, p, dir, kind}) => {
  const t = useT();
  if (p <= 0) return null;
  const items = Array.from({length: 7}, (_, i) => i);
  return (
    <div style={{position: 'absolute', left: x, top: 40, width: 490, height: 920, borderRadius: 42, background: bg, overflow: 'hidden',
      transform: `translateY(${(1 - p) * dir * 1000}px)`, boxShadow: '0 30px 70px rgba(14,58,67,0.3)'}}>
      {items.map((i) => {
        const speed = 160;
        const y = ((i * 210 + t * speed * (kind === 'paper' ? 1 : -1)) % 1470 + 1470) % 1470 - 300;
        const xx = 245 + (i % 2 ? 70 : -70);
        return (
          <div key={i} style={{position: 'absolute', left: xx, top: y, transform: `translate(-50%, 0) rotate(${(i % 3 - 1) * 8}deg)`, opacity: 0.95}}>
            {kind === 'paper' ? (
              i % 3 === 0 ? <BusinessCard w={240} dark={false} /> : i % 3 === 1 ? <Flyer w={170} color={0.5} /> : <BusinessCard w={230} />
            ) : (
              <TShirt w={250} color={i % 3 === 0 ? BRAND.white : i % 3 === 1 ? BRAND.petrol : BRAND.ink} print={1} logo={i % 2 === 0} />
            )}
          </div>
        );
      })}
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${bg}00 40%, ${bg}EE 85%)`}} />
      <div className="sans" style={{position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center', color: BRAND.white,
        fontSize: 84, fontWeight: 900, letterSpacing: '0.02em', textShadow: '0 6px 20px rgba(0,0,0,0.25)'}}>{label}</div>
    </div>
  );
};
