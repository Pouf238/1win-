import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, Chip, FloatingPapers, KTitle, LightSweep, Particles, Pop, stagger} from '../components/core';
import {CommentBubble, IconBell, IconCheck, IconSearch, IconShare, LogoIcon, Phone, ProfileScreen, TapHand, WordmarkCard} from '../components/ui';
import {Flash} from '../components/SceneShell';
import {useLayout} from '../lib/layout';
import {clamp, ease, prog, rand, shake, spring, TL, useT, we, ws, blurF} from '../lib/time';

/**
 * SCÈNE 6 — FINAL ET APPEL À L'ACTION (49,5 → 60 s)
 * Callback : les questions du début reviennent et sont cochées une à une.
 * Le profil « nouveau compte » revient : un doigt appuie sur S'abonner (0 → 1).
 * Signature finale : logo complet + « SYMO PRINT — VOS IDÉES PRENNENT FORME. »
 * visible jusqu'à la dernière image.
 */
export const Scene6Final: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const F = CONTENT.final;
  const IMP = TL.impactFinal;
  const land = L.landscape;
  const tBien = ws('bienvenue'), tAbo = ws('abonnez'), tPart = ws('partagez'), tCon = ws('connectés');
  const tSimo = ws('simoprint', 3);
  const sigTimes = [ws('vos', 2), ws('idées', 2), ws('prennent'), ws('forme')];
  const sh = shake(t, IMP, 20 * L.u, 0.5);

  const phaseB = tAbo - 0.35, phaseC = tSimo - 0.35;
  const cx = 0.5 * L.W, cy = land ? 0.52 * L.H : 0.5 * L.H;
  const logoS = land ? 0.3 * L.H : 0.34 * L.W;
  const logoOut = ease.inOutCubic(prog(t, phaseB - 0.1, phaseB + 0.35));

  // Questions du hook qui reviennent, cochées
  const qs = [...CONTENT.hook.questions.map((q) => q.text), ...CONTENT.hook.avalanche.slice(0, 4)];
  const ring = qs.map((q, i) => {
    const a = (i / qs.length) * Math.PI * 2 - Math.PI / 2;
    const rx = land ? 0.3 * L.W : 0.27 * L.W, ry = land ? 0.3 * L.H : 0.2 * L.H;
    return {q, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, i};
  });
  const away = ease.inCubic(prog(t, we('simoprint', 2) - 0.2, we('simoprint', 2) + 0.4));

  // Téléphone + tap
  const phoneW = land ? 0.4 * L.H : 0.46 * L.W;
  const phX = land ? 0.73 * L.W : 0.5 * L.W, phY = land ? 0.5 * L.H : 0.585 * L.H;
  const phIn = ease.outExpo(prog(t, phaseB, phaseB + 0.5));
  const phOut = ease.inCubic(prog(t, phaseC, phaseC + 0.4));
  const k = phoneW / 520;
  const phoneTop = phY - (phoneW * 2.05) / 2;
  const btnY = phoneTop + (18 + 560) * k;
  const tap = tAbo + 0.1;
  const handIn = ease.outCubic(prog(t, tAbo - 0.45, tap));
  const press = Math.sin(clamp((t - tap) / 0.25) * Math.PI);
  const handOut = ease.inCubic(prog(t, tap + 0.5, tap + 0.9));
  const hand = 150 * L.u;

  // Final
  const fin = ease.outExpo(prog(t, phaseC + 0.15, phaseC + 0.8));
  const cardW = land ? 0.42 * L.W : 0.8 * L.W;
  const cardY = land ? 0.33 * L.H : 0.37 * L.H;
  const zoom = 1 + 0.035 * ease.inOutCubic(prog(t, phaseC, 60));

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" glow={prog(t, IMP, IMP + 0.1) * (1 - prog(t, IMP + 0.3, IMP + 1.4))} />
      <FloatingPapers count={10} seed={9} opacity={0.35} />
      <Particles count={40} seed={11} burstAt={IMP} cx={0.5} cy={cy / L.H} />
      <Particles count={30} seed={12} ambient={false} burstAt={sigTimes[3]} cx={0.5} cy={(cardY + 0.2 * L.H) / L.H} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${zoom})`}}>
        {/* A — callback des questions cochées */}
        {t < phaseB + 0.5 && ring.map(({q, x, y, i}) => {
          const p = ease.outBack(prog(t, IMP + i * 0.07, IMP + i * 0.07 + 0.4), 2);
          const chk = ease.outBack(prog(t, IMP + 0.35 + i * 0.13, IMP + 0.6 + i * 0.13), 3);
          const dx = (x - cx) * away * 1.2, dy = (y - cy) * away * 1.2;
          return (
            <div key={i} style={{position: 'absolute', left: x + dx, top: y + dy, transform: `translate(-50%, -50%) scale(${0.55 * p * L.u})`,
              opacity: clamp(p * 3) * (1 - away)}}>
              <div style={{position: 'relative'}}>
                <CommentBubble text={q} author="Client" letter={'AKMSLB'[i % 6]} color={i % 2 ? BRAND.petrol : BRAND.orange} w={640} small time="répondu" />
                <div style={{position: 'absolute', right: -30, top: -30, width: 96, height: 96, borderRadius: '50%', background: BRAND.orange,
                  transform: `scale(${chk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.3)'}}>
                  <IconCheck size={64} color={BRAND.white} stroke={13} />
                </div>
              </div>
            </div>
          );
        })}
        {t >= IMP - 0.05 && logoOut < 1 && (
          <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${(1.25 - 0.25 * spring(t, IMP, 2.3, 0.4)) * (1 - logoOut)})`,
            opacity: 1 - logoOut}}>
            <LogoIcon size={logoS} />
            <div style={{position: 'absolute', inset: 0, borderRadius: logoS * 0.215, overflow: 'hidden'}}><LightSweep t0={IMP + 0.2} /></div>
          </div>
        )}
        <KTitle lines={stagger(F.title1, tBien - 0.05, 0.1, [undefined, BRAND.orange])} tOut={phaseB} shadow maxSize={90} />

        {/* B — abonnement */}
        {phIn > 0 && phOut < 1 && (
          <>
            <div style={{position: 'absolute', left: phX, top: phY + (1 - phIn) * L.H * 0.7 + phOut * L.H * 0.1,
              transform: `translate(-50%, -50%) scale(${1 - phOut * 0.2})`, opacity: 1 - phOut}}>
              <Phone w={phoneW}>
                <ProfileScreen w={phoneW} subscribedAt={tap + 0.05} followers={t >= tap + 0.05 ? 1 : 0} tapAt={tap} />
              </Phone>
              <Pop t0={tPart - 0.05} style={{position: 'absolute', right: -phoneW * 0.22, top: phoneW * 0.55}}>
                <FloatBtn><IconShare size={70 * L.u} color={BRAND.white} /></FloatBtn>
              </Pop>
              <Pop t0={tCon - 0.05} style={{position: 'absolute', left: -phoneW * 0.22, top: phoneW * 0.85}}>
                <FloatBtn><IconBell size={70 * L.u} color={BRAND.white} /></FloatBtn>
              </Pop>
            </div>
            {handIn > 0 && handOut < 1 && (
              <div style={{position: 'absolute', left: phX - hand * 0.47 + (1 - handIn) * L.W * 0.3, top: btnY - hand * 0.14 + (1 - handIn) * L.H * 0.25,
                opacity: 1 - handOut}}>
                <TapHand size={hand} press={press} />
                {t > tap && t < tap + 0.6 && (
                  <div style={{position: 'absolute', left: hand * 0.47, top: hand * 0.14, width: 10, height: 10, borderRadius: '50%',
                    transform: `translate(-50%, -50%) scale(${1 + prog(t, tap, tap + 0.6) * 20})`, border: `2px solid ${BRAND.orange}`,
                    opacity: 1 - prog(t, tap, tap + 0.6)}} />
                )}
              </div>
            )}
            <Pop t0={tAbo + 0.4} tOut={phaseC} style={{position: 'absolute', left: 0, right: 0, top: land ? 0.86 * L.H : 0.885 * L.H, display: 'flex', justifyContent: 'center'}}>
              <Chip size={38 * L.u}>{F.firstFollowers}</Chip>
            </Pop>
          </>
        )}
        <KTitle lines={stagger(F.title2, tAbo - 0.05, 0.1, [undefined, BRAND.orange])} tOut={phaseC} shadow maxSize={90} />

        {/* C — signature */}
        {fin > 0 && (
          <>
            <div style={{position: 'absolute', left: cx, top: cardY, transform: `translate(-50%, -50%) perspective(1600px) rotateX(${(1 - fin) * 50}deg) scale(${0.7 + 0.3 * fin})`,
              opacity: clamp(fin * 2)}}>
              <WordmarkCard w={cardW}>
                <LightSweep t0={phaseC + 0.6} dur={1} opacity={0.6} />
                <LightSweep t0={sigTimes[3] + 0.3} dur={1.1} opacity={0.5} />
              </WordmarkCard>
            </div>
            <div className="sans" style={{position: 'absolute', left: 0, right: 0, top: land ? 0.6 * L.H : 0.57 * L.H, textAlign: 'center', color: BRAND.white}}>
              <div style={{fontSize: 46 * L.u, fontWeight: 800, letterSpacing: '0.18em', color: BRAND.orange, opacity: prog(t, tSimo, tSimo + 0.3),
                transform: `translateY(${(1 - ease.outCubic(prog(t, tSimo, tSimo + 0.4))) * 20}px)`}}>
                {F.signatureA}
              </div>
              <div style={{fontSize: (land ? 88 : 86) * L.u, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 14 * L.u, lineHeight: 1.05}}>
                {F.signatureB.map((w, i) => {
                  const p = prog(t, sigTimes[i] - 0.05, sigTimes[i] + 0.35);
                  return (
                    <span key={w} style={{display: 'inline-block', marginRight: '0.25em', opacity: clamp(p * 3), filter: blurF((1 - p) * 10),
                      transform: `translateY(${(1 - ease.outBack(p, 2)) * 0.5}em)`, color: i === 3 ? BRAND.orange : BRAND.white}}>{w}</span>
                  );
                })}
              </div>
            </div>
            <Pop t0={sigTimes[3] + 0.35} style={{position: 'absolute', left: 0, right: 0, top: land ? 0.8 * L.H : 0.72 * L.H, display: 'flex', justifyContent: 'center'}}>
              <div className="sans" style={{display: 'flex', alignItems: 'center', gap: 18 * L.u, background: BRAND.white, borderRadius: 60 * L.u,
                padding: `${16 * L.u}px ${34 * L.u}px`, fontSize: 40 * L.u, fontWeight: 800, color: BRAND.ink, boxShadow: '0 16px 40px rgba(0,0,0,0.35)'}}>
                <IconSearch size={44 * L.u} color={BRAND.petrol} stroke={10} />
                {CONTENT.handle}
              </div>
            </Pop>
          </>
        )}
      </AbsoluteFill>
      <Flash at={IMP} max={0.8} />
      <div style={{display: 'none'}}>{rand(1)}</div>
    </AbsoluteFill>
  );
};

const FloatBtn: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{width: 130, height: 130, borderRadius: '50%', background: BRAND.orange, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)'}}>{children}</div>
);
