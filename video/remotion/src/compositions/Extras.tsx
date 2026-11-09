import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND, LOGO} from '../config/brand';
import {CONTENT} from '../config/content';
import {Backdrop, FloatingPapers, GlobalStyle, LightSweep, Particles} from '../components/core';
import {Flash} from '../components/SceneShell';
import {LogoIcon, LogoStroke, WordmarkCard} from '../components/ui';
import {MasterVisuals} from './Master';
import {clamp, ease, prog, shake, spring, TimeProvider} from '../lib/time';

/* =========================================================================
 * TEASER 15 s : hook → révélation logo + « nouveau compte » → signature
 * (segments du master ; audio pré-monté par build_audio.py → teaser.wav)
 * ========================================================================= */
export const TEASER_SEGMENTS = [
  {src: 0.0, dur: 7.45},
  {src: 18.3, dur: 4.3},
  {src: 54.75, dur: 3.25},
];
export const Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tt = frame / fps;
  let acc = 0;
  let src = TEASER_SEGMENTS[TEASER_SEGMENTS.length - 1].src + TEASER_SEGMENTS[TEASER_SEGMENTS.length - 1].dur;
  for (const s of TEASER_SEGMENTS) {
    if (tt < acc + s.dur) {
      src = s.src + (tt - acc);
      break;
    }
    acc += s.dur;
  }
  // dernier segment : on prolonge l'image finale jusqu'à 15 s
  return (
    <>
      <MasterVisuals t={Math.min(src, 59.9)} />
      <Audio src={staticFile('audio/teaser.wav')} />
    </>
  );
};

