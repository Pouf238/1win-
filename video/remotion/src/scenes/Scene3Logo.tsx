import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, Chip, HandText, KTitle, LightSweep, Particles, stagger} from '../components/core';
import {CountRing, LogoIcon, LogoStroke, Phone, ProfileScreen, Waveform} from '../components/ui';
import {Flash} from '../components/SceneShell';
import {useLayout} from '../lib/layout';
import {anim, clamp, ease, prog, scene, shake, spring, TL, useT, we, ws} from '../lib/time';

/**
 * SCÈNE 3 — RÉVÉLATION DU LOGO (16,6 → 26,3 s)
 * Décompte 3-2-1 (réf. 2) → tracé du « S » → impact : le vrai logo apparaît,
 * tampon « NOUVEAU COMPTE », onde sonore (« l'impression prend la parole »),
 * puis le logo rejoint un profil tout neuf dans un smartphone.
 */
export const Scene3Logo: React.FC = () => {
  const t = useT();
  const L = useLayout();
  const C = CONTENT.logo;
  const S = scene('logo');
  const IMP = TL.impactLogo;
  const [c3, c2, c1] = TL.countdown;
  const tNous = ws('nous'), tNouv = ws('nouveaux'), tNouvelles = ws('nouvelles');
  const tImp = ws('impression', 1), tParE = we('parole');
  const tOn = ws('on', 2);

  const land = L.landscape;
  const logoSize = land ? 0.44 * L.H : 0.44 * L.W;
  const lx = land ? 0.73 * L.W : 0.5 * L.W;
  const ly = land ? 0.46 * L.H : 0.36 * L.H;
  const sh = shake(t, IMP, 26 * L.u, 0.6);

  // décompte
  const n = t < c2 ? '3' : t < c1 ? '2' : '1';
  const tick = t < c2 ? c3 : t < c1 ? c2 : c1;
  const pulse = 1 - ease.outCubic(prog(t, tick, tick + 0.3));
  const ringP = prog(t, c3 - 0.1, IMP - 0.1);
  const countO = (1 - prog(t, IMP - 0.5, IMP - 0.3)) * prog(t, S.start - 0.3, S.start);
  // tracé du S
  const drawP = ease.inOutCubic(prog(t, IMP - 0.55, IMP - 0.05));
  const barP = ease.outCubic(prog(t, IMP - 0.25, IMP));
  // logo réel
  const sp = spring(t, IMP, 2.4, 0.38);
  const exitP = ease.inOutCubic(prog(t, tOn - 0.35, tOn + 0.25));
  const logoScale = (t < IMP ? 1 : 1.3 - 0.3 * sp) * (1 - exitP * 0.75);
  const lyy = ly - exitP * (land ? 0.1 : 0.12) * L.H;
  // tampon
  const st = prog(t, tNouv - 0.08, tNouv + 0.12);
  const stampScale = 2.6 - 1.6 * ease.outCubic(st);
  // onde
  const amp = prog(t, tImp - 0.3, tImp + 0.1) * (1 - prog(t, tParE + 0.2, tParE + 0.6));
  // téléphone
  const ph = ease.outExpo(prog(t, tOn - 0.25, tOn + 0.45));
  const phoneW = land ? 0.4 * L.H : 0.46 * L.W;
  const phoneX = land ? 0.73 * L.W : 0.5 * L.W;
  const phoneY = land ? 0.5 * L.H : 0.585 * L.H;
  const zoomOut = ease.inExpo(prog(t, S.end - 0.5, S.end));

  const titleRect = land ? L.title : {x: 0.065 * L.W, y: 0.6 * L.H, w: 0.87 * L.W, h: 0.17 * L.H};
  const topRect = land ? L.title : {x: 0.065 * L.W, y: 0.08 * L.H, w: 0.87 * L.W, h: 0.2 * L.H};

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" glow={prog(t, IMP, IMP + 0.1) * (1 - prog(t, IMP + 0.2, IMP + 1.5))} />
      <Particles count={36} seed={8} burstAt={IMP} cx={lx / L.W} cy={ly / L.H} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${1 + zoomOut * 1.5})`,
        transformOrigin: `${phoneX}px ${phoneY}px`}}>
        {/* Décompte */}
        {countO > 0 && (
          <div style={{position: 'absolute', left: lx, top: ly, transform: 'translate(-50%, -50%)', opacity: countO}}>
            <CountRing size={logoSize * 0.85} p={ringP} n={n} pulse={pulse} />
          </div>
        )}
        {/* Tracé du S puis logo réel */}
        {t >= IMP - 0.6 && t < IMP + 0.05 && (
          <div style={{position: 'absolute', left: lx, top: ly, transform: 'translate(-50%, -50%)', opacity: prog(t, IMP - 0.6, IMP - 0.45)}}>
            <LogoStroke size={logoSize} p={drawP} bar={barP} />
          </div>
        )}
        {/* Onde sonore derrière le logo */}
        {amp > 0 && (
          <div style={{position: 'absolute', left: lx, top: lyy, transform: 'translate(-50%, -50%)', opacity: amp}}>
            <Waveform w={(land ? 0.42 : 0.92) * L.W} h={logoSize * 0.9} amp={amp} bars={land ? 30 : 26} />
          </div>
        )}
        {/* Onde de choc */}
        {t >= IMP && t < IMP + 1 && (
          <div style={{position: 'absolute', left: lx, top: ly, width: logoSize, height: logoSize, borderRadius: '50%',
            transform: `translate(-50%, -50%) scale(${0.8 + ease.outCubic(prog(t, IMP, IMP + 1)) * 2.2})`,
            border: `${10 * L.u}px solid ${BRAND.orange}`, opacity: 1 - prog(t, IMP, IMP + 1)}} />
        )}
        {t >= IMP && exitP < 1 && (
          <div style={{position: 'absolute', left: lx, top: lyy, transform: `translate(-50%, -50%) scale(${logoScale})`, opacity: 1 - exitP}}>
            <LogoIcon size={logoSize} glow={0.6 + 0.4 * (1 - prog(t, IMP, IMP + 1.5))} style={{overflow: 'hidden'}} />
            <div style={{position: 'absolute', inset: 0, borderRadius: logoSize * 0.215, overflow: 'hidden'}}>
              <LightSweep t0={IMP + 0.15} dur={0.9} />
              <LightSweep t0={tNous + 0.6} dur={0.9} opacity={0.4} />
            </div>
            {/* Tampon NOUVEAU COMPTE */}
            {st > 0 && (
              <div style={{position: 'absolute', right: -logoSize * 0.28, top: -logoSize * 0.12,
                transform: `rotate(-12deg) scale(${stampScale})`, opacity: clamp(st * 3)}}>
                <Chip size={logoSize * 0.095} style={{border: `${logoSize * 0.012}px solid ${BRAND.white}`, boxShadow: '0 12px 30px rgba(0,0,0,0.4)'}}>
                  {C.stamp}
                </Chip>
              </div>
            )}
          </div>
        )}
        {/* Titres */}
        <KTitle lines={stagger(C.title1, tNous - 0.05, 0.12, [undefined, BRAND.orange])} tOut={tNouv - 0.15} rect={titleRect} maxSize={92} shadow />
        <KTitle lines={stagger(C.title2, tNouv, 0.11, [undefined, BRAND.orange])} tOut={tImp - 0.2} rect={titleRect} maxSize={86} shadow />
        {t >= tImp - 0.1 && t < tOn - 0.1 && (
          <div style={{position: 'absolute', left: titleRect.x, top: titleRect.y, width: titleRect.w, height: titleRect.h,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: land ? 'flex-start' : 'center',
            opacity: 1 - prog(t, tOn - 0.35, tOn - 0.1)}}>
            <KTitle lines={stagger([C.title3a], tImp - 0.1, 0.1)} rect={{x: 0, y: 0, w: titleRect.w, h: titleRect.h * 0.5}} maxSize={92}
              align={land ? 'left' : 'center'} />
            <div style={{position: 'absolute', top: titleRect.h * 0.5, left: land ? 0 : undefined}}>
              <HandText text={C.title3b} t0={ws('prend') - 0.05} size={(land ? 130 : 128) * L.u} rotate={-4} />
            </div>
          </div>
        )}
        <KTitle lines={stagger(C.title4, tOn, 0.1, [undefined, BRAND.orange])} rect={topRect} maxSize={88} shadow />
        {/* Téléphone + profil tout neuf */}
        {ph > 0 && (
          <div style={{position: 'absolute', left: phoneX, top: phoneY + (1 - ph) * L.H * 0.7, transform: `translate(-50%, -50%) rotate(${(1 - ph) * 8}deg)`}}>
            <Phone w={phoneW}>
              <ProfileScreen w={phoneW} />
            </Phone>
          </div>
        )}
      </AbsoluteFill>
      <Flash at={IMP} max={0.9} />
    </AbsoluteFill>
  );
};

export const _unused = anim;
