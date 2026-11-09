import React from 'react';
import {Img} from 'remotion';
import {BRAND, LOGO} from '../config/brand';
import {clamp, ease, prog, useT} from '../lib/time';

/* =========================================================================
 * Pictogrammes SVG (traits arrondis, charte SYMO Print)
 * ========================================================================= */
type IconProps = {size?: number; color?: string; stroke?: number; style?: React.CSSProperties};
const S: React.FC<IconProps & {children: React.ReactNode; vb?: number}> = ({size = 120, color = BRAND.petrol, stroke = 7, children, style, vb = 100}) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={style} fill="none" stroke={color} strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
export const IconBriefcase: React.FC<IconProps> = (p) => (
  <S {...p}><rect x="12" y="30" width="76" height="54" rx="9" /><path d="M36 30v-9a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v9M12 52h76M44 52v7h12v-7" /></S>
);
export const IconShop: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M14 40 20 16h60l6 24" /><path d="M14 40c0 7 5 12 12 12s12-5 12-12c0 7 5 12 12 12s12-5 12-12c0 7 5 12 12 12s12-5 12-12" /><path d="M20 52v32h60V52M42 84V64h16v20" /></S>
);
export const IconPencil: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M64 14 86 36 38 84H16V62Z" /><path d="M54 24l22 22" /></S>
);
export const IconSearch: React.FC<IconProps> = (p) => (
  <S {...p}><circle cx="43" cy="43" r="26" /><path d="M62 62 86 86" /></S>
);
export const IconMegaphone: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M14 42v16a6 6 0 0 0 6 6h10l34 18V18L30 36H20a6 6 0 0 0-6 6Z" /><path d="M30 64l6 20h10l-4-18" /><path d="M78 38c5 4 5 20 0 24" /></S>
);
export const IconBulb: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M36 64c-8-6-14-14-14-26a28 28 0 0 1 56 0c0 12-6 20-14 26v8H36Z" /><path d="M38 82h24M42 92h16M50 46v18M42 46h16" /></S>
);
export const IconCheck: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M22 52 42 72 80 30" /></S>
);
export const IconHeart: React.FC<IconProps & {fill?: string}> = ({fill = BRAND.orange, ...p}) => (
  <svg width={p.size ?? 60} height={p.size ?? 60} viewBox="0 0 100 100" style={p.style}>
    <path d="M50 86 16 52A20 20 0 0 1 50 24a20 20 0 0 1 34 28Z" fill={fill} />
  </svg>
);
export const IconBell: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M24 70V46a26 26 0 0 1 52 0v24l8 8H16Z" /><path d="M42 86a8 8 0 0 0 16 0" /></S>
);
export const IconShare: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M56 18 86 46 56 74V58C34 58 22 66 14 82c2-24 14-40 42-44Z" /></S>
);
export const IconSend: React.FC<IconProps> = (p) => (
  <S {...p}><path d="M14 50 86 16 70 86 48 58Z" /><path d="M48 58 86 16" /></S>
);
export const IconPlay: React.FC<IconProps> = (p) => (
  <svg width={p.size ?? 40} height={p.size ?? 40} viewBox="0 0 100 100" style={p.style}><path d="M30 18v64l54-32Z" fill={p.color ?? BRAND.white} /></svg>
);
export const IconLock: React.FC<{size?: number; open: number; color?: string}> = ({size = 300, open, color = BRAND.petrol}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round">
    <g transform={`translate(${open * 20} ${-open * 10}) rotate(${open * 30} 70 44)`}>
      <path d="M30 46V32a20 20 0 0 1 40 0v14" />
    </g>
    <rect x="18" y="46" width="64" height="44" rx="10" fill={BRAND.orange} stroke="none" />
    <circle cx="50" cy="64" r="6" fill={BRAND.white} stroke="none" />
    <path d="M50 68v8" stroke={BRAND.white} strokeWidth={5} />
  </svg>
);

/* =========================================================================
 * Supports imprimés
 * ========================================================================= */