/* =========================================================================
 * ANIMATION DU LOGO (indépendante, carré 1080 × 1080, 6 s)
 * ========================================================================= */
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const t = frame / fps;
  const IMP = 1.6;
  const size = width * 0.42;
  const draw = ease.inOutCubic(prog(t, 0.6, IMP - 0.05));
  const bar = ease.outCubic(prog(t, IMP - 0.3, IMP));
  const sp = spring(t, IMP, 2.4, 0.38);
  const move = ease.inOutCubic(prog(t, 2.9, 3.6));
  const card = ease.outExpo(prog(t, 3.3, 4.0));
  const sig = prog(t, 4.1, 4.6);
  const sh = shake(t, IMP, 20, 0.5);
  return (
    <TimeProvider t={t}>
      <GlobalStyle />
      <AbsoluteFill>
        <Backdrop mode="dark" glow={prog(t, IMP, IMP + 0.1) * (1 - prog(t, IMP + 0.2, IMP + 1.4))} />
        <Particles count={30} seed={4} burstAt={IMP} cx={0.5} cy={0.45} />
        <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
          {t < IMP + 0.05 && (
            <div style={{position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)', opacity: prog(t, 0.4, 0.7)}}>
              <LogoStroke size={size} p={draw} bar={bar} />
            </div>
          )}
          {t >= IMP && (
            <div style={{position: 'absolute', left: '50%', top: `${45 - move * 20}%`,
              transform: `translate(-50%, -50%) scale(${(1.3 - 0.3 * sp) * (1 - move * 0.55)})`, opacity: 1 - move}}>
              <LogoIcon size={size} />
              <div style={{position: 'absolute', inset: 0, borderRadius: size * 0.215, overflow: 'hidden'}}><LightSweep t0={IMP + 0.2} /></div>
            </div>
          )}
          {t >= IMP && t < IMP + 1 && (
            <div style={{position: 'absolute', left: '50%', top: '45%', width: size, height: size, borderRadius: '50%',
              transform: `translate(-50%, -50%) scale(${0.8 + ease.outCubic(prog(t, IMP, IMP + 1)) * 2.2})`,
              border: `10px solid ${BRAND.orange}`, opacity: 1 - prog(t, IMP, IMP + 1)}} />
          )}
          {card > 0 && (
            <div style={{position: 'absolute', left: '50%', top: '42%', transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * card})`, opacity: clamp(card * 2)}}>
              <WordmarkCard w={width * 0.74}><LightSweep t0={4.2} dur={1} opacity={0.6} /></WordmarkCard>
            </div>
          )}
          <div className="sans" style={{position: 'absolute', left: 0, right: 0, top: '70%', textAlign: 'center', fontSize: width * 0.052, fontWeight: 900,
            color: BRAND.white, opacity: sig, transform: `translateY(${(1 - ease.outCubic(sig)) * 20}px)`}}>
            VOS IDÉES PRENNENT <span style={{color: BRAND.orange}}>FORME.</span>
          </div>
        </AbsoluteFill>
        <Flash at={IMP} max={0.9} />
      </AbsoluteFill>
      <Audio src={staticFile('audio/logo_sting.wav')} />
    </TimeProvider>
  );
};

/* =========================================================================
 * BOUCLE HERO DU SITE (16:9, 8 s, sans son, bouclage parfait)
 * Fond animé de marque, sans texte : le site pose son titre par-dessus.
 * ========================================================================= */
export const HeroLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();
  const T = durationInFrames / fps;
  const ph = (frame / fps) / T; // phase 0 → 1
  const a = ph * Math.PI * 2;
  const sheets = Array.from({length: 9}, (_, i) => {
    const r = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const depth = 0.35 + r(1) * 0.65;
    const w = (120 + r(2) * 140) * depth * (width / 1920) * 1.5;
    const x = ((r(3) + ph * (r(4) > 0.5 ? 1 : -1) * (depth > 0.6 ? 2 : 1)) % 1 + 1) % 1;
    const y = 0.15 + r(5) * 0.7 + Math.sin(a * (depth > 0.6 ? 2 : 1) + i) * 0.03;
    const rot = r(6) * 360 + Math.sin(a + i) * 12;
    return (
      <div key={i} style={{position: 'absolute', left: x * (width + w * 2) - w, top: y * height, width: w, height: w * 1.41, background: BRAND.white,
        borderRadius: 4, opacity: 0.2 + depth * 0.5, padding: w * 0.1,
        transform: `perspective(900px) rotateZ(${rot}deg) rotateY(${Math.sin(a + i) * 35}deg)`, boxShadow: '0 20px 40px rgba(0,0,0,0.25)'}}>
        <div style={{height: w * 0.32, background: i % 3 === 0 ? BRAND.orange : BRAND.petrol, borderRadius: 3}} />
        {[0.9, 0.7, 0.8].map((k, j) => <div key={j} style={{marginTop: w * 0.07, height: w * 0.045, width: `${k * 100}%`, background: '#C9D6D9', borderRadius: 2}} />)}
      </div>
    );
  });
  const dots = Array.from({length: 40}, (_, i) => {
    const r = (k: number) => Math.abs(Math.sin(i * 3.1 + k * 7.7) * 9999.1) % 1;
    const y = ((r(1) - ph) % 1 + 1) % 1;
    return <div key={i} style={{position: 'absolute', left: r(2) * width, top: y * height, width: 3 + r(3) * 5, height: 3 + r(3) * 5, borderRadius: '50%',
      background: i % 4 === 0 ? BRAND.orange : BRAND.white, opacity: 0.25 + 0.4 * Math.abs(Math.sin(a + i))}} />;
  });
  return (
    <AbsoluteFill style={{background: BRAND.petrolNight, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 60% at ${50 + Math.sin(a) * 8}% ${45 + Math.cos(a) * 5}%, ${BRAND.petrol} 0%, ${BRAND.petrolDeep} 50%, ${BRAND.petrolNight} 100%)`}} />
      <div style={{position: 'absolute', width: width * 0.7, height: width * 0.7, left: width * 0.45 + Math.cos(a) * width * 0.08,
        top: -width * 0.25 + Math.sin(a) * height * 0.08, opacity: 0.16,
        background: `radial-gradient(circle, ${BRAND.orange} 0%, ${BRAND.orange}66 30%, transparent 70%)`}} />
      {sheets}
      {dots}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'}} />
    </AbsoluteFill>
  );
};

export const _refs = {LOGO, CONTENT, FloatingPapers};
