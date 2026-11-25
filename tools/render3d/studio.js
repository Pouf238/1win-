// Studio 3D Symo Print : visuels de présentation ORIGINAUX des produits sans photo (aucune image de tiers).
// Chaque produit est modélisé en géométrie simple, habillé d'un visuel dessiné ici aux couleurs de la marque
// (bleu pétrole #1F7A8C, orange #F4A62A, logo Symo Print), puis « photographié » sous un éclairage de studio.
// Rendu sur fond transparent : le fond (dégradé clair, halos bleu et orange) est ajouté ensuite par render.mjs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = { t: '#1F7A8C', td: '#145763', tl: '#CFE7EC', tx: '#3CB4C7', o: '#F4A62A', od: '#D98A16', n: '#0B2A31', w: '#FFFFFF', p: '#FBFAF7', g: '#C9D4D7', gd: '#8FA3A8' };
const SIZE = 1200;
const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(SIZE, SIZE); R.setClearColor(0x000000, 0);
R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.0;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(R.domElement);
const ENV = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;

// ------------------------------------------------------------------ images et polices de la marque
const IMG = {};
async function loadImg(k, src) { const i = new Image(); i.src = src; await i.decode(); IMG[k] = i; }
const ready = (async () => {
  await Promise.all([loadImg('logo', '/assets/img/brand/logo.svg'), loadImg('logoL', '/assets/img/brand/logo-light.svg'), loadImg('mark', '/assets/img/brand/favicon.svg')]);
  await Promise.all(['900 40px Montserrat', '800 40px Montserrat', '700 40px Montserrat', '600 40px Montserrat', '400 40px Montserrat', '300 40px Montserrat', '500 40px Inter', '700 40px Inter'].map(f => document.fonts.load(f)));
})();

