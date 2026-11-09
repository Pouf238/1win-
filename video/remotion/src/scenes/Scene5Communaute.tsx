import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, KTitle, Pop, stagger, Zone} from '../components/core';
import {Avatar, IconBriefcase, IconHeart, IconPencil, IconPlay, IconSearch, IconSend, IconShop, Phone} from '../components/ui';
import {useLayout} from '../lib/layout';
import {clamp, ease, prog, scene, useT, we, ws} from '../lib/time';

/**
 * SCÈNE 5 — LA COMMUNAUTÉ (37,9 → 49,5 s)
 * Les 4 profils s'allument sur chaque mot, se relient en réseau puis
 * convergent (« cet univers est aussi le vôtre ») ; un commentaire se tape
 * lettre par lettre (réf. 3) et SYMO Print y répond.
 */
export const Scene5Communaute: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const C = CONTENT.communaute;
  const S = scene('communaute');
  const tQue = ws('que'), tCet = ws('cet'), tUne = ws('une', 2);
  const tProf = [ws('entrepreneur'), ws('commerçant'), ws('créateur'), ws('curieux')];
  const tPosez = ws('posez'), tCom = we('commentaire'), tRep = ws('répond'), tVid = ws('vidéo');
  const phaseC = tUne - 0.3;

  const conv = ease.inOutCubic(prog(t, tCet - 0.25, tCet + 0.6));
  const outB = ease.inCubic(prog(t, phaseC - 0.3, phaseC));
  const icons = [IconBriefcase, IconShop, IconPencil, IconSearch];
  const grid = [[290, 330], [710, 330], [290, 720], [710, 720]];

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      <KTitle lines={stagger([C.lead], tQue - 0.05, 0.12)} tOut={ws('ou', 2) - 0.3} color={BRAND.ink} maxSize={110} />
      <KTitle lines={[[{text: 'OU', t: ws('ou', 2) - 0.05}, {text: 'SIMPLEMENT', t: ws('simplement') - 0.05}],
        [{text: 'CURIEUX…', t: tProf[3] - 0.05, color: BRAND.orange}]]} tOut={tCet - 0.3} color={BRAND.ink} maxSize={110} />
      <KTitle lines={stagger(C.title2, tCet - 0.05, 0.12, [undefined, BRAND.orange])} tOut={phaseC - 0.2} color={BRAND.ink} maxSize={100} />
      <KTitle lines={stagger(C.title3, tUne - 0.05, 0.12, [undefined, BRAND.orange])} color={BRAND.ink} maxSize={90} />

      {t < phaseC + 0.1 && (
        <Zone rect={L.visual}>
          <div style={{position: 'absolute', inset: 0, opacity: 1 - outB, transform: `scale(${1 - outB * 0.3})`}}>
            {/* réseau */}
            <svg width="1000" height="1000" style={{position: 'absolute', inset: 0}}>
              {[[0, 1], [1, 3], [3, 2], [2, 0], [0, 3], [1, 2]].map(([a, b], i) => {
                const p = prog(t, tProf[Math.max(a, b)] - 0.1, tProf[Math.max(a, b)] + 0.4);
                const [x1, y1] = pos(grid[a], conv), [x2, y2] = pos(grid[b], conv);
                return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={BRAND.orange} strokeWidth={5}
                  strokeDasharray="4 14" strokeLinecap="round" opacity={0.8 * (1 - conv)} />;
              })}
            </svg>
            {/* cœur central */}
            {conv > 0 && (
              <div style={{position: 'absolute', left: 500, top: 525, transform: `translate(-50%, -50%) scale(${ease.outBack(conv, 2) * (1 + 0.06 * Math.sin(t * 8))})`}}>
                <div style={{width: 260, height: 260, borderRadius: '50%', background: BRAND.orange, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 24px ${BRAND.orange}33, 0 0 0 48px ${BRAND.orange}18`}}>
                  <IconHeart size={150} fill={BRAND.white} />
                </div>
              </div>
            )}
            {C.profiles.map((label, i) => {
              const Ico = icons[i];
              const on = ease.outBack(prog(t, tProf[i] - 0.1, tProf[i] + 0.3), 2.5);
              const [x, y] = pos(grid[i], conv);
              return (
                <div key={label} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${(0.55 + 0.45 * on) * (1 - conv * 0.35)})`,
                  opacity: clamp(prog(t, tQue + i * 0.08, tQue + i * 0.08 + 0.3)), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
                  <div style={{width: 270, height: 270, borderRadius: '50%', background: on > 0.5 ? BRAND.petrol : BRAND.white,
                    border: `8px solid ${on > 0.5 ? BRAND.orange : '#D5E2E4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: on > 0.5 ? `0 0 50px ${BRAND.orange}66` : '0 10px 30px rgba(14,58,67,0.12)'}}>
                    <Ico size={150} color={on > 0.5 ? BRAND.white : BRAND.muted} stroke={7} />
                  </div>
                  <div className="sans" style={{fontSize: 48, fontWeight: 850, color: on > 0.5 ? BRAND.ink : BRAND.muted, opacity: 1 - conv}}>{label}</div>
                </div>
              );
            })}
          </div>
        </Zone>
      )}
      {t >= phaseC && <CommentPhone t0={phaseC} tType={ws('question') + 0.15} tSend={tPosez + 0.75} tRep={tRep} tVid={tVid} typed={C.typed} reply={C.reply} tCom={tCom} />}
      <div style={{display: 'none'}}>{S.end}</div>
    </AbsoluteFill>
  );
};

const pos = ([x, y]: number[], conv: number) => {
  const cx = 500, cy = 525;
  const a = Math.atan2(y - cy, x - cx);
  const r = 330;
  return [x + (cx + Math.cos(a) * r - x) * conv, y + (cy + Math.sin(a) * r - y) * conv];
};

const CommentPhone: React.FC<{t0: number; tType: number; tSend: number; tRep: number; tVid: number; typed: string; reply: string; tCom: number}> = ({
  t0, tType, tSend, tRep, tVid, typed, reply,
}) => {
  const t = useT();
  const L = useLayout();
  const land = L.landscape;
  const w = land ? 0.4 * L.H : 0.46 * L.W;
  const k = w / 520;
  const p = ease.outExpo(prog(t, t0, t0 + 0.6));
  const n = Math.floor(typed.length * clamp((t - tType) / Math.max(0.6, tSend - tType - 0.15)));
  const sent = t >= tSend;
  const x = land ? 0.73 * L.W : 0.5 * L.W;
  const y = land ? 0.5 * L.H : 0.585 * L.H;
  return (
    <div style={{position: 'absolute', left: x, top: y + (1 - p) * L.H * 0.7, transform: 'translate(-50%, -50%)'}}>
      <Phone w={w}>
        <div className="sans" style={{position: 'absolute', inset: 0, background: '#F1F5F6'}}>
          <div style={{position: 'absolute', top: 70 * k, left: 0, right: 0, textAlign: 'center', fontSize: 26 * k, fontWeight: 800, color: BRAND.ink}}>
            Commentaires
          </div>
          <div style={{position: 'absolute', top: 120 * k, left: 22 * k, right: 22 * k, display: 'flex', flexDirection: 'column', gap: 18 * k}}>
            {sent && (
              <Pop t0={tSend} from={0.6}>
                <Row k={k} letter="K" color="#3FA3B6" name="Karim" text={typed} />
              </Pop>
            )}
            {t >= tRep - 0.1 && (
              <Pop t0={tRep - 0.1} from={0.6} style={{marginLeft: 56 * k}}>
                <Row k={k} logo name="SYMO Print · Auteur" text={reply} highlight />
              </Pop>
            )}
          </div>
          {/* cœurs */}
          {t > tVid && Array.from({length: 6}, (_, i) => {
            const q = prog(t, tVid + i * 0.12, tVid + i * 0.12 + 1.4);
            if (q <= 0 || q >= 1) return null;
            return (
              <div key={i} style={{position: 'absolute', right: (40 + (i % 3) * 30) * k, bottom: (140 + q * 520) * k, opacity: 1 - q,
                transform: `translateX(${Math.sin(q * 8 + i) * 20 * k}px) scale(${0.6 + q * 0.6})`}}>
                <IconHeart size={56 * k} />
              </div>
            );
          })}
          {/* champ de saisie */}
          <div style={{position: 'absolute', left: 18 * k, right: 18 * k, bottom: 46 * k, minHeight: 84 * k, background: BRAND.white, borderRadius: 42 * k,
            display: 'flex', alignItems: 'center', gap: 12 * k, padding: `${14 * k}px ${16 * k}px`, boxShadow: '0 6px 20px rgba(14,58,67,0.12)',
            border: `3px solid ${t > tType && !sent ? BRAND.orange : '#E1E9EB'}`}}>
            <Avatar size={52 * k} letter="K" color="#3FA3B6" />
            <div style={{flex: 1, fontSize: 25 * k, fontWeight: 600, color: n > 0 && !sent ? BRAND.ink : BRAND.muted, lineHeight: 1.2}}>
              {sent ? 'Ajouter un commentaire…' : n > 0 ? typed.slice(0, n) : 'Ajouter un commentaire…'}
              {!sent && t > tType && Math.floor(t * 3) % 2 === 0 && <span style={{color: BRAND.orange}}>|</span>}
            </div>
            <div style={{width: 60 * k, height: 60 * k, borderRadius: '50%', background: n > 0 && !sent ? BRAND.orange : '#D5E2E4', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transform: `scale(${1 - 0.2 * Math.sin(clamp((t - tSend + 0.1) / 0.2) * Math.PI)})`}}>
              <IconSend size={34 * k} color={BRAND.white} stroke={9} />
            </div>
          </div>
        </div>
      </Phone>
    </div>
  );
};

const Row: React.FC<{k: number; letter?: string; color?: string; logo?: boolean; name: string; text: string; highlight?: boolean}> = ({k, letter, color, logo, name, text, highlight}) => (
  <div style={{display: 'flex', gap: 14 * k, alignItems: 'flex-start', background: highlight ? '#FFF4E0' : BRAND.white, borderRadius: 22 * k,
    padding: 16 * k, boxShadow: '0 6px 18px rgba(14,58,67,0.08)', border: highlight ? `3px solid ${BRAND.orange}` : undefined}}>
    <Avatar size={54 * k} letter={letter} color={color} logo={logo} />
    <div style={{flex: 1}}>
      <div style={{fontSize: 20 * k, fontWeight: 700, color: BRAND.muted}}>{name}</div>
      <div style={{fontSize: 25 * k, fontWeight: 700, color: BRAND.ink, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 10 * k}}>
        {text}
        {highlight && (
          <span style={{display: 'inline-flex', width: 40 * k, height: 40 * k, borderRadius: '50%', background: BRAND.orange, alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <IconPlay size={22 * k} />
          </span>
        )}
      </div>
    </div>
  </div>
);
