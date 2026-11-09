import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, FloatingPapers, HandText, KTitle, Particles, Zone} from '../components/core';
import {CommentBubble} from '../components/ui';
import {Flash} from '../components/SceneShell';
import {useLayout} from '../lib/layout';
import {anim, clamp, ease, prog, rand, shake, TL, useT, ws} from '../lib/time';

/**
 * SCÈNE 1 — HOOK (0 → 7,6 s)
 * Les vraies questions de clients surgissent en bulles de commentaires (réf. 3),
 * s'accumulent en avalanche, sont aspirées au centre, puis la question-titre
 * apparaît mot à mot et « autrement ? » s'écrit à la main sur l'impact.
 */
export const Scene1Hook: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const H = CONTENT.hook;
  const [b1, b2, ...av] = TL.bubbles;
  const tSuck = ws('et', 1) - 0.25; // aspiration juste avant « Et si… »
  const tAut = ws('autrement', 1);
  const sh = shake(t, tAut, 22 * L.u, 0.55);
  const suck = ease.inBack(prog(t, tSuck, tSuck + 0.4), 1.4);

  // Positions des bulles (boîte virtuelle 1000 × 1000)
  const main = [
    {x: 500, y: 330, t0: b1, q: H.questions[0], letter: 'A', color: BRAND.orange, rot: -2},
    {x: 500, y: 600, t0: b2, q: H.questions[1], letter: 'K', color: '#3FA3B6', rot: 2},
  ];
  const small = H.avalanche.map((text, i) => ({
    text, t0: av[i] ?? b2 + 0.8 + i * 0.15,
    x: 500 + (i % 2 === 0 ? -1 : 1) * (150 + rand(i + 3) * 120),
    y: [140, 470, 820, 760, 70][i],
    rot: (rand(i + 9) - 0.5) * 12,
    depth: 0.75 + rand(i + 1) * 0.25,
  }));

  const bubbleStyle = (x: number, y: number, t0: number, rot: number, depth = 1): React.CSSProperties => {
    const p = prog(t, t0, t0 + 0.45);
    const s = (0.3 + 0.7 * ease.outBack(p, 2.6)) * depth * (1 - suck * 0.95);
    const fx = (500 - x) * suck, fy = (500 - y) * suck;
    const float = Math.sin(t * 1.6 + x) * 8;
    return {
      position: 'absolute', left: x + fx, top: y + fy + float, transform: `translate(-50%, -50%) rotate(${rot + suck * 90}deg) scale(${s})`,
      opacity: clamp(p * 4) * (1 - prog(t, tSuck + 0.3, tSuck + 0.42)),
      filter: `blur(${(1 - depth) * 10 + suck * 8}px)`,
    };
  };

  const titleLines = H.titleLines.map((line, li) =>
    line.map((w, wi) => {
      const map: Record<string, number> = {
        ET: ws('et', 1), SI: ws('si', 1), ON: ws('on', 1), VOUS: ws('vous', 1), FAISAIT: ws('faisait', 1),
        DÉCOUVRIR: ws('découvrir', 1), "L'IMPRIMERIE": ws('l', 1),
      };
      return {text: w, t: (map[w] ?? 0) - 0.05, color: li === 2 ? BRAND.orange : undefined};
    }),
  );
  // la question-titre remonte quand « autrement » arrive
  const lift = anim(t, tAut - 0.1, 0.4, 0, 1, ease.outExpo);
  const R = L.title;
  const titleRect = L.landscape
    ? {x: R.x, y: R.y - lift * R.h * 0.18, w: R.w, h: R.h * 0.7}
    : {x: R.x, y: L.H * 0.27 - lift * L.H * 0.06, w: R.w, h: L.H * 0.27};
  const handSize = (L.landscape ? 170 : 180) * L.u;

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" glow={prog(t, tAut, tAut + 0.2) * (1 - prog(t, tAut + 0.3, tAut + 1.2))} />
      <FloatingPapers count={12} seed={2} speed={1 + suck * 6} opacity={0.4} />
      <Particles count={30} seed={5} ambient burstAt={tAut} cx={L.landscape ? 0.27 : 0.5} cy={L.landscape ? 0.62 : 0.6} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
        {t < tSuck + 0.5 && (
          <Zone rect={L.landscape ? L.full : L.visual}>
            {small.map((b, i) => (
              <div key={`s${i}`} style={bubbleStyle(b.x, b.y, b.t0, b.rot, b.depth)}>
                <CommentBubble text={b.text} author="Client" letter={'MSLBN'[i]} color={i % 2 ? BRAND.petrol : BRAND.orange} w={560} small time="à l'instant" />
              </div>
            ))}
            {main.map((b, i) => (
              <div key={`m${i}`} style={bubbleStyle(b.x, b.y, b.t0, b.rot)}>
                <CommentBubble text={b.q.text} author={b.q.author} letter={b.letter} color={b.color} tshirt={'tshirt' in b.q} w={820} />
              </div>
            ))}
          </Zone>
        )}
        {t >= tSuck && (
          <>
            <KTitle lines={titleLines} rect={titleRect} maxSize={L.landscape ? 96 : 104} shadow />
            <div style={{position: 'absolute', left: L.landscape ? L.title.x : 0, right: L.landscape ? undefined : 0,
              top: L.landscape ? L.H * 0.6 : L.H * 0.56, display: 'flex', justifyContent: L.landscape ? 'flex-start' : 'center'}}>
              <HandText text={H.hand} t0={tAut} size={handSize} rotate={-5} dur={0.6}
                style={{textShadow: '0 10px 40px rgba(244,166,42,0.35)'}} />
            </div>
          </>
        )}
      </AbsoluteFill>
      <Flash at={tAut} max={0.35} color={BRAND.orange} />
    </AbsoluteFill>
  );
};