// ------------------------------------------------------------------ dessin 2D (visuels imprimés)
function tex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 16;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}
const D = {
  rr(x, X, Y, W, H, r, fill) { x.beginPath(); x.roundRect(X, Y, W, H, r); x.fillStyle = fill; x.fill(); },
  txt(x, s, X, Y, { size = 40, weight = 800, font = 'Montserrat', color = C.n, align = 'left', base = 'alphabetic', track = 0, max } = {}) {
    x.font = `${weight} ${size}px ${font}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = base; x.letterSpacing = track + 'px'; max ? x.fillText(s, X, Y, max) : x.fillText(s, X, Y); x.letterSpacing = '0px';
  },
  bars(x, X, Y, W, n, { h = 10, gap = 18, color = C.g, last = 0.55 } = {}) { const k = [1, 0.86, 0.94, 0.78, 0.9, 0.82]; for (let i = 0; i < n; i++) D.rr(x, X, Y + i * (h + gap), W * (i === n - 1 ? last : k[i % k.length]), h, h / 2, color); },
  logo(x, X, Y, W, light) { const i = light ? IMG.logoL : IMG.logo; x.drawImage(i, X, Y, W, W * 189 / 619); },
  mark(x, X, Y, W) { x.drawImage(IMG.mark, X, Y, W, W); },
  lin(x, X0, Y0, X1, Y1, stops) { const g = x.createLinearGradient(X0, Y0, X1, Y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; },
  dots(x, X, Y, W, H, step, rmax, color) { x.fillStyle = color; for (let j = 0; j * step < H; j++) for (let i = 0; i * step < W; i++) { const f = (i * step) / W; const r = rmax * (0.15 + 0.85 * f); x.beginPath(); x.arc(X + i * step + (j % 2) * step / 2, Y + j * step, r, 0, 7); x.fill(); } },
};
// Visuel « affiche » de la marque : fond nuit → bleu pétrole, soleil orange, trame de points, rayures, titre blanc.
function hero(x, w, h, { title = 'VOTRE MESSAGE', sub = 2, logo = true, light = false, seed = 0, tsize } = {}) {
  const u = Math.min(w, h) / 100;
  x.fillStyle = light ? D.lin(x, 0, 0, w, h, [[0, '#FFFFFF'], [1, '#E6F1F3']]) : D.lin(x, 0, 0, w * 0.4, h, [[0, C.n], [0.55, C.td], [1, C.t]]); x.fillRect(0, 0, w, h);
  const cx = w * (seed % 2 ? 0.28 : 0.74), cy = h * (h > w * 1.4 ? 0.36 : 0.38);
  x.fillStyle = D.lin(x, cx - 30 * u, cy - 30 * u, cx + 30 * u, cy + 30 * u, [[0, '#FFC35C'], [1, C.o]]); x.beginPath(); x.arc(cx, cy, 24 * u, 0, 7); x.fill();
  x.save(); x.globalAlpha = light ? 0.5 : 0.22; D.dots(x, 0, h * 0.55, w, h * 0.45, 3.2 * u, 1.3 * u, light ? C.tl : '#7FD6E3'); x.restore();
  x.save(); x.globalAlpha = 0.9; x.fillStyle = C.o; x.beginPath(); x.moveTo(0, h * 0.78); x.lineTo(w, h * 0.6); x.lineTo(w, h * 0.66); x.lineTo(0, h * 0.84); x.fill(); x.fillStyle = light ? C.t : C.tx; x.beginPath(); x.moveTo(0, h * 0.86); x.lineTo(w, h * 0.7); x.lineTo(w, h * 0.72); x.lineTo(0, h * 0.88); x.fill(); x.restore();
  const ts = tsize || Math.min(11 * u, w / (title.length * 0.62)); const ty = h > w * 1.4 ? h * 0.62 : h * 0.6;
  title.split('\n').forEach((l, i, a) => D.txt(x, l, w * 0.07, ty - (a.length - 1 - i) * ts * 1.05, { size: ts, weight: 900, color: light ? C.n : C.w, max: w * 0.86 }));
  if (sub) D.bars(x, w * 0.07, ty + ts * 0.5, w * 0.6, sub, { h: 1.6 * u, gap: 1.6 * u, color: light ? C.gd : 'rgba(255,255,255,.55)' });
  if (logo) D.logo(x, w * 0.07, h - 16 * u, Math.min(w * 0.34, 40 * u), !light);
}
function paperBg(x, w, h, c = C.w) { x.fillStyle = c; x.fillRect(0, 0, w, h); }

// ------------------------------------------------------------------ matériaux et géométrie
const M = {
  paper: (map, rough = 0.82) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, envMapIntensity: 0.55 }),
  gloss: (map, rough = 0.28) => new THREE.MeshPhysicalMaterial({ map, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.8 }),
  color: (c, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, envMapIntensity: 0.7 }),
  metal: (c = '#D6DCDF', rough = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 1, envMapIntensity: 1.1 }),
  edge: () => new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.9, envMapIntensity: 0.4 }),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(g, m, o = {}) { const e = new THREE.Mesh(g, m); e.castShadow = o.cast !== false; e.receiveShadow = o.receive !== false; if (o.p) e.position.set(...o.p); if (o.r) e.rotation.set(...o.r); return e; }
/** Feuille posée à plat (épaisseur sur y) : recto en haut. */
function sheet(w, d, th, front, back, edgeM) { const e = edgeM || M.edge(); return mesh(new THREE.BoxGeometry(w, th, d), [e, e, front, back || e, e, e]); }
/** Panneau debout (épaisseur sur z) : recto vers l'avant. */
function panel(w, h, th, front, back, edgeM) { const e = edgeM || M.edge(); return mesh(new THREE.BoxGeometry(w, h, th), [e, e, e, e, front, back || e]); }
/** Plan courbé (affiche qui ondule, toile tendue) : déformation en z selon x. */
function curved(w, h, bend, mat, seg = 48, wave = 0) {
  const g = new THREE.PlaneGeometry(w, h, seg, 8); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i) / (w / 2); p.setZ(i, bend * X * X + wave * Math.sin(X * Math.PI * 1.5) * (0.6 + 0.4 * p.getY(i) / h)); }
  g.computeVertexNormals(); const m = mesh(g, mat); mat.side = THREE.DoubleSide; return m;
}
/** Ruban (cordon, bracelet) le long d'une courbe, largeur constante, face orientée par « up ». */
function ribbon(curve, width, mat, n = 160, up = V(0, 0, 1)) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t); const side = new THREE.Vector3().crossVectors(tg, up).normalize().multiplyScalar(width / 2);
    pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z); uv.push(t, 0, t, 1); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  mat.side = THREE.DoubleSide; return mesh(g, mat);
}
/** Forme plate avec texture étirée sur sa boîte englobante. */
function shapeMesh(shape, mat, depth = 0) {
  const g = depth ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 }) : new THREE.ShapeGeometry(shape, 48);
  g.computeBoundingBox(); const b = g.boundingBox, uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  mat.side = THREE.DoubleSide; return mesh(g, mat);
}
function cyl(rt, rb, h, mat, seg = 64, open = false) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); }
function rbox(w, h, d, r, mat, seg = 4) { return mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat); }
function group(...a) { const g = new THREE.Group(); a.forEach(e => g.add(e)); return g; }
function at(o, p = [0, 0, 0], r = [0, 0, 0]) { o.position.set(...p); o.rotation.set(...r); return o; }

// ------------------------------------------------------------------ visuels imprimés réutilisables
const ART = {
  cardFront: () => tex(1050, 600, (x, w, h) => { paperBg(x, w, h); D.logo(x, 70, 70, 330); D.rr(x, 70, 300, 360, 26, 13, C.n); D.bars(x, 70, 350, 300, 1, { h: 16, color: C.t, last: 0.75 }); D.bars(x, 70, 430, 430, 3, { h: 14, gap: 18, color: C.g }); x.fillStyle = C.o; x.beginPath(); x.moveTo(w, h * 0.42); x.lineTo(w, h); x.lineTo(w * 0.68, h); x.fill(); x.fillStyle = C.t; x.beginPath(); x.moveTo(w, h * 0.62); x.lineTo(w, h); x.lineTo(w * 0.8, h); x.fill(); }),
  cardBack: () => tex(1050, 600, (x, w, h) => { x.fillStyle = D.lin(x, 0, 0, w, h, [[0, C.td], [1, C.t]]); x.fillRect(0, 0, w, h); x.save(); x.globalAlpha = 0.18; D.dots(x, 0, 0, w, h, 26, 9, '#9BE3EE'); x.restore(); D.logo(x, w / 2 - 230, h / 2 - 75, 460, true); }),
  letter: () => tex(840, 1188, (x, w, h) => { paperBg(x, w, h); D.logo(x, 70, 70, 260); D.bars(x, 560, 80, 210, 3, { h: 9, gap: 12, color: C.gd }); D.rr(x, 70, 200, 700, 4, 2, C.t); D.bars(x, 70, 260, 260, 2, { h: 12, gap: 14, color: C.n, last: 0.7 }); D.bars(x, 70, 380, 700, 6, { h: 10, gap: 20 }); D.bars(x, 70, 600, 700, 5, { h: 10, gap: 20 }); D.bars(x, 70, 800, 700, 4, { h: 10, gap: 20 }); D.rr(x, 0, h - 60, w, 60, 0, C.t); D.rr(x, 0, h - 60, w * 0.3, 60, 0, C.o); }),
  invoice: () => tex(840, 1100, (x, w, h) => { paperBg(x, w, h); D.logo(x, 50, 50, 230); D.txt(x, 'FACTURE', w - 50, 92, { size: 46, weight: 900, color: C.t, align: 'right' }); D.txt(x, 'N° 0427', w - 50, 140, { size: 32, weight: 700, color: '#C0392B', align: 'right', font: 'Inter' }); D.bars(x, 50, 190, 300, 3, { h: 9, gap: 12, color: C.gd }); x.strokeStyle = C.t; x.lineWidth = 3; x.strokeRect(50, 320, w - 100, 560); x.fillStyle = C.tl; x.fillRect(50, 320, w - 100, 50); x.lineWidth = 1.5; for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(50, 370 + i * 51); x.lineTo(w - 50, 370 + i * 51); x.stroke(); } [430, 560, 660].forEach(X => { x.beginPath(); x.moveTo(X, 320); x.lineTo(X, 880); x.stroke(); }); D.rr(x, w - 330, 910, 280, 60, 8, C.tl); D.txt(x, 'TOTAL', w - 310, 950, { size: 26, weight: 800, color: C.td }); }),
  flyer: (i = 0) => tex(840, 1190, (x, w, h) => hero(x, w, h, { title: ['VOTRE\nMESSAGE', 'GRANDE\nOUVERTURE', 'NOUVEAU'][i % 3], sub: 3, seed: i })),
  poster: (i = 0) => tex(1000, 1414, (x, w, h) => hero(x, w, h, { title: ['IMPRESSION\nGRAND FORMAT', 'VOTRE\nÉVÉNEMENT', 'BIENVENUE'][i % 3], sub: 3, seed: i })),
  cover: (title, i = 0, light = false) => tex(900, 1272, (x, w, h) => hero(x, w, h, { title, sub: 2, seed: i, light })),
  spread: () => tex(1800, 1272, (x, w, h) => { paperBg(x, w, h); const half = w / 2; x.save(); x.beginPath(); x.rect(0, 0, half, h); x.clip(); hero(x, half, h * 0.55, { title: 'NOS SERVICES', sub: 0, logo: false, tsize: 64 }); x.restore(); D.bars(x, 60, h * 0.62, half - 120, 7, { h: 12, gap: 20 }); D.txt(x, 'Qualité', half + 70, 130, { size: 64, weight: 900, color: C.t }); D.bars(x, half + 70, 180, half - 140, 6, { h: 12, gap: 20 }); [0, 1, 2].forEach(k => { D.rr(x, half + 70 + k * (half - 140) / 3, 420, (half - 140) / 3 - 24, 300, 14, [C.tl, '#FDEBCB', C.tl][k]); D.mark(x, half + 70 + k * (half - 140) / 3 + 60, 500, 110); }); D.bars(x, half + 70, 780, half - 140, 8, { h: 12, gap: 20 }); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(half - 14, 0, 28, h); }),
  ticket: (n) => tex(1200, 440, (x, w, h) => { x.save(); x.beginPath(); x.rect(0, 0, w * 0.74, h); x.clip(); hero(x, w * 0.74, h, { title: 'SOIRÉE DE GALA', sub: 1, logo: false, tsize: 64 }); x.restore(); paperBg(x, 0, 0, 0); x.fillStyle = C.p; x.fillRect(w * 0.74, 0, w * 0.26, h); x.setLineDash([10, 10]); x.strokeStyle = C.gd; x.lineWidth = 4; x.beginPath(); x.moveTo(w * 0.74, 0); x.lineTo(w * 0.74, h); x.stroke(); x.setLineDash([]); D.txt(x, 'N°', w * 0.87, h * 0.38, { size: 40, weight: 700, color: C.gd, align: 'center' }); D.txt(x, n, w * 0.87, h * 0.62, { size: 78, weight: 900, color: '#C0392B', align: 'center', font: 'Inter' }); D.bars(x, w * 0.79, h * 0.75, w * 0.16, 1, { h: 12, color: C.g, last: 1 }); }),
  badge: (role) => tex(700, 1000, (x, w, h) => { paperBg(x, w, h); x.save(); x.beginPath(); x.rect(0, 0, w, h * 0.42); x.clip(); hero(x, w, h * 0.42, { title: 'SALON 2027', sub: 0, logo: false, tsize: 74 }); x.restore(); D.rr(x, w / 2 - 70, 40, 140, 26, 13, 'rgba(255,255,255,.9)'); D.rr(x, 110, h * 0.5, w - 220, 30, 15, C.n); D.bars(x, 160, h * 0.6, w - 320, 1, { h: 22, color: C.gd, last: 1 }); D.rr(x, 0, h - 170, w, 170, 0, role === 'VISITEUR' ? C.t : C.o); D.txt(x, role, w / 2, h - 66, { size: 84, weight: 900, color: C.w, align: 'center', track: 6 }); }),
  stickerArt: (k) => tex(800, 800, (x, w, h) => { if (k === 0) { hero(x, w, h, { title: 'TOP', sub: 0, logo: false, tsize: 230 }); } else if (k === 1) { x.fillStyle = C.o; x.fillRect(0, 0, w, h); D.mark(x, w * 0.18, h * 0.18, w * 0.64); } else if (k === 2) { x.fillStyle = C.w; x.fillRect(0, 0, w, h); D.logo(x, w * 0.1, h * 0.38, w * 0.8); } else { x.fillStyle = D.lin(x, 0, 0, w, h, [[0, C.t], [1, C.n]]); x.fillRect(0, 0, w, h); D.txt(x, 'MERCI !', w / 2, h * 0.58, { size: 150, weight: 900, color: C.w, align: 'center' }); } }),
  label: (i = 0) => tex(900, 560, (x, w, h) => { paperBg(x, w, h, i % 2 ? C.n : C.p); x.strokeStyle = i % 2 ? C.o : C.t; x.lineWidth = 10; x.strokeRect(26, 26, w - 52, h - 52); D.logo(x, w / 2 - 170, 70, 340, !!(i % 2)); D.txt(x, ['MIEL DE KORHOGO', 'JUS DE BISSAP', 'ATTIÉKÉ ROYAL'][i % 3], w / 2, h * 0.66, { size: 62, weight: 900, color: i % 2 ? C.w : C.td, align: 'center', max: w - 120 }); D.bars(x, w * 0.25, h * 0.75, w * 0.5, 1, { h: 14, color: i % 2 ? C.o : C.o, last: 1 }); }),
  tall: (title, i = 0) => tex(800, 2000, (x, w, h) => hero(x, w, h, { title, sub: 4, seed: i })),
  wide: (title, i = 0) => tex(2400, 800, (x, w, h) => hero(x, w, h, { title, sub: 1, seed: i })),
  logoWall: () => tex(1024, 1024, (x, w, h) => { x.fillStyle = C.w; x.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { const X = i * 512 + (j % 2) * 256, Y = j * 256; D.logo(x, X + 46, Y + 92, 420); D.logo(x, X - 512 + 46, Y + 92, 420); } }, { repeat: [2, 1.2] }),
};

// ------------------------------------------------------------------ objets réutilisables
function stack(n, w, d, th, top, side, { jitter = 0.01, rot = 0.02 } = {}) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const s = sheet(w, d, th, i === n - 1 ? top : M.edge(), null, side); s.position.set(Math.sin(i * 7.1) * jitter, th / 2 + i * th, Math.cos(i * 3.3) * jitter); s.rotation.y = Math.sin(i * 2.7) * rot; g.add(s); } return g; }
function envelope(w, d, mat) { const g = new THREE.Group(); g.add(sheet(w, d, 0.006, mat || M.paper(tex(800, 560, (x, W, H) => { paperBg(x, W, H, C.p); D.logo(x, 40, 40, 200); x.strokeStyle = C.g; x.lineWidth = 2; x.strokeRect(W * 0.52, H * 0.5, W * 0.4, H * 0.32); D.bars(x, W * 0.55, H * 0.56, W * 0.32, 3, { h: 9, gap: 14 }); })))); return g; }
function pen() { const g = new THREE.Group(); g.add(at(cyl(0.012, 0.012, 0.22, M.color(C.n, 0.35)), [0, 0, 0], [0, 0, Math.PI / 2])); g.add(at(cyl(0.012, 0.002, 0.03, M.metal()), [-0.125, 0, 0], [0, 0, Math.PI / 2])); g.add(at(cyl(0.0125, 0.0125, 0.03, M.color(C.o, 0.4)), [0.08, 0, 0], [0, 0, Math.PI / 2])); g.position.y = 0.012; return g; }
function plant(h = 0.35) { const g = new THREE.Group(); g.add(at(cyl(0.07, 0.055, 0.12, M.color('#E9E4DA', 0.6)), [0, 0.06, 0])); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.SphereGeometry(1, 16, 8), M.color(i % 2 ? '#2E7D5B' : '#3E9970', 0.6)); l.scale.set(0.025, h * 0.4, 0.012); l.position.set(Math.cos(i * 0.9) * 0.03, 0.12 + h * 0.3, Math.sin(i * 0.9) * 0.03); l.rotation.set(Math.sin(i) * 0.5, i * 0.9, Math.cos(i * 1.3) * 0.4); g.add(l); } return g; }

// ------------------------------------------------------------------ produits (slug → scène)
// cam : [azimut°, élévation°, marge] ; azimut 0 = face, positif = vers la droite.
const P = {};

P['cartes-de-visite'] = () => {
  const f = M.paper(ART.cardFront(), 0.6), b = M.paper(ART.cardBack(), 0.6), e = M.edge();
  const g = group(at(stack(14, 0.85, 0.55, 0.004, f, e), [-0.35, 0, 0.1], [0, 0.25, 0]));
  g.add(at(sheet(0.85, 0.55, 0.004, b, f, e), [0.45, 0.03, -0.12], [0.05, -0.45, -0.07]));
  g.add(at(sheet(0.85, 0.55, 0.004, f, b, e), [0.35, 0.002, 0.42], [0, -0.15, 0]));
  return { g, cam: [12, 38, 1.05] };
};
P['cartes-postales'] = () => {
  const art = (i) => M.paper(tex(1480, 1050, (x, w, h) => { x.fillStyle = D.lin(x, 0, 0, 0, h, [[0, '#FFE2B0'], [0.45, '#F7B35B'], [0.46, C.t], [1, C.n]]); x.fillRect(0, 0, w, h); x.fillStyle = '#FFF3DC'; x.beginPath(); x.arc(w * (0.3 + i * 0.2), h * 0.4, 130, 0, 7); x.fill(); x.fillStyle = C.n; [[0.05, 0.22], [0.12, 0.3], [0.2, 0.18], [0.28, 0.26], [0.36, 0.35], [0.46, 0.2], [0.55, 0.28], [0.66, 0.16], [0.75, 0.31], [0.85, 0.22], [0.93, 0.27]].forEach(([X, H]) => x.fillRect(w * X, h * (0.46 - H * 0.6), w * 0.07, h * H * 0.6 + 2)); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 4; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(w * 0.1 + k * 40, h * (0.55 + k * 0.05)); x.lineTo(w * 0.9 - k * 40, h * (0.55 + k * 0.05)); x.stroke(); } D.txt(x, 'ABIDJAN', 70, h - 90, { size: 150, weight: 900, color: C.w }); D.logo(x, w - 330, h - 120, 260, true); }), 0.45);
  const back = M.paper(tex(1480, 1050, (x, w, h) => { paperBg(x, w, h, C.p); x.strokeStyle = C.g; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, 80); x.lineTo(w / 2, h - 80); x.stroke(); for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(w / 2 + 60, 500 + k * 110); x.lineTo(w - 80, 500 + k * 110); x.stroke(); } x.strokeRect(w - 260, 80, 180, 220); D.bars(x, 80, 120, w / 2 - 200, 7, { h: 14, gap: 30 }); D.logo(x, 80, h - 140, 260); }));
  const g = group(at(sheet(1.48, 1.05, 0.005, back, null), [0.25, 0.003, -0.2], [0, 0.35, 0]));
  g.add(at(sheet(1.48, 1.05, 0.005, art(1), back), [-0.2, 0.012, 0.05], [0, -0.12, 0])); g.add(at(sheet(1.48, 1.05, 0.005, art(0), back), [0.15, 0.022, 0.42], [0, 0.08, 0]));
  return { g, cam: [0, 52, 1.0] };
};
P['invitations'] = () => {
  const inside = M.paper(tex(800, 1120, (x, w, h) => { paperBg(x, w, h, '#FFFCF6'); x.strokeStyle = C.o; x.lineWidth = 6; x.strokeRect(36, 36, w - 72, h - 72); x.lineWidth = 2; x.strokeRect(54, 54, w - 108, h - 108); x.fillStyle = C.t; x.beginPath(); x.arc(w / 2, 250, 90, 0, 7); x.fill(); D.txt(x, 'S&P', w / 2, 275, { size: 70, weight: 300, color: C.w, align: 'center' }); D.txt(x, 'INVITATION', w / 2, 470, { size: 74, weight: 300, color: C.td, align: 'center', track: 10 }); D.rr(x, w / 2 - 60, 510, 120, 5, 2, C.o); D.bars(x, w / 2 - 230, 590, 460, 4, { h: 12, gap: 24, color: C.gd }); D.txt(x, 'SAMEDI 12 JUIN', w / 2, 900, { size: 40, weight: 700, color: C.o, align: 'center', track: 4 }); }), 0.7);
  const cover = M.paper(tex(800, 1120, (x, w, h) => { paperBg(x, w, h, C.td); x.strokeStyle = C.o; x.lineWidth = 6; x.strokeRect(36, 36, w - 72, h - 72); D.txt(x, 'S&P', w / 2, h / 2 + 30, { size: 160, weight: 300, color: C.o, align: 'center' }); }), 0.5);
  const card = group(at(panel(0.8, 1.12, 0.006, inside, null), [0, 0.56, 0], [-0.08, 0, 0]));
  const flap = at(panel(0.8, 1.12, 0.006, M.edge(), cover), [0, 0.56, 0], [0, 0, 0]); const hinge = new THREE.Group(); hinge.position.set(-0.4, 0, 0); flap.position.set(0.4, 0.56, 0); hinge.add(flap); hinge.rotation.y = -2.2; card.add(hinge);
  const env = at(envelope(1.0, 0.72, M.paper(tex(1000, 720, (x, w, h) => { paperBg(x, w, h, '#F3E9D6'); x.fillStyle = '#E7D8BC'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, h * 0.55); x.lineTo(w, 0); x.fill(); D.rr(x, w / 2 - 40, h * 0.5, 80, 80, 40, C.o); }), 0.7)), [0.75, 0, 0.45], [0, -0.5, 0]);
  return { g: group(at(card, [-0.25, 0, -0.1], [0, 0.35, 0]), env), cam: [-8, 22, 0.92] };
};
P['flyers'] = () => {
  const e = M.edge(); const g = group(at(stack(30, 1.48, 2.1, 0.0025, M.paper(ART.flyer(0), 0.55), e), [-0.9, 0, 0], [0, 0.18, 0]));
  g.add(at(sheet(1.48, 2.1, 0.003, M.paper(ART.flyer(1), 0.55), null, e), [0.75, 0.002, 0.15], [0, -0.2, 0]));
  const up = at(panel(1.48, 2.1, 0.004, M.paper(ART.flyer(2), 0.5), null, e), [0.35, 1.05, -0.9], [-0.12, -0.25, 0]); g.add(up);
  return { g, cam: [8, 30, 1.0] };
};
P['affiches'] = () => {
  const g = group(at(curved(2.0, 2.83, 0.06, M.paper(ART.poster(0), 0.6)), [-0.6, 1.5, 0], [0, 0.3, 0]));
  g.add(at(curved(2.0, 2.83, 0.05, M.paper(ART.poster(1), 0.6)), [1.4, 1.5, -0.6], [0, -0.25, 0]));
  const roll = at(cyl(0.12, 0.12, 2.0, M.paper(tex(512, 128, (x, w, h) => { x.fillStyle = D.lin(x, 0, 0, w, 0, [[0, C.p], [0.5, '#FFFFFF'], [1, C.g]]); x.fillRect(0, 0, w, h); })), 48), [0.5, 0.12, 1.3], [0, 0.6, Math.PI / 2]); g.add(roll);
  return { g, cam: [0, 14, 1.0] };
};
P['posters-grand-format'] = () => {
  const frame = M.color('#20282B', 0.4, 0.3);
  const g = group(at(panel(3.0, 4.24, 0.03, M.paper(ART.poster(2), 0.6), null, frame), [0, 2.32, 0]));
  [-1, 1].forEach(s => g.add(at(cyl(0.025, 0.025, 4.6, frame), [s * 1.45, 2.3, -0.6], [0.2, 0, 0])));
  g.add(at(panel(1.3, 1.84, 0.02, M.paper(ART.poster(1), 0.6), null, frame), [2.2, 0.92, 0.6], [0, -0.4, 0]));
  return { g, cam: [10, 10, 1.02] };
};
P['papier-en-tete'] = () => {
  const L = M.paper(ART.letter(), 0.85), e = M.edge();
  const g = group(at(stack(20, 0.84, 1.188, 0.002, L, e), [-0.25, 0, 0], [0, 0.12, 0]));
  g.add(at(sheet(0.84, 1.188, 0.002, L, null, e), [0.45, 0.002, 0.2], [0, -0.22, 0]));
  g.add(at(envelope(0.9, 0.45), [0.55, 0.004, -0.6], [0, 0.25, 0])); g.add(at(pen(), [0.15, 0.045, 0.55], [0, 0.9, 0]));
  return { g, cam: [0, 55, 1.05] };
};
P['factures-autocopiantes'] = () => {
  const side = new THREE.MeshStandardMaterial({ map: tex(64, 512, (x, w, h) => { const c = ['#FFFFFF', '#F9D4DA', '#FFF2B3']; for (let i = 0; i < h; i += 4) { x.fillStyle = c[(i / 4) % 3]; x.fillRect(0, i, w, 4); } }), roughness: 0.9 });
  const book = group(mesh(new THREE.BoxGeometry(0.84, 0.12, 1.1), [side, side, M.paper(ART.invoice(), 0.85), M.color(C.td), side, side]));
  book.children[0].position.y = 0.06; const bind = at(mesh(new THREE.BoxGeometry(0.86, 0.13, 0.1), M.color(C.td, 0.5)), [0, 0.065, -0.56]); book.add(bind);
  const g = group(at(book, [-0.2, 0, 0], [0, 0.2, 0]), at(pen(), [0.5, 0, 0.35], [0, -0.6, 0]));
  const b2 = book.clone(); g.add(at(b2, [0.45, 0, -0.75], [0, -0.3, 0]));
  return { g, cam: [5, 48, 1.05] };
};
P['billets-numerotes'] = () => {
  const g = new THREE.Group(); const e = M.edge(); ['0427', '0428', '0429', '0430'].forEach((n, i) => g.add(at(sheet(1.2, 0.44, 0.004, M.paper(ART.ticket(n), 0.55), null, e), [i * 0.08 - 0.1, 0.004 + i * 0.005, i * 0.16 - 0.3], [0, 0.1 - i * 0.12, 0])));
  for (let i = 0; i < 25; i++) g.add(at(sheet(1.2, 0.44, 0.004, M.paper(ART.ticket('0' + (400 + i)), 0.55), null, e), [0.9, 0.004 + i * 0.004, 0.55], [0, -0.35, 0]));
  return { g, cam: [0, 45, 1.04] };
};
P['chemises-a-rabats'] = () => {
  const out = M.paper(tex(900, 1240, (x, w, h) => hero(x, w, h, { title: 'DOSSIER\nDE PRESSE', sub: 2 })), 0.5), inn = M.paper(tex(900, 1240, (x, w, h) => { paperBg(x, w, h, C.tl); x.save(); x.globalAlpha = 0.35; D.dots(x, 0, 0, w, h, 30, 8, C.t); x.restore(); }), 0.6);
  const closed = at(sheet(0.9, 1.24, 0.012, out, inn), [-0.55, 0.006, 0], [0, 0.18, 0]);
  const open = new THREE.Group(); open.add(at(sheet(0.9, 1.24, 0.008, inn, out), [0.45, 0, 0]));
  const lft = at(sheet(0.9, 1.24, 0.008, inn, out), [-0.45, 0.004, 0]); lft.rotation.z = 0.0; open.add(lft);
  open.add(at(sheet(0.86, 0.32, 0.006, inn, out), [0.45, 0.01, 0.45])); open.add(at(sheet(0.8, 1.12, 0.003, M.paper(ART.letter()), null), [0.46, 0.012, -0.02], [0, 0.04, 0]));
  open.add(at(sheet(0.85, 0.55, 0.004, M.paper(ART.cardFront(), 0.6), null), [0.62, 0.016, 0.32], [0, -0.2, 0]));
  return { g: group(closed, at(open, [0.7, 0.02, 0.35], [0, -0.15, 0])), cam: [0, 55, 1.02] };
};
P['brochures'] = () => {
  const cov = M.paper(ART.cover('BROCHURE\n2027', 0), 0.45), sp = M.paper(ART.spread(), 0.6), e = M.edge();
  const closed = group(at(mesh(new THREE.BoxGeometry(0.9, 0.03, 1.27), [e, e, cov, M.edge(), e, e]), [0, 0.015, 0]));
  const open = group(at(curved(1.8, 1.27, -0.04, sp), [0, 0.03, 0], [-Math.PI / 2, 0, 0])); open.children[0].rotation.set(-Math.PI / 2, 0, 0);
  const st = at(cyl(0.004, 0.004, 0.08, M.metal()), [0, 0.035, 0.3], [Math.PI / 2, 0, 0]); open.add(st, at(st.clone(), [0, 0.035, -0.3], [Math.PI / 2, 0, 0]));
  return { g: group(at(closed, [-0.95, 0, -0.35], [0, 0.3, 0]), at(open, [0.45, 0, 0.25], [0, -0.12, 0])), cam: [0, 50, 1.0] };
};
P['catalogues'] = () => {
  const cov = (i) => M.paper(ART.cover('CATALOGUE\n2027', i), 0.4); const e = M.edge();
  const spine = M.paper(tex(128, 1272, (x, w, h) => { x.fillStyle = C.td; x.fillRect(0, 0, w, h); x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); D.txt(x, 'CATALOGUE 2027', 0, 18, { size: 54, weight: 900, color: C.w, align: 'center' }); x.restore(); }));
  const book = (i) => mesh(new THREE.BoxGeometry(0.9, 1.27, 0.12), [e, spine, e, e, cov(i), M.color(C.td)]);
  const stand = at(book(0), [-0.35, 0.635, 0], [0, 0.35, 0]); const lie = at(book(1), [0.5, 0.06, 0.55], [-Math.PI / 2, 0, 0.25]);
  const lie2 = at(book(0), [0.55, 0.18, 0.5], [-Math.PI / 2, 0, -0.1]);
  return { g: group(stand, lie, lie2), cam: [-10, 22, 1.02] };
};
P['magazines'] = () => {
  const cov = (i) => M.gloss(tex(900, 1200, (x, w, h) => { hero(x, w, h, { title: '', sub: 0, logo: false, seed: i }); D.txt(x, 'MAGAZINE', w / 2, 170, { size: 150, weight: 900, color: C.w, align: 'center', track: 4 }); D.txt(x, 'N°' + (12 + i), w - 60, 240, { size: 46, weight: 700, color: C.o, align: 'right' }); D.txt(x, 'L\'imprimé', 60, h * 0.66, { size: 96, weight: 900, color: C.w }); D.txt(x, 'du futur', 60, h * 0.74, { size: 96, weight: 300, color: C.o }); D.bars(x, 60, h * 0.79, w * 0.5, 2, { h: 16, gap: 16, color: 'rgba(255,255,255,.6)' }); D.logo(x, 60, h - 110, 220, true); }), 0.22);
  const g = new THREE.Group(); g.add(at(curved(0.9, 1.2, 0.025, cov(0)), [0.05, 0.03, 0], [-Math.PI / 2 + 0.0, 0, 0.2]));
  for (let i = 0; i < 6; i++) g.add(at(sheet(0.9, 1.2, 0.004, M.gloss(i === 5 ? null : null), null), [0.05 + i * 0.002, 0.003 + i * 0.004, 0.002 * i], [0, 0.2 - i * 0.01, 0]));
  g.add(at(curved(0.9, 1.2, 0.02, cov(1)), [-0.85, 0.66, -0.3], [0.08, 0.35, 0]));
  return { g, cam: [0, 35, 1.02] };
};
P['autocollants-planches'] = () => {
  const sheetTex = tex(1000, 1414, (x, w, h) => { paperBg(x, w, h, '#FFFFFF'); const s = [ART.stickerArt(0), ART.stickerArt(1), ART.stickerArt(2), ART.stickerArt(3)].map(t => t.image); for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { const X = 70 + i * 300, Y = 90 + j * 320, k = (i + j) % 4; x.save(); x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 6; x.beginPath(); k === 1 || k === 3 ? x.arc(X + 130, Y + 130, 125, 0, 7) : x.roundRect(X + 5, Y + 5, 250, 250, 36); x.fillStyle = '#fff'; x.fill(); x.restore(); x.save(); x.beginPath(); k === 1 || k === 3 ? x.arc(X + 130, Y + 130, 112, 0, 7) : x.roundRect(X + 18, Y + 18, 224, 224, 28); x.clip(); x.drawImage(s[k], X + 18, Y + 18, 224, 224); x.restore(); } });
  const g = group(at(curved(1.0, 1.414, 0.03, M.gloss(sheetTex, 0.35)), [-0.35, 0.02, 0], [-Math.PI / 2, 0, 0.15]));
  g.add(at(curved(1.0, 1.414, 0.05, M.gloss(sheetTex, 0.35)), [0.55, 0.05, -0.15], [-Math.PI / 2 + 0.06, 0, -0.2]));
  return { g, cam: [0, 55, 1.0] };
};
function sticker(k, r, round) { const sh = new THREE.Shape(); if (round) sh.absarc(0, 0, r, 0, Math.PI * 2, false); else { const s = r * 1.8, q = r * 0.35; sh.moveTo(-s / 2 + q, -s / 2); sh.lineTo(s / 2 - q, -s / 2); sh.quadraticCurveTo(s / 2, -s / 2, s / 2, -s / 2 + q); sh.lineTo(s / 2, s / 2 - q); sh.quadraticCurveTo(s / 2, s / 2, s / 2 - q, s / 2); sh.lineTo(-s / 2 + q, s / 2); sh.quadraticCurveTo(-s / 2, s / 2, -s / 2, s / 2 - q); sh.lineTo(-s / 2, -s / 2 + q); sh.quadraticCurveTo(-s / 2, -s / 2, -s / 2 + q, -s / 2); }
  const art = ART.stickerArt(k); const t = tex(820, 820, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.save(); x.beginPath(); round ? x.arc(w / 2, h / 2, w / 2 - 34, 0, 7) : x.roundRect(34, 34, w - 68, h - 68, 120); x.clip(); x.drawImage(art.image, 34, 34, w - 68, h - 68); x.restore(); });
  const m = shapeMesh(sh, M.gloss(t, 0.25), 0.006); m.rotation.x = -Math.PI / 2; return m; }
P['stickers-personnalises'] = () => {
  const g = new THREE.Group(); [[0, 0.32, 0, [-0.55, 0.01, 0.15], 0.3], [1, 0.3, 1, [0.25, 0.02, -0.35], -0.2], [2, 0.26, 0, [0.6, 0.012, 0.38], 0.5], [3, 0.28, 1, [-0.1, 0.016, 0.62], -0.4], [1, 0.22, 1, [-0.7, 0.008, -0.45], 0.2], [0, 0.2, 0, [0.95, 0.01, -0.2], -0.6]].forEach(([k, r, round, p, ry]) => { const s = sticker(k, r, round); s.position.set(...p); s.rotation.z = ry; g.add(s); });
  const curl = sticker(3, 0.28, 0); curl.position.set(0.2, 0.25, 0.15); curl.rotation.set(-1.1, 0.3, 0.4); g.add(curl);
  return { g, cam: [0, 58, 1.02] };
};
P['etiquettes-adhesives'] = () => {
  const jar = new THREE.Group(); const glass = new THREE.MeshPhysicalMaterial({ color: '#F2A93B', roughness: 0.15, transmission: 0.0, transparent: true, opacity: 0.92, clearcoat: 1, envMapIntensity: 1.2 });
  jar.add(at(cyl(0.3, 0.3, 0.7, glass), [0, 0.35, 0])); jar.add(at(cyl(0.31, 0.31, 0.16, M.color(C.td, 0.45)), [0, 0.78, 0]));
  const lab = at(mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.34, 64, 1, true, -1.2, 2.4), M.paper(ART.label(0), 0.6)), [0, 0.36, 0]); lab.material.side = THREE.DoubleSide; jar.add(lab);
  const bottle = new THREE.Group(); bottle.add(at(cyl(0.18, 0.2, 0.85, new THREE.MeshPhysicalMaterial({ color: '#8E1B3A', roughness: 0.12, clearcoat: 1, envMapIntensity: 1.2 })), [0, 0.425, 0])); bottle.add(at(cyl(0.07, 0.17, 0.22, M.color('#8E1B3A', 0.15)), [0, 0.96, 0])); bottle.add(at(cyl(0.075, 0.075, 0.12, M.color(C.o, 0.4)), [0, 1.12, 0]));
  const bl = at(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.36, 64, 1, true, -1.15, 2.3), M.paper(ART.label(1), 0.6)), [0, 0.42, 0]); bl.material.side = THREE.DoubleSide; bottle.add(bl);
  const sheetT = tex(900, 1270, (x, w, h) => { paperBg(x, w, h, '#FFFFFF'); for (let j = 0; j < 5; j++) for (let i = 0; i < 2; i++) { x.save(); x.beginPath(); x.roundRect(60 + i * 400, 60 + j * 236, 380, 210, 22); x.clip(); x.drawImage(ART.label(i + j).image, 60 + i * 400, 60 + j * 236, 380, 236); x.restore(); } });
  const sh = at(sheet(0.9, 1.27, 0.003, M.paper(sheetT, 0.5), null), [0.3, 0.002, 0.55], [0, -0.3, 0]);
  return { g: group(at(jar, [-0.55, 0, -0.1]), at(bottle, [0.25, 0, -0.45]), sh), cam: [0, 20, 1.04] };
};
P['etiquettes-rouleau'] = () => {
  const strip = tex(4096, 256, (x, w, h) => { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { x.save(); x.beginPath(); x.roundRect(i * 340 + 20, 18, 300, h - 36, 26); x.clip(); x.drawImage(ART.label(i).image, i * 340 + 20, 18, 300, h - 36); x.restore(); } });
  const roll = new THREE.Group(); const side = new THREE.MeshStandardMaterial({ map: tex(512, 512, (x, w, h) => { x.fillStyle = '#F4F2EE'; x.fillRect(0, 0, w, h); x.strokeStyle = '#E2DED6'; for (let r = 60; r < 256; r += 5) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); } x.fillStyle = '#C8A97A'; x.beginPath(); x.arc(256, 256, 60, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,0)'; }), roughness: 0.85 });
  const wrapT = strip.clone(); wrapT.needsUpdate = true; wrapT.wrapS = THREE.RepeatWrapping; wrapT.repeat.set(1.4, 1);
  roll.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 96), [M.paper(wrapT, 0.5), side, side]));
  roll.add(at(cyl(0.1, 0.1, 0.285, M.color('#B8936A', 0.8), 48, true), [0, 0, 0])); roll.rotation.x = Math.PI / 2; roll.position.y = 0.42;
  const curve = new THREE.CatmullRomCurve3([V(0, 0.84, 0), V(0.35, 0.8, 0), V(0.62, 0.5, 0), V(0.8, 0.15, 0), V(1.1, 0.005, 0), V(2.0, 0.005, 0)]);
  const tail = ribbon(curve, 0.28, M.paper(strip, 0.5), 220, V(0, 0, 1)); tail.material.map.wrapS = THREE.RepeatWrapping;
  return { g: group(at(group(roll, tail), [-0.6, 0, 0], [0, -0.5, 0])), cam: [10, 22, 1.02] };
};
P['badges-de-salon'] = () => {
  const strap = M.paper(tex(2048, 64, (x, w, h) => { x.fillStyle = C.t; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) D.txt(x, 'SYMO PRINT', 40 + i * 256, 44, { size: 34, weight: 900, color: C.w }); }), 0.6);
  const mk = (role, p, r) => { const g = new THREE.Group(); g.add(at(rbox(0.7, 1.0, 0.012, 0.03, new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.25, clearcoat: 1 })), [0, 0, 0])); g.add(at(panel(0.66, 0.94, 0.004, M.paper(ART.badge(role), 0.55), null), [0, -0.01, 0.001])); g.add(at(mesh(new THREE.TorusGeometry(0.04, 0.008, 12, 32), M.metal()), [0, 0.53, 0]));
    const c = new THREE.CatmullRomCurve3([V(0, 0.55, 0), V(-0.3, 0.9, -0.02), V(-0.42, 1.35, -0.03), V(0, 1.6, -0.03), V(0.42, 1.35, -0.03), V(0.3, 0.9, -0.02), V(0, 0.55, 0)]); g.add(ribbon(c, 0.06, strap, 200, V(0, 0, 1))); return at(g, p, r); };
  const a = mk('INVITÉ', [-0.35, 0.03, 0.2], [-Math.PI / 2, 0, 0.3]); const b = mk('VISITEUR', [0.55, 0.06, -0.15], [-Math.PI / 2, 0, -0.25]);
  return { g: group(a, b), cam: [0, 62, 0.9] };
};
P['bracelets-evenementiels'] = () => {
  const band = (c1, c2, label) => M.paper(tex(2048, 96, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { D.txt(x, label, 60 + i * 340, 66, { size: 46, weight: 900, color: c2, track: 3 }); } }), 0.75);
  const g = new THREE.Group(); [[C.o, C.n, 'VIP', [-0.4, 0, 0], 0.2], [C.t, C.w, 'ACCÈS', [0.35, 0, -0.25], -0.3], [C.n, C.o, 'STAFF', [0.1, 0, 0.45], 0.9]].forEach(([c1, c2, l, p, ry]) => { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(V(Math.cos(a) * 0.36, 0.26 + Math.sin(a) * 0.24, Math.sin(a * 2) * 0.02)); } const c = new THREE.CatmullRomCurve3(pts, true); const r = ribbon(c, 0.16, band(c1, c2, l), 220, V(0, 0, 1)); r.position.set(...p); r.rotation.set(-1.1, ry, 0); g.add(r); });
  return { g, cam: [0, 40, 1.05] };
};
P['tampons'] = () => {
  const body = new THREE.Group(); body.add(at(rbox(0.62, 0.42, 0.36, 0.05, M.color(C.n, 0.35)), [0, 0.32, 0])); body.add(at(rbox(0.5, 0.14, 0.3, 0.04, M.color(C.o, 0.35)), [0, 0.6, 0])); body.add(at(mesh(new THREE.BoxGeometry(0.64, 0.08, 0.37), M.color('#2A3A3F', 0.5)), [0, 0.07, 0]));
  const window_ = at(panel(0.4, 0.13, 0.002, M.paper(tex(400, 130, (x, w, h) => { paperBg(x, w, h); D.logo(x, 60, 18, 280); })), null), [0, 0.32, 0.182]); body.add(window_);
  const imprint = tex(1200, 900, (x, w, h) => { paperBg(x, w, h, '#FFFEFB'); x.globalAlpha = 0.85; x.strokeStyle = C.t; x.lineWidth = 10; x.beginPath(); x.roundRect(260, 290, 680, 330, 30); x.stroke(); x.drawImage(IMG.logo, 330, 340, 540, 165); D.txt(x, 'ABIDJAN · CÔTE D\'IVOIRE', 600, 570, { size: 34, weight: 800, color: C.t, align: 'center', track: 2 }); x.globalAlpha = 1; });
  const paperS = at(sheet(1.2, 0.9, 0.003, M.paper(imprint, 0.9), null), [0.25, 0.002, 0.2], [0, -0.12, 0]);
  return { g: group(at(body, [-0.55, 0, -0.25], [0, 0.55, 0]), paperS), cam: [0, 40, 1.0] };
};
P['cles-usb'] = () => {
  const mk = (c) => { const g = new THREE.Group(); g.add(at(rbox(0.9, 0.14, 0.3, 0.06, M.color(c, 0.3)), [0, 0.06, 0])); const top = at(panel(0.46, 0.17, 0.001, M.paper(tex(500, 180, (x, w, h) => { x.clearRect(0, 0, w, h); D.logo(x, 20, 20, 460, c !== '#FFFFFF'); }), 0.4), null), [-0.2, 0.1335, 0], [-Math.PI / 2, 0, 0]); top.material[4].transparent = true; top.material[4].alphaTest = 0.05; g.add(top);
    g.add(at(mesh(new THREE.BoxGeometry(0.28, 0.07, 0.2), M.metal()), [0.55, 0.06, 0])); const sw = at(mesh(new THREE.BoxGeometry(0.5, 0.016, 0.32), M.metal('#C9D1D4', 0.2)), [0.43, 0.13, 0]); g.add(sw); g.add(at(mesh(new THREE.TorusGeometry(0.06, 0.012, 12, 32), M.metal()), [-0.5, 0.06, 0], [Math.PI / 2, 0, 0])); return g; };
  return { g: group(at(mk(C.t), [-0.15, 0, 0.25], [0, 0.25, 0]), at(mk(C.o), [0.35, 0, -0.3], [0, -0.35, 0]), at(mk(C.n), [-0.5, 0, -0.5], [0, 0.7, 0])), cam: [0, 42, 0.92] };
};
P['mugs-ceramique'] = () => {
  const wrap = (light) => M.gloss(tex(2048, 800, (x, w, h) => { paperBg(x, w, h, light ? '#FFFFFF' : C.n); if (light) { D.logo(x, w * 0.33, h * 0.3, w * 0.34); D.rr(x, w * 0.36, h * 0.72, w * 0.28, 26, 13, C.o); } else { x.save(); x.beginPath(); x.rect(w * 0.29, 0, w * 0.42, h); x.clip(); x.translate(w * 0.29, 0); hero(x, w * 0.42, h, { title: 'BONJOUR', sub: 0, logo: false, tsize: 104 }); x.restore(); D.logo(x, w * 0.38, h * 0.76, w * 0.24, true); } }), 0.16);
  const mug = (light) => { const g = new THREE.Group(); const col = light ? '#FFFFFF' : C.n; const body = mesh(new THREE.CylinderGeometry(0.4, 0.38, 0.95, 96, 1, true), wrap(light)); body.material.side = THREE.FrontSide; body.position.y = 0.475; g.add(body);
    g.add(at(cyl(0.38, 0.38, 0.02, M.color(col, 0.25)), [0, 0.01, 0])); g.add(at(mesh(new THREE.TorusGeometry(0.39, 0.012, 12, 96), M.color(col, 0.2)), [0, 0.95, 0], [Math.PI / 2, 0, 0]));
    const inner = at(cyl(0.38, 0.36, 0.92, M.color(light ? '#F3F3F1' : C.o, 0.25), 96, true), [0, 0.49, 0]); inner.material.side = THREE.BackSide; g.add(inner); g.add(at(cyl(0.36, 0.36, 0.01, M.color(light ? '#EDEDEA' : C.od, 0.3)), [0, 0.04, 0]));
    g.add(at(mesh(new THREE.TorusGeometry(0.2, 0.045, 24, 64, Math.PI * 1.2), M.color(col, 0.2)), [-0.4, 0.5, 0], [0, 0, Math.PI * 0.4])); return g; };
  return { g: group(at(mug(false), [-0.5, 0, 0.05], [0, Math.PI + 0.22, 0]), at(mug(true), [0.55, 0, -0.4], [0, Math.PI - 0.6, 0])), cam: [0, 16, 1.02] };
};
function rollStand(title, i) {
  const base = M.metal('#C3CBCE', 0.25); const g = new THREE.Group();
  g.add(at(rbox(1.0, 0.1, 0.24, 0.045, base), [0, 0.05, 0])); g.add(at(panel(0.96, 2.2, 0.004, M.paper(ART.tall(title, i), 0.55), null), [0, 1.2, 0.02])); g.add(at(cyl(0.012, 0.012, 2.15, base), [0, 1.13, -0.05])); g.add(at(cyl(0.015, 0.015, 0.98, base), [0, 2.3, 0.02], [0, 0, Math.PI / 2]));
  [-1, 1].forEach(s => g.add(at(rbox(0.06, 0.03, 0.3, 0.01, base), [s * 0.4, 0.015, 0.05], [0, s * 0.6, 0]))); return g;
}
P['roll-up'] = () => ({ g: group(at(rollStand('VOTRE\nMESSAGE', 0), [-0.62, 0, 0.1], [0, 0.22, 0]), at(rollStand('IMPRESSION\nPRO', 1), [0.7, 0, -0.35], [0, -0.28, 0])), cam: [0, 8, 1.0] });
P['kakemono'] = () => {
  const bar = M.metal('#C3CBCE', 0.25); const k = (t, i) => { const g = new THREE.Group(); g.add(at(panel(0.8, 2.0, 0.003, M.paper(ART.tall(t, i), 0.55), null), [0, 1.0, 0])); g.add(at(cyl(0.02, 0.02, 0.84, bar), [0, 2.01, 0], [0, 0, Math.PI / 2])); g.add(at(cyl(0.02, 0.02, 0.84, bar), [0, -0.01, 0], [0, 0, Math.PI / 2]));
    const cord = new THREE.CatmullRomCurve3([V(-0.38, 2.02, 0), V(-0.2, 2.35, 0), V(0, 2.55, 0), V(0.2, 2.35, 0), V(0.38, 2.02, 0)]); g.add(mesh(new THREE.TubeGeometry(cord, 64, 0.006, 8), M.color(C.n, 0.6))); return g; };
  return { g: group(at(k('BIENVENUE', 0), [-0.5, 0.35, 0], [0, 0.2, 0]), at(k('NOS\nSERVICES', 1), [0.55, 0.25, -0.4], [0, -0.2, 0])), cam: [0, 4, 1.02] };
};
P['backdrop-mur-image'] = () => {
  const wall = curved(4.4, 2.4, -0.35, M.paper(ART.logoWall(), 0.7), 64); wall.position.set(0, 1.25, 0);
  const g = group(wall); const fr = M.metal('#2A3236', 0.4); [-2.15, 2.15].forEach(x => g.add(at(cyl(0.03, 0.03, 2.5, fr), [x, 1.25, -0.25]))); g.add(at(rbox(4.6, 0.04, 0.5, 0.02, fr), [0, 0.02, -0.15])); g.add(at(rbox(1.0, 0.9, 0.5, 0.04, M.color(C.n, 0.5)), [-1.2, 0.45, 0.9], [0, 0.3, 0])); g.add(at(panel(0.9, 0.5, 0.01, M.paper(tex(900, 500, (x, w, h) => { x.fillStyle = C.o; x.fillRect(0, 0, w, h); D.logo(x, 120, 150, 660, true); }), 0.5), null), [-1.12, 0.5, 1.16], [0, 0.3, 0]));
  g.add(at(plant(0.6), [1.9, 0, 0.6]));
  return { g, cam: [8, 10, 0.86] };
};
P['comptoirs-publicitaires'] = () => {
  const front = curved(1.6, 0.95, -0.22, M.paper(ART.wide('BIENVENUE', 0), 0.5), 64); front.position.set(0, 0.5, 0.12);
  const top = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.85, -0.2); sh.quadraticCurveTo(0, 0.25, 0.85, -0.2); sh.lineTo(0.85, -0.55); sh.quadraticCurveTo(0, -0.15, -0.85, -0.55); sh.lineTo(-0.85, -0.2); const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), M.color('#C99A62', 0.45)); m.rotation.x = Math.PI / 2; m.position.y = 1.0; return m; })();
  const g = group(front, top); g.add(at(cyl(0.3, 0.3, 0.97, M.color(C.n, 0.6)), [0, 0.49, -0.25]));
  const roll = rollStand('BIENVENUE', 1); roll.scale.setScalar(0.95); g.add(at(roll, [1.25, 0, -0.5], [0, -0.35, 0]));
  return { g, cam: [-10, 12, 1.02] };
};
P['presentoirs-plv'] = () => {
  const card = M.paper(tex(800, 1600, (x, w, h) => hero(x, w, h, { title: 'NOUVEAU', sub: 2 })), 0.7), side = M.color('#E7D6B8', 0.9), shelf = M.color(C.t, 0.6);
  const g = new THREE.Group(); g.add(at(panel(0.8, 1.6, 0.02, card, null, side), [0, 0.8, -0.25])); [-1, 1].forEach(s => g.add(at(mesh(new THREE.BoxGeometry(0.02, 1.1, 0.5), side), [s * 0.4, 0.55, 0])));
  for (let i = 0; i < 3; i++) { g.add(at(mesh(new THREE.BoxGeometry(0.78, 0.02, 0.5), shelf), [0, 0.12 + i * 0.36, 0])); g.add(at(panel(0.78, 0.12, 0.01, M.paper(tex(780, 120, (x, w, h) => { x.fillStyle = C.o; x.fillRect(0, 0, w, h); D.logo(x, w / 2 - 140, 18, 280, true); })), null, side), [0, 0.17 + i * 0.36, 0.25]));
    for (let j = 0; j < 4; j++) g.add(at(rbox(0.13, 0.22, 0.13, 0.02, M.color([C.td, C.o, C.n, '#FFFFFF'][(i + j) % 4], 0.4)), [-0.27 + j * 0.18, 0.24 + i * 0.36, 0])); }
  return { g, cam: [12, 14, 1.02] };
};
P['stand-parapluie'] = () => {
  const wall = curved(3.4, 2.3, -0.45, M.paper(ART.wide('VOTRE STAND', 0), 0.6), 80); wall.position.set(0, 1.2, 0);
  const g = group(wall); [-1, 1].forEach(s => g.add(at(curved(0.6, 2.3, -0.12, M.color(C.td, 0.55)), [s * 1.72, 1.2, 0.5], [0, s * -1.25, 0])));
  g.add(at(cyl(0.28, 0.28, 0.9, M.paper(tex(1024, 400, (x, w, h) => { x.fillStyle = C.o; x.fillRect(0, 0, w, h); D.logo(x, w / 2 - 260, 120, 520, true); }), 0.5)), [0.6, 0.45, 1.3]));
  return { g, cam: [8, 10, 0.9] };
};
P['stop-trottoir'] = () => {
  const frame = M.metal('#C3CBCE', 0.3); const face = (i) => M.paper(ART.poster(i), 0.5);
  const half = (i) => { const g = new THREE.Group(); g.add(at(panel(0.7, 0.99, 0.01, face(i), M.color('#B9C2C6', 0.4), frame), [0, 0, 0])); g.add(at(mesh(new THREE.BoxGeometry(0.78, 0.04, 0.03), frame), [0, 0.52, 0])); g.add(at(mesh(new THREE.BoxGeometry(0.78, 0.04, 0.03), frame), [0, -0.52, 0])); [-1, 1].forEach(s => g.add(at(mesh(new THREE.BoxGeometry(0.04, 1.08, 0.03), frame), [s * 0.37, 0, 0]))); return g; };
  const a = half(0); const b = half(1); const hingeY = 1.12;
  const A = new THREE.Group(); a.position.set(0, -0.54, 0); A.add(a); A.position.set(0, hingeY, 0); A.rotation.x = -0.2;
  const B = new THREE.Group(); b.position.set(0, -0.54, 0); b.rotation.y = Math.PI; B.add(b); B.position.set(0, hingeY, 0); B.rotation.x = 0.2;
  return { g: group(at(group(A, B), [0, 0, 0], [0, 0.55, 0])), cam: [0, 10, 1.02] };
};
function flagShape(feather) { const s = new THREE.Shape(); if (feather) { s.moveTo(0, 0); s.lineTo(0, 3.0); s.quadraticCurveTo(0.2, 3.35, 0.7, 3.2); s.quadraticCurveTo(0.95, 2.6, 0.95, 1.2); s.quadraticCurveTo(0.9, 0.4, 0.6, 0); s.lineTo(0, 0); } else { s.moveTo(0, 0); s.lineTo(0, 3.0); s.lineTo(0.95, 3.0); s.lineTo(0.95, 0.5); s.lineTo(0, 0); } return s; }
function flag(feather, title, i) {
  const g = new THREE.Group(); const pole = M.metal('#9AA5A9', 0.35); const t = tex(700, 2200, (x, w, h) => hero(x, w, h, { title, sub: 2, seed: i, tsize: 120 }));
  const m = shapeMesh(flagShape(feather), M.paper(t, 0.6)); const p = m.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getY(k) * 1.3 + p.getX(k) * 2) * 0.05 * p.getX(k)); m.geometry.computeVertexNormals(); m.position.set(0.03, 0.5, 0); g.add(m);
  g.add(at(cyl(0.018, 0.022, 3.95, pole), [0, 1.975, 0])); if (!feather) g.add(at(cyl(0.014, 0.014, 0.97, pole), [0.48, 3.5, 0], [0, 0, Math.PI / 2]));
  for (let k = 0; k < 4; k++) g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.04), M.color('#2A3236', 0.5)), [Math.cos(k * Math.PI / 2) * 0.2, 0.015, Math.sin(k * Math.PI / 2) * 0.2], [0, -k * Math.PI / 2, 0]));
  return g;
}
P['drapeaux-plume'] = () => ({ g: group(at(flag(true, 'SOLDES', 0), [-0.7, 0, 0], [0, 0.25, 0]), at(flag(true, 'OUVERT', 1), [0.6, 0, -0.5], [0, -0.15, 0])), cam: [0, 6, 1.0] });
P['oriflammes'] = () => ({ g: group(at(flag(false, 'BIENVENUE', 0), [-0.7, 0, 0], [0, 0.25, 0]), at(flag(false, 'NOUVEAU', 1), [0.6, 0, -0.5], [0, -0.15, 0])), cam: [0, 6, 1.0] });
P['banderoles'] = () => {
  const b = curved(3.6, 1.2, 0, M.paper(ART.wide('GRANDE OUVERTURE', 0), 0.6), 80, 0.06); b.position.set(0, 1.9, 0);
  const g = group(b); const pole = M.metal('#9AA5A9', 0.35); [-2.25, 2.25].forEach(x => { g.add(at(cyl(0.035, 0.04, 2.8, pole), [x, 1.4, -0.05])); g.add(at(cyl(0.18, 0.2, 0.06, M.color('#2A3236', 0.5)), [x, 0.03, -0.05])); });
  [[-1.78, 2.48], [1.78, 2.48], [-1.78, 1.32], [1.78, 1.32]].forEach(([x, y]) => { g.add(at(mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 24), M.metal()), [x, y, 0.01])); const c = new THREE.CatmullRomCurve3([V(x, y, 0), V(x + Math.sign(x) * 0.25, y + 0.02, -0.02), V(Math.sign(x) * 2.25, y + 0.04, -0.05)]); g.add(mesh(new THREE.TubeGeometry(c, 20, 0.007, 6), M.color('#EDE6D8', 0.8))); });
  return { g, cam: [0, 8, 1.0] };
};
function windowPane(graphic, micro) {
  const g = new THREE.Group(); const glass = new THREE.MeshPhysicalMaterial({ color: '#BFD9DF', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 1.4 });
  g.add(at(mesh(new THREE.BoxGeometry(2.4, 1.8, 0.02), glass), [0, 1.0, 0])); const fr = M.color('#2A3236', 0.35, 0.4);
  [[0, 1.92, 2.56, 0.08], [0, 0.08, 2.56, 0.08]].forEach(([x, y, w, h]) => g.add(at(mesh(new THREE.BoxGeometry(w, h, 0.1), fr), [x, y, 0]))); [-1.24, 1.24].forEach(x => g.add(at(mesh(new THREE.BoxGeometry(0.08, 1.92, 0.1), fr), [x, 1.0, 0])));
  const dec = new THREE.MeshStandardMaterial({ map: graphic, transparent: true, roughness: 0.4, envMapIntensity: 0.7, alphaTest: 0.02 });
  if (micro) dec.alphaMap = tex(1024, 768, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; for (let j = 0; j < h; j += 7) for (let i = 0; i < w; i += 7) { x.beginPath(); x.arc(i + 3.5, j + 3.5, 1.9, 0, 7); x.fill(); } }, { data: true });
  g.add(at(mesh(new THREE.PlaneGeometry(2.4, 1.8), dec), [0, 1.0, 0.012])); return g;
}
P['vinyle-adhesif'] = () => {
  const graphic = tex(1600, 1200, (x, w, h) => { x.clearRect(0, 0, w, h); x.drawImage(IMG.logoL, w * 0.12, h * 0.16, w * 0.76, w * 0.76 * 189 / 619); D.txt(x, 'IMPRESSION · GRAND FORMAT', w / 2, h * 0.62, { size: 72, weight: 800, color: C.w, align: 'center', track: 4 }); D.rr(x, w * 0.3, h * 0.7, w * 0.4, 12, 6, C.o); D.txt(x, 'Ouvert du lundi au samedi', w / 2, h * 0.84, { size: 56, weight: 600, color: C.w, align: 'center' }); });
  const wall = at(mesh(new THREE.BoxGeometry(3.4, 2.4, 0.1), M.color('#0F3A43', 0.8)), [0, 1.2, -0.08]);
  return { g: group(wall, windowPane(graphic, false)), cam: [-14, 6, 1.0] };
};
P['micro-perfore'] = () => {
  const graphic = tex(1600, 1200, (x, w, h) => hero(x, w, h, { title: 'VITRINE\nIMPRIMÉE', sub: 2, seed: 1 }));
  const wall = at(mesh(new THREE.BoxGeometry(3.4, 2.4, 0.1), M.color('#E9E4DA', 0.8)), [0, 1.2, -0.08]);
  return { g: group(wall, windowPane(graphic, true)), cam: [14, 6, 1.0] };
};
P['depliants'] = () => {
  const outside = M.paper(tex(2520, 1190, (x, w, h) => { const p = w / 3; x.save(); x.beginPath(); x.rect(2 * p, 0, p, h); x.clip(); x.translate(2 * p, 0); hero(x, p, h, { title: 'DÉPLIANT', sub: 2, tsize: 96 }); x.restore(); paperBg(x, 0, 0, 0); x.fillStyle = C.p; x.fillRect(0, 0, 2 * p, h); D.bars(x, 70, 120, p - 140, 9, { h: 14, gap: 26 }); D.logo(x, p + 80, h * 0.4, p - 160); }), 0.55);
  const inside = M.paper(tex(2520, 1190, (x, w, h) => { paperBg(x, w, h); const p = w / 3; for (let k = 0; k < 3; k++) { D.rr(x, k * p + 60, 80, p - 120, 380, 18, [C.tl, '#FDEBCB', C.tl][k]); D.mark(x, k * p + p / 2 - 90, 180, 180); D.txt(x, ['Conseil', 'Création', 'Impression'][k], k * p + 60, 560, { size: 64, weight: 900, color: C.t }); D.bars(x, k * p + 60, 610, p - 120, 8, { h: 14, gap: 26 }); } }), 0.55);
  const W = 0.84, H = 1.19; const pane = (u0) => { const g = new THREE.PlaneGeometry(W, H); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (u0 + uv.getX(i)) / 3); return g; };
  const mk = (u0) => { const gg = new THREE.Group(); const f = mesh(pane(u0), inside.clone()); f.material.side = THREE.FrontSide; const b = mesh(pane(2 - u0), outside.clone()); b.rotation.y = Math.PI; b.material.side = THREE.FrontSide; gg.add(f, b); return gg; };
  const mid = mk(1); mid.position.set(0, H / 2, 0);
  const l = mk(0); l.position.set(-W / 2, 0, 0); const L = new THREE.Group(); L.add(l); L.position.set(-W / 2, H / 2, 0); L.rotation.y = 0.55;
  const r = mk(2); r.position.set(W / 2, 0, 0); const Rr = new THREE.Group(); Rr.add(r); Rr.position.set(W / 2, H / 2, 0); Rr.rotation.y = -0.55;
  const g = group(mid, L, Rr); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g: group(at(g, [0, 0, 0], [0, 0, 0])), cam: [0, 14, 1.02] };
};


// ------------------------------------------------------------------ visuels de mise en scène pour le site (accueil, en-têtes de rubrique)
P['scene-gamme'] = () => {
  const g = new THREE.Group();
  g.add(at(rollStand('VOTRE\nMESSAGE', 0), [-0.95, 0, -0.9], [0, 0.35, 0]));
  const f = M.paper(ART.cardFront(), 0.6), b = M.paper(ART.cardBack(), 0.6);
  g.add(at(stack(10, 0.85, 0.55, 0.004, f, M.edge()), [0.55, 0, 0.55], [0, -0.35, 0]));
  g.add(at(sheet(0.85, 0.55, 0.004, b, f), [0.9, 0.05, 0.25], [0.05, -0.8, 0]));
  g.add(at(stack(18, 1.05, 1.48, 0.003, M.paper(ART.flyer(1), 0.55), M.edge()), [-0.2, 0, 0.6], [0, 0.25, 0]));
  const mug = P['mugs-ceramique']().g.children[0]; mug.scale.setScalar(0.75); g.add(at(mug, [0.75, 0, -0.55], [0, Math.PI + 0.3, 0]));
  [[0, 0.22, 0, [1.35, 0.01, 0.75], 0.4], [1, 0.2, 1, [1.15, 0.012, 1.1], -0.3], [3, 0.2, 0, [-0.95, 0.01, 1.05], 0.2]].forEach(([k, r, round, p, rz]) => { const st = sticker(k, r, round); st.position.set(...p); st.rotation.z = rz; g.add(st); });
  return { g, cam: [4, 22, 0.9] };
};
P['scene-impression'] = () => ({ g: group(at(P['brochures']().g, [0, 0, -0.4]), at(P['cartes-de-visite']().g, [1.3, 0, 0.6], [0, -0.3, 0]), at(stack(14, 1.05, 1.48, 0.003, M.paper(ART.flyer(0), 0.55), M.edge()), [-1.4, 0, 0.6], [0, 0.3, 0])), cam: [0, 40, 0.92] });
P['scene-grand-format'] = () => ({ g: group(at(rollStand('GRAND\nFORMAT', 1), [-0.9, 0, 0], [0, 0.3, 0]), at(flag(true, 'OUVERT', 0), [0.1, 0, -1.3], [0, -0.1, 0]), at(rollStand('VOTRE\nMESSAGE', 0), [1.05, 0, 0.1], [0, -0.35, 0])), cam: [0, 8, 0.95] });
P['scene-objets'] = () => ({ g: group(at(P['mugs-ceramique']().g, [-0.5, 0, 0]), at(P['cles-usb']().g, [1.2, 0, 0.6], [0, -0.3, 0]), at(P['stickers-personnalises']().g, [-1.2, 0, 0.9], [0, 0.2, 0])), cam: [0, 26, 0.92] });
P['scene-evenementiel'] = () => ({ g: group(at(P['stand-parapluie']().g, [0, 0, -0.6]), at(P['badges-de-salon']().g, [1.6, 0.02, 1.4], [0, -0.3, 0])), cam: [6, 14, 0.92] });

// ------------------------------------------------------------------ prise de vue
// Calendriers 2027 à la marque Symo Print (page de janvier réelle : le 1er janvier 2027 est un vendredi).
const MOIS = ['JANVIER', 'FÉVRIER', 'MARS'];
function calPage(w, h, { month = 0, photoRatio = 0.5, seed = 0, title = '2027' } = {}) {
  return tex(w, h, (x) => {
    paperBg(x, w, h, C.w); const ph = h * photoRatio;
    x.save(); x.beginPath(); x.rect(0, 0, w, ph); x.clip(); hero(x, w, ph, { title, sub: 0, logo: false, seed, tsize: ph * 0.26 }); x.restore();
    const u = Math.min(w, h) / 100, top = ph + 6 * u;   // portrait : largeur ; paysage (bureau) : hauteur
    D.txt(x, MOIS[month] + ' 2027', 6 * u, top + 5 * u, { size: 5.2 * u, weight: 900, color: C.t, track: 2 });
    if (w > h) D.logo(x, w - 62 * u, h - 30 * u, 54 * u, false); else D.logo(x, w - 34 * u, top - 1.2 * u, 28 * u, false);   // bureau : logo à droite de la grille
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'], cw = Math.min((w - 12 * u) / 7, 13 * u), gy = top + 12 * u, rows = 6, rh = (h - gy - 5 * u) / (rows + 0.6);
    days.forEach((d, i) => D.txt(x, d, 6 * u + cw * i + cw / 2, gy, { size: 2.8 * u, weight: 700, color: i > 4 ? C.o : C.gd, align: 'center' }));
    const first = (new Date(2027, month, 1).getDay() + 6) % 7, n = new Date(2027, month + 1, 0).getDate();
    for (let dnum = 1; dnum <= n; dnum++) { const k = first + dnum - 1, r = Math.floor(k / 7), c = k % 7; const cx = 6 * u + cw * c, cy = gy + 2 * u + rh * r;
      x.fillStyle = r % 2 ? '#F3F8F9' : '#FFFFFF'; x.fillRect(cx + 0.3 * u, cy, cw - 0.6 * u, rh - 0.6 * u);
      D.txt(x, String(dnum), cx + cw - 1.6 * u, cy + rh * 0.62, { size: 3.4 * u, weight: c > 4 ? 800 : 600, color: c > 4 ? C.od : C.n, align: 'right' }); }
  });
}
function spiral(len, y, z, { r = 0.018, tube = 0.0035, step = 0.03, axis = 'x' } = {}) {
  const g = new THREE.Group(), m = M.metal('#3B4A50', 0.35), n = Math.floor(len / step);
  for (let i = 0; i <= n; i++) { const t = mesh(new THREE.TorusGeometry(r, tube, 8, 28), m); t.position.set(-len / 2 + i * step, y, z); t.rotation.set(0, Math.PI / 2, 0); g.add(t); }
  return g;
}
P['calendriers-muraux'] = () => {
  const W = 0.62, H = 0.88, th = 0.004, e = M.edge();
  const pg0 = M.paper(calPage(1240, 1760, { month: 0, seed: 1 }), 0.7), pg1 = M.paper(calPage(1240, 1760, { month: 1, seed: 0, title: '2027' }), 0.7);
  const back = M.paper(tex(64, 64, (x, w, h) => paperBg(x, w, h, '#EEF2F3')), 0.9);
  const cal = (front, n) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(at(sheet(W, H, th, i === n - 1 ? front : back, back, e), [0, i * th, 0])); g.add(spiral(W * 0.92, n * th * 0.5, -H / 2 + 0.012)); return g; };
  const g = group(at(cal(pg1, 4), [0.3, 0, -0.18], [0, -0.32, 0]), at(cal(pg0, 6), [-0.12, 0.002, 0.08], [0, 0.12, 0]));
  return { g, cam: [8, 58, 0.98] };
};
P['calendriers-de-bureau'] = () => {
  const W = 0.9, H = 0.4, th = 0.005, a = 0.36, e = M.edge();
  const front = M.paper(calPage(1800, 800, { month: 0, photoRatio: 0.46, seed: 1 }), 0.7), back = M.paper(tex(900, 400, (x, w, h) => { paperBg(x, w, h, C.w); D.logo(x, w * 0.36, h * 0.42, w * 0.28, false); }), 0.8);
  const tent = () => { const g = new THREE.Group();
    const f = at(panel(W, H, th, front, back, e), [0, Math.cos(a) * H / 2, Math.sin(a) * H / 2], [-a, 0, 0]);
    const b = at(panel(W, H, th, back, back, e), [0, Math.cos(a) * H / 2, -Math.sin(a) * H / 2], [a, 0, 0]);
    g.add(f, b); for (let i = 0; i < 5; i++) g.add(at(panel(W, H, 0.0016, back, back, e), [0, Math.cos(a) * H / 2 + 0.001, Math.sin(a) * H / 2 - 0.004 - i * 0.002], [-a, 0, 0]));
    g.add(spiral(W * 0.94, Math.cos(a) * H + 0.004, 0, { r: 0.016 })); return g; };
  const g = group(at(tent(), [0, 0, 0], [0, 0.18, 0]));
  return { g, cam: [-14, 18, 1.0] };
};

function shoot(slug) {
  const def = P[slug]; if (!def) throw new Error('produit inconnu : ' + slug);
  const { g, cam = [0, 30, 1], exposure } = def(); const scene = new THREE.Scene(); scene.environment = ENV; scene.add(g);
  g.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map) m.map.needsUpdate = true; }); } });
  const box = new THREE.Box3().setFromObject(g); const ctr = box.getCenter(new THREE.Vector3()); const sph = box.getBoundingSphere(new THREE.Sphere()); const r = sph.radius;
  const ground = mesh(new THREE.PlaneGeometry(r * 20, r * 20), new THREE.ShadowMaterial({ opacity: 0.22 }), { cast: false }); ground.rotation.x = -Math.PI / 2; ground.position.y = box.min.y - 0.0005; scene.add(ground);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#D8E2E4', 0.55));
  const key = new THREE.DirectionalLight('#FFF7EC', 2.3); key.position.copy(ctr).add(V(-0.55, 1, 0.75).normalize().multiplyScalar(r * 6)); key.target.position.copy(ctr); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004; const sc = key.shadow.camera; sc.left = sc.bottom = -r * 1.6; sc.right = sc.top = r * 1.6; sc.near = r * 0.5; sc.far = r * 14; scene.add(key, key.target);
  const rimT = new THREE.DirectionalLight('#5FD0E2', 1.1); rimT.position.copy(ctr).add(V(-1, 0.6, -1).multiplyScalar(r * 5)); const rimO = new THREE.DirectionalLight('#FFB547', 0.75); rimO.position.copy(ctr).add(V(1, 0.4, -0.8).multiplyScalar(r * 5)); scene.add(rimT, rimO);
  const fill = new THREE.DirectionalLight('#FFFFFF', 0.45); fill.position.copy(ctr).add(V(0.8, 0.3, 1).multiplyScalar(r * 5)); scene.add(fill);
  const [az, el, margin] = cam; const fov = 28; const camera = new THREE.PerspectiveCamera(fov, 1, r * 0.05, r * 40);
  const d = (r / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * margin * 0.92; const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  camera.position.copy(ctr).add(V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(d)); camera.lookAt(ctr);
  R.toneMappingExposure = exposure || 1.0; R.render(scene, camera);
  const url = R.domElement.toDataURL('image/png');
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.map && m.map.dispose(); m.alphaMap && m.alphaMap.dispose(); m.dispose(); }); } });
  return url;
}
window.studio = { ready, shoot, list: () => Object.keys(P) };