export const BusinessCard: React.FC<{w?: number; style?: React.CSSProperties; dark?: boolean}> = ({w = 340, style, dark = true}) => (
  <div style={{width: w, height: w * 0.58, borderRadius: w * 0.04, background: dark ? BRAND.petrol : BRAND.white, position: 'relative',
    boxShadow: '0 22px 50px rgba(14,58,67,0.28)', overflow: 'hidden', ...style}}>
    <div style={{position: 'absolute', left: w * 0.08, top: w * 0.1, width: w * 0.16, height: w * 0.16, borderRadius: w * 0.04, background: BRAND.orange}} />
    <div style={{position: 'absolute', left: w * 0.08, top: w * 0.32, width: w * 0.5, height: w * 0.045, borderRadius: 4, background: dark ? BRAND.white : BRAND.ink}} />
    <div style={{position: 'absolute', left: w * 0.08, top: w * 0.4, width: w * 0.36, height: w * 0.03, borderRadius: 4, background: dark ? '#9CC7CF' : '#9DB2B6'}} />
    <div style={{position: 'absolute', right: 0, bottom: 0, width: w * 0.42, height: w * 0.1, background: BRAND.orange}} />
  </div>
);

export const Poster: React.FC<{w?: number; style?: React.CSSProperties; t0?: number}> = ({w = 300, style}) => (
  <div style={{width: w, height: w * 1.41, background: BRAND.white, borderRadius: 6, padding: w * 0.07, boxShadow: '0 26px 60px rgba(14,58,67,0.3)', ...style}}>
    <div style={{height: '58%', borderRadius: 4, overflow: 'hidden', position: 'relative', background: BRAND.petrol}}>
      <div style={{position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', background: BRAND.orange, left: '35%', top: '-20%'}} />
      <div style={{position: 'absolute', width: '60%', height: '60%', borderRadius: '50%', border: `${w * 0.03}px solid ${BRAND.white}`, left: '-15%', bottom: '-20%', opacity: 0.8}} />
    </div>
    <div className="sans" style={{marginTop: w * 0.06, fontWeight: 900, fontSize: w * 0.12, lineHeight: 1, color: BRAND.ink, letterSpacing: '-0.03em'}}>AFFICHE</div>
    <div style={{marginTop: w * 0.05, height: w * 0.035, width: '80%', background: '#C9D6D9', borderRadius: 3}} />
    <div style={{marginTop: w * 0.03, height: w * 0.035, width: '55%', background: '#C9D6D9', borderRadius: 3}} />
  </div>
);

export const Flyer: React.FC<{w?: number; style?: React.CSSProperties; color?: number}> = ({w = 260, style, color = 1}) => (
  <div style={{width: w, height: w * 1.41, background: BRAND.white, borderRadius: 4, padding: w * 0.08, boxShadow: '0 18px 40px rgba(14,58,67,0.25)', overflow: 'hidden', ...style}}>
    <div style={{height: '40%', borderRadius: 3, background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orange} ${color * 50}%, ${BRAND.petrol} ${color * 50}%)`}} />
    {[0.9, 0.75, 0.85, 0.6, 0.7].map((k, i) => (
      <div key={i} style={{marginTop: w * 0.06, height: w * 0.04, width: `${k * 100}%`, background: i === 0 ? BRAND.ink : '#C9D6D9', borderRadius: 3}} />
    ))}
  </div>
);

/** T-shirt vectoriel ; `print` (0→1) fait apparaître le visuel imprimé. */
export const TShirt: React.FC<{w?: number; color?: string; print?: number; style?: React.CSSProperties; logo?: boolean}> = ({
  w = 300, color = BRAND.petrol, print = 1, style, logo = false,
}) => (
  <div style={{width: w, height: w, position: 'relative', filter: 'drop-shadow(0 22px 30px rgba(14,58,67,0.3))', ...style}}>
    <svg width={w} height={w} viewBox="0 0 100 100">
      <path d="M34 10 L20 15 L4 30 L14 44 L22 38 L22 92 L78 92 L78 38 L86 44 L96 30 L80 15 L66 10 C63 17 57 20 50 20 C43 20 37 17 34 10 Z" fill={color} />
      <path d="M34 10 C37 17 43 20 50 20 C57 20 63 17 66 10" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
    </svg>
    <div style={{position: 'absolute', left: '33%', top: '32%', width: '34%', height: '34%', opacity: print,
      transform: `scale(${0.6 + 0.4 * print})`}}>
      {logo ? (
        <Img src={LOGO.icon} style={{width: '100%', height: '100%', borderRadius: '22%'}} />
      ) : (
        <div style={{width: '100%', height: '100%', borderRadius: '50%', background: BRAND.orange, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: '50%', height: '50%', borderRadius: '50%', border: `${w * 0.02}px solid ${BRAND.white}`}} />
        </div>
      )}
    </div>
  </div>
);

/** Imprimante professionnelle stylisée ; `out` (0→1) = sortie de la feuille. */
export const Printer: React.FC<{w?: number; run?: boolean; t?: number; children?: React.ReactNode}> = ({w = 620, run = true, t = 0, children}) => {
  const vib = run ? Math.sin(t * 60) * 1.5 : 0;
  return (
    <div style={{width: w, height: w * 0.62, position: 'relative', transform: `translateY(${vib}px)`}}>
      <div style={{position: 'absolute', left: '6%', right: '6%', top: 0, height: '30%', background: '#DCE6E8', borderRadius: '18px 18px 0 0'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: '26%', height: '52%', background: BRAND.petrol, borderRadius: 22,
        boxShadow: '0 30px 60px rgba(14,58,67,0.35)'}}>
        <div style={{position: 'absolute', left: '8%', top: '22%', width: '40%', height: '12%', background: BRAND.petrolNight, borderRadius: 8}} />
        <div style={{position: 'absolute', right: '8%', top: '20%', display: 'flex', gap: w * 0.02}}>
          {['#00A3E0', '#E6007E', '#FFE500', '#1A1A1A'].map((c, i) => (
            <div key={c} style={{width: w * 0.035, height: w * 0.035, borderRadius: '50%', background: c,
              opacity: run ? 0.6 + 0.4 * Math.abs(Math.sin(t * 6 + i)) : 0.7}} />
          ))}
        </div>
        <div style={{position: 'absolute', left: '10%', right: '10%', bottom: '14%', height: '10%', background: BRAND.petrolNight, borderRadius: 6}} />
      </div>
      <div style={{position: 'absolute', left: '12%', right: '12%', top: '74%', height: '8%', background: BRAND.orange, borderRadius: '0 0 14px 14px'}} />
      {children}
    </div>
  );
};

/* =========================================================================
 * Logo SYMO Print
 * ========================================================================= */
/** Tracé du « S » de l'icône (dessin progressif) — `p` de 0 à 1. */
export const LogoStroke: React.FC<{size: number; p: number; bar: number}> = ({size, p, bar}) => {
  const len = 2200;
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" rx="220" fill={BRAND.petrol} opacity={clamp(p * 2)} />
      <path
        d="M780 212 H408 A150 150 0 0 0 408 512 H614 A150 150 0 0 1 614 811 H500"
        fill="none" stroke={BRAND.white} strokeWidth="112" strokeLinecap="butt"
        strokeDasharray={len} strokeDashoffset={len * (1 - p)}
      />
      <rect x="128" y="755" width={336 * bar} height="112" fill={BRAND.orange} />
    </svg>
  );
};

export const LogoIcon: React.FC<{size: number; glow?: number; style?: React.CSSProperties}> = ({size, glow = 0.6, style}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.215, position: 'relative', overflow: 'hidden',
    boxShadow: `0 0 0 ${size * 0.012}px rgba(255,255,255,${0.35 * glow}), 0 0 ${size * 0.35}px rgba(255,255,255,${0.22 * glow}), 0 ${size * 0.08}px ${size * 0.2}px rgba(0,0,0,0.35)`,
    ...style}}>
    <Img src={LOGO.icon} style={{width: '100%', height: '100%', display: 'block'}} />
  </div>
);

/** Logo complet sur carte blanche (le logo n'est jamais déformé ni recoloré). */
export const WordmarkCard: React.FC<{w: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({w, style, children}) => (
  <div style={{width: w, padding: `${w * 0.1}px ${w * 0.1}px`, background: BRAND.white, borderRadius: w * 0.06, position: 'relative',
    boxShadow: '0 40px 90px rgba(0,0,0,0.4)', overflow: 'hidden', ...style}}>
    <Img src={LOGO.wordmark} style={{width: '100%', height: 'auto', display: 'block'}} />
    {children}
  </div>
);

/* =========================================================================
 * Interface réseaux sociaux
 * ========================================================================= */
export const Avatar: React.FC<{size: number; letter?: string; color?: string; logo?: boolean}> = ({size, letter = 'A', color = BRAND.orange, logo}) =>
  logo ? (
    <Img src={LOGO.icon} style={{width: size, height: size, borderRadius: '50%', flexShrink: 0}} />
  ) : (
    <div className="sans" style={{width: size, height: size, borderRadius: '50%', background: color, color: BRAND.white, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.45}}>{letter}</div>
  );

export const CommentBubble: React.FC<{text: string; author: string; w?: number; letter?: string; color?: string; tshirt?: boolean; time?: string; small?: boolean}> = ({
  text, author, w = 760, letter = 'A', color = BRAND.orange, tshirt, time = 'il y a 2 min', small,
}) => {
  const fs = small ? 30 : 40;
  return (
    <div className="sans" style={{width: w, background: BRAND.white, borderRadius: 30, padding: `${fs * 0.6}px ${fs * 0.7}px`, display: 'flex', gap: fs * 0.5,
      alignItems: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.28)'}}>
      <Avatar size={fs * 1.9} letter={letter} color={color} />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: fs * 0.6, color: BRAND.muted, fontWeight: 600, marginBottom: fs * 0.15}}>{author} · {time}</div>
        <div style={{fontSize: fs, color: BRAND.ink, fontWeight: 750, lineHeight: 1.15}}>{text}</div>
      </div>
      {tshirt && <TShirt w={fs * 2.4} print={1} color={BRAND.petrol} />}
    </div>
  );
};

export const Phone: React.FC<{w?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({w = 520, children, style}) => (
  <div style={{width: w, height: w * 2.05, borderRadius: w * 0.14, background: '#0A1A1E', padding: w * 0.035, position: 'relative',
    boxShadow: '0 50px 100px rgba(0,0,0,0.45), inset 0 0 0 3px #2A3F44', ...style}}>
    <div style={{width: '100%', height: '100%', borderRadius: w * 0.11, background: BRAND.white, overflow: 'hidden', position: 'relative'}}>
      {children}
      <div style={{position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.3, height: w * 0.07, borderRadius: w, background: '#0A1A1E', transform: 'translateX(-50%)'}} />
    </div>
  </div>
);

/** Carte de profil d'un nouveau compte (dans un téléphone). */
export const ProfileScreen: React.FC<{w: number; subscribedAt?: number; followers?: number; tapAt?: number}> = ({w, subscribedAt, followers = 0, tapAt}) => {
  const t = useT();
  const sub = subscribedAt !== undefined ? prog(t, subscribedAt, subscribedAt + 0.25) : 0;
  const k = w / 520;
  return (
    <div className="sans" style={{position: 'absolute', inset: 0, padding: `${90 * k}px ${34 * k}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', color: BRAND.ink}}>
      <div style={{position: 'relative'}}>
        <Avatar size={150 * k} logo />
      </div>
      <div style={{fontSize: 40 * k, fontWeight: 850, marginTop: 18 * k}}>SYMO Print</div>
      <div style={{fontSize: 24 * k, color: BRAND.muted, fontWeight: 600}}>Imprimerie · Communication visuelle</div>
      <div style={{marginTop: 14 * k, background: BRAND.orange, color: BRAND.white, fontWeight: 850, fontSize: 21 * k, padding: `${6 * k}px ${16 * k}px`, borderRadius: 40 * k, letterSpacing: '0.06em'}}>
        NOUVEAU COMPTE
      </div>
      <div style={{display: 'flex', gap: 34 * k, marginTop: 22 * k}}>
        {[[followers, followers > 1 ? 'abonnés' : 'abonné'], [0, 'vidéo'], [0, "j'aime"]].map(([n, l], i) => (
          <div key={i} style={{textAlign: 'center'}}>
            <div style={{fontSize: 36 * k, fontWeight: 850, transform: i === 0 && sub > 0 ? `scale(${1 + 0.35 * Math.sin(sub * Math.PI)})` : undefined,
              color: i === 0 && sub > 0 ? BRAND.orange : BRAND.ink}}>{n}</div>
            <div style={{fontSize: 21 * k, color: BRAND.muted, fontWeight: 600}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 26 * k, width: '86%', height: 72 * k, borderRadius: 16 * k, background: sub > 0.5 ? '#E3ECEE' : BRAND.orange,
        color: sub > 0.5 ? BRAND.ink : BRAND.white, fontWeight: 850, fontSize: 30 * k, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 * k,
        transform: tapAt !== undefined ? `scale(${1 - 0.08 * Math.sin(clamp((t - tapAt) / 0.2) * Math.PI)})` : undefined}}>
        {sub > 0.5 ? <>Abonné <IconCheck size={36 * k} color={BRAND.petrol} stroke={11} /></> : "S'abonner"}
      </div>
      <div style={{marginTop: 26 * k, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 * k}}>
        {Array.from({length: 6}, (_, i) => (
          <div key={i} style={{aspectRatio: '3 / 4', background: '#EEF3F4', borderRadius: 6 * k}} />
        ))}
      </div>
    </div>
  );
};

/** Main / doigt qui appuie (curseur tactile). */
export const TapHand: React.FC<{size: number; press: number}> = ({size, press}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{transform: `scale(${1 - press * 0.12})`, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))'}}>
    <path d="M40 14a7 7 0 0 1 14 0v34l4-2a7 7 0 0 1 9 3l1 2 4-1a7 7 0 0 1 8 4l1 2 3-1a7 7 0 0 1 9 6v16c0 12-9 20-21 20H56c-8 0-14-4-18-10L22 66a7 7 0 0 1 10-10l8 8Z"
      fill={BRAND.white} stroke={BRAND.ink} strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

/** Anneau de décompte. */
export const CountRing: React.FC<{size: number; p: number; n: string; pulse: number}> = ({size, p, n, pulse}) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div style={{width: size, height: size, position: 'relative'}}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{transform: 'rotate(-90deg)'}}>
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth="5" fill="none" />
        <circle cx="50" cy="50" r={r} stroke={BRAND.orange} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <div className="sans" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, fontWeight: 900, color: BRAND.white, transform: `scale(${1 + 0.25 * pulse})`, opacity: 1 - pulse * 0.3}}>{n}</div>
    </div>
  );
};

/** Onde sonore (la marque « prend la parole »). */
export const Waveform: React.FC<{w: number; h: number; amp: number; bars?: number; color?: string}> = ({w, h, amp, bars = 34, color = BRAND.orange}) => {
  const t = useT();
  return (
    <div style={{width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      {Array.from({length: bars}, (_, i) => {
        const c = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const v = 0.15 + 0.85 * Math.abs(Math.sin(t * 9 + i * 0.7) * Math.sin(t * 5.3 + i * 1.3)) * c * amp;
        return <div key={i} style={{width: (w / bars) * 0.5, height: Math.max(6, h * v), borderRadius: 20, background: color}} />;
      })}
    </div>
  );
};

export const easeOutBack = ease.outBack;
