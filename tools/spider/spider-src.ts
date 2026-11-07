// Silk Spider Cursor: a 3D jumping spider lives on your page. It follows the
// pointer, walks with a real alternating gait, and lays silk that sticks only
// to the elements you mark.
//
//   enter   it drops in from the top of the page on a drag line, bobs on the
//           silk, looks at you, lands, and bites the line, which springs away.
//   walk    the body eases after the pointer, never glued to it, and turns to
//           face where it is going. Eight legs run 2-bone IK in two groups
//           (L1 R2 L3 R4 / R1 L2 R3 L4). Feet stay planted and step only when
//           they drift too far, so it walks instead of sliding. A foot that
//           lands on silk plucks it.
//   spin    a drag line trails from the spinnerets. Crossing onto a marked
//           element tacks it down there, using the element's live box, so it
//           stays stuck on scroll and resize. Long elements get tacked every
//           few steps, and a new line sometimes bridges to an older one. Over
//           time the lines pull each other into real web shapes. A line that
//           never finds an element is let go.
//   stop    when the pointer rests, it turns to face you, rears its front up
//           so you see the big eyes, waves its palps, and blinks twice.
//   sleep   a few seconds later it settles down, tucks its legs, shuts its
//           eyes and floats "z z z". The next move wakes it with a start.
//   clear   Delete or Backspace cuts every line loose. The silk springs off
//           its anchors, sags, sheds its dew and fades.
//   fly     now and then a fly buzzes in. If it hits silk it sticks and
//           struggles, and when you leave the spider alone it goes and wraps it.
//
// One requestAnimationFrame loop drives two layers: a 2D canvas for the silk
// and a WebGL canvas (three.js) for the spider, rendered inside a scissor box
// around it. DPR is capped, the loop stops while the tab is hidden, and with
// prefers-reduced-motion the spider just sits and breathes, with no webs.

import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

export interface SilkSpiderCursorProps {
  /** CSS selector for elements the silk may stick to. Never anchors to empty space. */
  anchorSelector?: string
  /** A GLB (URL or data URI) of the spider, Y up and facing +Z. Defaults to the embedded jumping spider. */
  modelSrc?: string
  /** Top-down photo projection for the default model (see README). */
  topTextureSrc?: string
  /** Front (face) photo projection for the default model. */
  faceTextureSrc?: string
  /** Leg span in px. Defaults to a size that scales with the viewport. */
  size?: number
  /** Silk colour. */
  silkColor?: string
  /** The page colour behind the spider, used as bounce light on its belly. */
  bounceColor?: string
  /** Shadow colour cast on the page. */
  shadowColor?: string
  /** Most threads kept at once; the oldest fade out past this. */
  maxThreads?: number
  /** Let a fly wander in now and then. */
  fly?: boolean
  /** Still time before it falls asleep, ms. */
  sleepAfter?: number
  /** Threads already spun across the marked elements when the page opens. */
  seedWebs?: number
  /** Drop in on a thread from the top of the page. */
  enter?: boolean
  /** Keys that clear the webs. */
  clearKeys?: string[]
  /** "fixed" covers the viewport; "absolute" covers the nearest positioned parent. */
  position?: "fixed" | "absolute"
  zIndex?: number
  /** Device-pixel-ratio cap for both canvases. */
  maxDpr?: number
  className?: string
  /** Where to attach when position is "absolute" (default: document.body). */
  parent?: HTMLElement
  /** The bundled spider needs its known foot tips; false for a custom model. */
  useDefaultRig?: boolean
}

// ---------------------------------------------------------------------------
// Silk: one particle pool shared by every thread, so a bridge pulls on the
// lines it hangs from. Verlet integration, distance constraints.
// ---------------------------------------------------------------------------

// #region silk
const MAXP = 9000
const MAXC = 9000

type AnchorRef = { el: Element | null; u: number; v: number; sx: number; sy: number }

type Thread = {
  id: number
  parts: number[]
  cons: number[]
  owned: number[]
  state: number // 0 drag, 1 set, 2 dying
  alpha: number
  born: number
  dieT: number
  dews: number[] // pairs: position along parts (float index), radius
  anchorEl: Element | null
  hostIds: number[]
}

function createSilk() {
  const X = new Float32Array(MAXP)
  const Y = new Float32Array(MAXP)
  const PX = new Float32Array(MAXP)
  const PY = new Float32Array(MAXP)
  const INV = new Float32Array(MAXP)
  const PIN = new Int32Array(MAXP).fill(-1)
  const CA = new Int32Array(MAXC)
  const CB = new Int32Array(MAXC)
  const CR = new Float32Array(MAXC)
  const CON = new Uint8Array(MAXC)
  const freeP = [] as number[]
  const freeC = [] as number[]
  for (let i = MAXP - 1; i >= 0; i--) freeP.push(i)
  for (let i = MAXC - 1; i >= 0; i--) freeC.push(i)
  const anchors = [] as (AnchorRef | null)[]
  const freeA = [] as number[]
  const threads = [] as Thread[]
  let nextId = 1

  const addAnchor = (a: AnchorRef) => {
    const id = freeA.length ? (freeA.pop() as number) : anchors.length
    anchors[id] = a
    return id
  }
  // high-water marks: the solver only walks the part of the pool ever used
  const hw = { p: 0, c: 0 }
  const particle = (x: number, y: number, anchor: number) => {
    const i = freeP.pop()
    if (i === undefined) return -1
    hw.p = Math.max(hw.p, i + 1)
    X[i] = PX[i] = x
    Y[i] = PY[i] = y
    PIN[i] = anchor
    INV[i] = anchor >= 0 ? 0 : 1
    return i
  }
  const constraint = (a: number, b: number, rest: number) => {
    const c = freeC.pop()
    if (c === undefined) return -1
    hw.c = Math.max(hw.c, c + 1)
    CA[c] = a
    CB[c] = b
    CR[c] = rest
    CON[c] = 1
    return c
  }
  const freeThread = (t: Thread) => {
    for (const c of t.cons) {
      CON[c] = 0
      freeC.push(c)
    }
    for (const p of t.owned) {
      const a = PIN[p]
      if (a >= 0) {
        anchors[a] = null
        freeA.push(a)
      }
      PIN[p] = -1
      INV[p] = 0
      freeP.push(p)
    }
    t.cons.length = 0
    t.owned.length = 0
    t.parts.length = 0
  }
  const newThread = (anchorEl: Element | null) => {
    const t: Thread = {
      id: nextId++, parts: [], cons: [], owned: [], state: 0, alpha: 1, born: 0, dieT: 0,
      dews: [], anchorEl, hostIds: [],
    }
    threads.push(t)
    return t
  }
  const length = (t: Thread) => {
    let L = 0
    for (let k = 1; k < t.parts.length; k++) {
      const a = t.parts[k - 1], b = t.parts[k]
      L += Math.hypot(X[b] - X[a], Y[b] - Y[a])
    }
    return L
  }
  const unpin = (p: number) => {
    const a = PIN[p]
    if (a >= 0) {
      anchors[a] = null
      freeA.push(a)
    }
    PIN[p] = -1
    INV[p] = 1
  }
  // Lay `n` free particles in a straight line between two existing ones.
  const span = (t: Thread, a: number, b: number, seg: number, slack: number) => {
    const d = Math.hypot(X[b] - X[a], Y[b] - Y[a])
    const n = Math.max(2, Math.min(36, Math.round(d / seg)))
    const rest = (d * (1 + slack)) / n
    let prev = a
    t.parts.push(a)
    for (let k = 1; k < n; k++) {
      const f = k / n
      const sag = Math.sin(Math.PI * f) * d * slack * 0.9
      const p = particle(X[a] + (X[b] - X[a]) * f, Y[a] + (Y[b] - Y[a]) * f + sag, -1)
      if (p < 0) break
      t.owned.push(p)
      t.parts.push(p)
      t.cons.push(constraint(prev, p, rest))
      prev = p
    }
    t.parts.push(b)
    t.cons.push(constraint(prev, b, rest))
  }
  const sprinkleDew = (t: Thread, rand: () => number, scale: number) => {
    t.dews.length = 0
    const L = length(t)
    const n = Math.floor(L / (24 + rand() * 30))
    for (let k = 0; k < n; k++) {
      const big = rand() < 0.18
      t.dews.push(1 + rand() * (t.parts.length - 3), (big ? 1.5 + rand() * 1.1 : 0.55 + rand() * 0.75) * scale)
    }
  }

  return {
    X, Y, PX, PY, INV, PIN, CA, CB, CR, CON, anchors, threads, hw,
    addAnchor, particle, constraint, freeThread, newThread, length, unpin, span, sprinkleDew,
  }
}
type Silk = ReturnType<typeof createSilk>

// Pins follow their anchor's live box; everything else falls and is held by
// its constraints.
function stepSilk(s: Silk, dt: number, time: number, rects: Map<Element, DOMRect>, iters: number) {
  const { X, Y, PX, PY, INV, PIN, CA, CB, CR, CON, anchors, hw } = s
  const g = 620 * dt * dt
  for (let i = 0; i < hw.p; i++) {
    const a = PIN[i]
    if (a >= 0) {
      const an = anchors[a]
      if (!an) continue
      if (an.el) {
        const r = rects.get(an.el)
        if (r) {
          X[i] = r.left + an.u * r.width
          Y[i] = r.top + an.v * r.height
        }
      } else {
        X[i] = an.sx
        Y[i] = an.sy
      }
      PX[i] = X[i]
      PY[i] = Y[i]
      continue
    }
    if (INV[i] === 0) continue
    const vx = (X[i] - PX[i]) * 0.986
    const vy = (Y[i] - PY[i]) * 0.986
    PX[i] = X[i]
    PY[i] = Y[i]
    const wind = Math.sin(time * 0.9 + X[i] * 0.006 + Y[i] * 0.004) * 9 * dt * dt
    X[i] += vx + wind
    Y[i] += vy + g * INV[i]
  }
  for (let it = 0; it < iters; it++) {
    for (let c = 0; c < hw.c; c++) {
      if (!CON[c]) continue
      const a = CA[c], b = CB[c]
      const wa = INV[a], wb = INV[b]
      const w = wa + wb
      if (w === 0) continue
      const dx = X[b] - X[a], dy = Y[b] - Y[a]
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6
      // silk is elastic: it gives a little when stretched and never pushes
      if (d <= CR[c]) continue
      const k = ((d - CR[c]) / d / w) * 0.92
      X[a] += dx * k * wa
      Y[a] += dy * k * wa
      X[b] -= dx * k * wb
      Y[b] -= dy * k * wb
    }
  }
}
// #endregion silk

// ---------------------------------------------------------------------------
// Legs: analytic 2-bone IK with the knee lifted up and out.
// ---------------------------------------------------------------------------

// #region ik
function solveKnee(
  hx: number, hy: number, hz: number,
  fx: number, fy: number, fz: number,
  l1: number, l2: number, px0: number, py0: number, pz0: number,
  out: number[],
) {
  let dx = fx - hx, dy = fy - hy, dz = fz - hz
  let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
  const maxD = (l1 + l2) * 0.999
  const minD = Math.abs(l1 - l2) * 1.001 + 1e-6
  const dc = Math.min(maxD, Math.max(minD, d))
  dx /= d; dy /= d; dz /= d
  d = dc
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  // pole: the leg's own rest bend, made perpendicular to the hip-foot line
  let px = px0, py = py0, pz = pz0
  const dot = px * dx + py * dy + pz * dz
  px -= dx * dot; py -= dy * dot; pz -= dz * dot
  const pl = Math.sqrt(px * px + py * py + pz * pz) || 1
  out[0] = hx + dx * a + (px / pl) * h
  out[1] = hy + dy * a + (py / pl) * h
  out[2] = hz + dz * a + (pz / pl) * h
  out[3] = hx + dx * d
  out[4] = hy + dy * d
  out[5] = hz + dz * d
  return out
}
// #endregion ik

// Gait groups: L1 R2 L3 R4 step together, then R1 L2 R3 L4. Legs 0-3 are the
// left side front to back, 4-7 the right.
const GROUP = [0, 1, 0, 1, 1, 0, 1, 0]

// ---------------------------------------------------------------------------
// Rig: the model is reoriented (forward +X, left +Y, up +Z), scaled to a leg
// span of 1, and each leg is skinned to two bones found from its geometry.
// ---------------------------------------------------------------------------

type Leg = {
  hip: THREE.Vector3
  knee: THREE.Vector3
  foot: THREE.Vector3
  l1: number
  l2: number
  b1: THREE.Bone
  b2: THREE.Bone
  restN: THREE.Vector3
  rd: THREE.Vector3 // rest hip-to-foot direction
  rp: THREE.Vector3 // rest knee pole, perpendicular to rd
  // gait state (page px, z up)
  fx: number; fy: number; fz: number
  sx: number; sy: number
  t: number
  stepping: boolean
  dur: number
}

type Rig = {
  root: THREE.Group
  legs: Leg[]
  abdomen: THREE.Bone
  uniforms: { uBlink: { value: number } }
  spinneret: THREE.Vector3
  headFront: THREE.Vector3
  bodyLen: number
}

// The embedded model faces +Z with +Y up (glTF convention).
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1)
const MODEL_UP = new THREE.Vector3(0, 1, 0)

// Two photo projections baked from the full-detail scan, in model space:
// top view over x,z in [-0.98, 0.98], front view over x in [-0.48, 0.48], y in [-0.4, 0.4].
// Each vertex carries how much of each it may use (_w); the rest is its own colour.
const SKIN_VERT = `
attribute vec3 mpos;
attribute vec2 _w;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_FRAG = `
uniform sampler2D uTop;
uniform sampler2D uFront;
uniform float uBlink;
uniform vec4 uEye;
uniform float uProj;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_COLOR = `
vec4 diffuseColor = vec4( diffuse, opacity );
vec3 base = vColor.rgb;
float rough = vColor.a;
if (uProj > 0.5) {
  vec2 ut = vec2(vMpos.x / 0.98 * 0.5 + 0.5, 0.5 - vMpos.z / 0.98 * 0.5);
  vec2 uf = vec2(vMpos.x / 0.48 * 0.5 + 0.5, vMpos.y / 0.4 * 0.5 + 0.5);
  vec3 ct = texture2D(uTop, ut).rgb;
  vec3 cf = texture2D(uFront, uf).rgb;
  base = base * max(0.0, 1.0 - vW.x - vW.y) + ct * vW.x + cf * vW.y;
  // eyelids: fur from just above the eyes slides down over them
  float inEye = step(uEye.x, vMpos.y) * step(vMpos.y, uEye.y) * step(abs(vMpos.x), uEye.z) * step(uEye.w, vMpos.z);
  float lidLine = mix(uEye.y + 0.01, uEye.x - 0.01, uBlink);
  if (inEye > 0.5 && vMpos.y > lidLine) {
    vec3 lid = texture2D(uFront, vec2(uf.x, (uEye.y + 0.035) / 0.4 * 0.5 + 0.5)).rgb;
    float shade = 0.75 + 0.25 * smoothstep(lidLine, lidLine + 0.04, vMpos.y);
    base = lid * shade;
    rough = 0.9;
  }
}
diffuseColor.rgb = base;
`

// Attributes may be quantized (KHR_mesh_quantization); IK math wants floats.
const toFloat = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize)
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k)
  return new THREE.BufferAttribute(out, a.itemSize)
}

const segQ = new THREE.Vector3()
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = segQ.copy(b).sub(a)
  const t = Math.min(1, Math.max(0, (ab.x * (p.x - a.x) + ab.y * (p.y - a.y) + ab.z * (p.z - a.z)) / (ab.lengthSq() || 1)))
  const dx = a.x + ab.x * t - p.x, dy = a.y + ab.y * t - p.y, dz = a.z + ab.z * t - p.z
  return { d: Math.sqrt(dx * dx + dy * dy + dz * dz), t }
}

function buildRig(scene: THREE.Object3D, top: THREE.Texture | null, front: THREE.Texture | null, knownTips: number[] | null): Rig {
  scene.updateMatrixWorld(true)
  // canonical frame: forward -> +X, left -> +Y, up -> +Z
  const fwd = MODEL_FORWARD.clone().normalize()
  const up = MODEL_UP.clone().normalize()
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize()
  const basis = new THREE.Matrix4().makeBasis(fwd, left, up).invert()

  const meshes = [] as THREE.Mesh[]
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  const geos = meshes.map((m) => {
    const src = m.geometry
    const g = new THREE.BufferGeometry()
    for (const name of Object.keys(src.attributes)) g.setAttribute(name, toFloat(src.attributes[name]))
    if (src.index) g.setIndex(src.index.clone())
    g.applyMatrix4(m.matrixWorld)
    g.setAttribute("mpos", (g.attributes.position as THREE.BufferAttribute).clone())
    g.applyMatrix4(basis)
    return g
  })
  const box = new THREE.Box3()
  for (const g of geos) {
    g.computeBoundingBox()
    box.union(g.boundingBox as THREE.Box3)
  }
  const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z)
  const norm = new THREE.Matrix4().makeScale(1 / span, 1 / span, 1 / span).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z))
  for (const g of geos) g.applyMatrix4(norm)

  // Everything below is in normalised units: span 1, lowest point at z 0.
  const all = [] as number[]
  const rough = [] as number[]
  for (const g of geos) {
    const p = g.attributes.position
    const c = g.attributes.color
    for (let i = 0; i < p.count; i++) {
      all.push(p.getX(i), p.getY(i), p.getZ(i))
      rough.push(c && c.itemSize === 4 ? c.getW(i) : 1)
    }
  }
  // body axis: the strip along x near y 0, above the leg tips
  let bx0 = Infinity, bx1 = -Infinity, topZ = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i + 1]) < 0.03) {
      bx0 = Math.min(bx0, all[i])
      bx1 = Math.max(bx1, all[i])
      topZ = Math.max(topZ, all[i + 2])
    }
  }
  const bodyLen = bx1 - bx0
  // the waist (pedicel) is the narrowest point of the body strip between the thirds
  let waistX = bx0 + bodyLen * 0.5, narrow = Infinity
  for (let f = 0.3; f <= 0.7; f += 0.02) {
    const x = bx0 + bodyLen * f
    let w = 0
    for (let i = 0; i < all.length; i += 3) if (Math.abs(all[i] - x) < 0.008 && all[i + 2] > topZ * 0.35) w = Math.max(w, Math.abs(all[i + 1]))
    if (w > 0 && w < narrow) { narrow = w; waistX = x }
  }
  // carapace centre: halfway between the waist and the front. Knees ride as
  // high as the abdomen, so the carapace is measured from its very top only.
  const cx = (waistX + bx1) / 2
  let bodyR = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i] - cx) < 0.03 && all[i + 2] > topZ * 0.8) bodyR = Math.max(bodyR, Math.abs(all[i + 1]))
  }
  bodyR = Math.max(bodyR, 0.05)
  // abdomen: an ellipse behind the waist
  const ax = (bx0 + waistX) / 2, ahl = (waistX - bx0) / 2, ahw = ahl * 0.92
  const inAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.08)) ** 2 + (y / (ahw * 1.08)) ** 2 < 1
  // the abdomen's own skin is narrower: leg IV femurs lie right beside it
  const onAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.05)) ** 2 + (y / (ahl * 0.6)) ** 2 < 1
  // Leg tips: the farthest points from the carapace centre in angular sectors,
  // the eight longest reaches (palps are short and drop out).
  const sectors = [] as { a: number; best: number; p: THREE.Vector3 }[]
  for (let i = 0; i < all.length; i += 3) {
    const dx = all[i] - cx, dy = all[i + 1]
    const r = Math.hypot(dx, dy)
    if (r < bodyR * 1.5) continue
    if (inAbdomen(all[i], dy)) continue
    // feet are low; a high point out there is a knee, not a tip
    if (all[i + 2] > topZ * 0.38) continue
    const ang = Math.atan2(dy, dx)
    let s = sectors.find((q) => Math.abs(Math.atan2(Math.sin(q.a - ang), Math.cos(q.a - ang))) < 0.22)
    if (!s) {
      s = { a: ang, best: 0, p: new THREE.Vector3() }
      sectors.push(s)
    }
    if (r > s.best) {
      s.best = r
      s.a = ang
      s.p.set(all[i], all[i + 1], all[i + 2])
    }
  }
  sectors.sort((a, b) => b.best - a.best)
  const legSectors = sectors.slice(0, 8)
  const L = legSectors.filter((s) => s.a > 0).sort((a, b) => a.a - b.a)
  const R = legSectors.filter((s) => s.a <= 0).sort((a, b) => b.a - a.a)
  const tips = knownTips
    ? Array.from({ length: 8 }, (_, k) => new THREE.Vector3(knownTips[k * 3], knownTips[k * 3 + 1], knownTips[k * 3 + 2]))
    : [...L, ...R].map((s) => s.p.clone())

  const legs = [] as Leg[]
  const bones = [] as THREE.Bone[]
  const rootBone = new THREE.Bone()
  bones.push(rootBone)
  const abdomen = new THREE.Bone()
  abdomen.position.set(waistX, 0, topZ * 0.5)
  rootBone.add(abdomen)
  bones.push(abdomen)

  const legAng = tips.map((t) => Math.atan2(t.y, t.x - cx))
  const tmp = new THREE.Vector3()
  for (let k = 0; k < tips.length; k++) {
    const tip = tips[k]
    const ang = legAng[k]
    const findKnee = (hip: THREE.Vector3) => {
      const nx = -(tip.y - hip.y), ny = tip.x - hip.x
      const nl = Math.hypot(nx, ny) || 1
      const L0 = Math.hypot(tip.x - hip.x, tip.y - hip.y)
      let knee = hip.clone().lerp(tip, 0.45).setZ(topZ * 0.8)
      let best = -Infinity
      for (let i = 0; i < all.length; i += 3) {
        const px = all[i] - hip.x, py = all[i + 1] - hip.y
        if (Math.abs((px * nx + py * ny) / nl) > 0.025) continue
        const along = (px * (tip.x - hip.x) + py * (tip.y - hip.y)) / L0
        if (along < L0 * 0.18 || along > L0 * 0.75) continue
        if (all[i + 2] > best) { best = all[i + 2]; knee = new THREE.Vector3(all[i], all[i + 1], all[i + 2]) }
      }
      return knee
    }
    // the hip sits on the carapace rim, aimed at the knee (legs I and II
    // reach forward but leave the body from its sides)
    const hipAt = (a: number) => new THREE.Vector3(cx + Math.cos(a) * bodyR * 0.92, Math.sin(a) * bodyR * 0.92, topZ * 0.42)
    let hip = hipAt(ang)
    let knee = findKnee(hip)
    hip = hipAt(Math.atan2(knee.y, knee.x - cx))
    knee = findKnee(hip)
    const foot = tip.clone()
    const b1 = new THREE.Bone()
    b1.position.copy(hip)
    const b2 = new THREE.Bone()
    b2.position.copy(knee).sub(hip)
    b1.add(b2)
    rootBone.add(b1)
    bones.push(b1, b2)
    const d1 = knee.clone().sub(hip), d2 = foot.clone().sub(knee)
    const restN = new THREE.Vector3().crossVectors(d1, d2)
    if (restN.lengthSq() < 1e-10) restN.set(-Math.sin(ang), Math.cos(ang), 0).cross(new THREE.Vector3(0, 0, 1))
    legs.push({
      hip, knee, foot, l1: d1.length(), l2: d2.length(), b1, b2, restN: restN.normalize(),
      rd: foot.clone().sub(hip).normalize(),
      rp: (() => {
        const rd = foot.clone().sub(hip).normalize()
        const v = knee.clone().sub(hip)
        return v.sub(rd.multiplyScalar(v.dot(rd))).normalize()
      })(),
      fx: 0, fy: 0, fz: 0, sx: 0, sy: 0, t: 0, stepping: false, dur: 0.14,
    })
  }

  // Skin: legs by sector and by where the vertex falls along hip-knee-foot,
  // the abdomen behind the waist, everything else to the root.
  const root = new THREE.Group()
  const uniforms = { uBlink: { value: 0 } }
  // eyes: glossy vertices on the front of the carapace (model space)
  const eye = new THREE.Vector4(1, -1, 0, 1)
  geos.forEach((g, gi) => {
    const pos = g.attributes.position
    const mp = g.attributes.mpos
    const n = pos.count
    const si = new Uint16Array(n * 4)
    const sw = new Float32Array(n * 4)
    const p = new THREE.Vector3()
    const c = g.attributes.color
    for (let i = 0; i < n; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (c && c.itemSize === 4 && c.getW(i) < 0.3 && p.x > waistX && Math.hypot(p.x - cx, p.y) < bodyR * 1.2 && p.z > topZ * 0.45) {
        eye.x = Math.min(eye.x, mp.getY(i))
        eye.y = Math.max(eye.y, mp.getY(i))
        eye.z = Math.max(eye.z, Math.abs(mp.getX(i)))
        eye.w = Math.min(eye.w, mp.getZ(i))
      }
      const r = Math.hypot(p.x - cx, p.y)
      let done = false
      // chelicerae and palps hang in front of the face: they stay with the body
      const face = p.x > cx && Math.abs(p.y) < bodyR * 0.62
      if (r > bodyR * 0.7 && !face && !onAbdomen(p.x, p.y)) {
        // nearest leg by distance to its hip-knee-foot polyline
        let best = -1, bd = 0.07, bt = 0
        for (let k = 0; k < legs.length; k++) {
          const lg = legs[k]
          const d1 = segDist(p, lg.hip, lg.knee)
          const d2 = segDist(p, lg.knee, lg.foot)
          if (d1.d < bd) { bd = d1.d; best = k; bt = d1.t * 0.5 }
          if (d2.d < bd) { bd = d2.d; best = k; bt = 0.5 + d2.t * 0.5 }
        }
        if (best >= 0) {
          const bi = 2 + best * 2
          // blend across the knee (bt 0.5), and into the body at the hip
          const w2 = Math.min(1, Math.max(0, (bt - 0.44) / 0.12))
          const w0 = Math.min(1, Math.max(0, (0.08 - bt) / 0.08)) * (1 - w2)
          si[i * 4] = bi
          si[i * 4 + 1] = bi + 1
          si[i * 4 + 2] = 0
          sw[i * 4] = (1 - w2) * (1 - w0)
          sw[i * 4 + 1] = w2
          sw[i * 4 + 2] = w0
          done = true
        }
      }
      if (!done) {
        si[i * 4] = onAbdomen(p.x, p.y) ? 1 : 0
        sw[i * 4] = 1
      }
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4))
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4))
    if (!g.attributes._w) g.setAttribute("_w", new THREE.BufferAttribute(new Float32Array(n * 2), 2))
    const srcMat = meshes[gi].material as THREE.MeshStandardMaterial
    const hasColor = !!c && c.itemSize === 4
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: hasColor,
      map: hasColor ? null : srcMat.map ?? null,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 1,
    })
    const proj = hasColor && top && front ? 1 : 0
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTop = { value: top }
      sh.uniforms.uFront = { value: front }
      sh.uniforms.uBlink = uniforms.uBlink
      sh.uniforms.uEye = { value: eye }
      sh.uniforms.uProj = { value: proj }
      sh.vertexShader = SKIN_VERT + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvMpos = mpos;\nvW = _w;")
      sh.fragmentShader = SKIN_FRAG + sh.fragmentShader
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", hasColor ? SKIN_COLOR : "vec4 diffuseColor = vec4( diffuse, opacity );")
        .replace("#include <color_fragment>", "")
        .replace("#include <roughnessmap_fragment>", hasColor ? "float roughnessFactor = clamp(mix(0.08, 0.92, rough), 0.06, 1.0);" : "#include <roughnessmap_fragment>")
    }
    const sm = new THREE.SkinnedMesh(g, mat)
    sm.castShadow = true
    sm.frustumCulled = false
    root.add(sm)
  })
  // bones at rest must have identity skinning: inverses from the rest pose
  const first = root.children[0] as THREE.SkinnedMesh
  first.add(rootBone)
  root.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)
  for (const sm of root.children) (sm as THREE.SkinnedMesh).bind(skeleton, new THREE.Matrix4())
  eye.x += (eye.y - eye.x) * 0.02

  return {
    root, legs, abdomen, uniforms,
    spinneret: new THREE.Vector3(bx0 + 0.01, 0, topZ * 0.4),
    headFront: new THREE.Vector3(bx1, 0, topZ * 0.7),
    bodyLen,
  }
}

// ---------------------------------------------------------------------------


const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)

function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function mountSilkSpider({
  anchorSelector = "[data-silk-anchor]",
  modelSrc = "",
  topTextureSrc,
  faceTextureSrc,
  size,
  silkColor = "#ffffff",
  bounceColor = "#1530e6",
  shadowColor = "#000a3a",
  maxThreads = 120,
  fly = true,
  sleepAfter = 4500,
  enter = true,
  seedWebs = 0,
  clearKeys = ["Delete", "Backspace"],
  position = "fixed",
  zIndex = 50,
  maxDpr = 2,
  className,
  parent,
  useDefaultRig = true,
}: SilkSpiderCursorProps = {}): () => void {
  const opts = { current: { anchorSelector, size, silkColor, maxThreads, fly, sleepAfter, enter, clearKeys } }

  // The wrapper and the two canvas layers: a wrapper div and two canvases.
  const wrap = document.createElement("div")
  wrap.setAttribute("aria-hidden", "true")
  if (className) wrap.className = className
  Object.assign(wrap.style, {
    position,
    inset: "0",
    width: "100%",
    height: position === "fixed" ? "100svh" : "",
    pointerEvents: "none",
    zIndex: String(zIndex),
    overflow: "hidden",
  })
  const mkLayer = () => {
    const c = document.createElement("canvas")
    Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", maxWidth: "none", pointerEvents: "none" })
    wrap.appendChild(c)
    return c
  }
  const silkCanvas = mkLayer()
  const glCanvas = mkLayer()
  ;(position === "fixed" ? document.body : parent ?? document.body).appendChild(wrap)

  const effect = () => {
    const ctx = silkCanvas.getContext("2d")
    if (!ctx) return
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const rand = mulberry(0x5eed)

    // ---------------- renderer ----------------
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true, powerPreference: "high-performance" })
    } catch {
      wrap.remove()
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.35
    const hemi = new THREE.HemisphereLight(0xfff6ec, new THREE.Color(bounceColor), 0.45)
    hemi.position.set(0, 0, 1)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xfff1de, 1.9)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.radius = 5
    key.shadow.bias = -0.0008
    key.shadow.normalBias = 0.6
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.7)
    scene.add(rim, rim.target)
    const camera = new THREE.PerspectiveCamera(20, 1, 1, 20000)
    // shadow catcher on the page plane, moved with the spider
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ color: new THREE.Color(shadowColor), opacity: 0.42 }),
    )
    catcher.receiveShadow = true
    scene.add(catcher)
    // contact shade under the body: a soft radial blob
    const blobCanvas = document.createElement("canvas")
    blobCanvas.width = blobCanvas.height = 64
    const bctx = blobCanvas.getContext("2d") as CanvasRenderingContext2D
    const bg = bctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    bg.addColorStop(0, "rgba(0,0,0,0.55)")
    bg.addColorStop(0.55, "rgba(0,0,0,0.18)")
    bg.addColorStop(1, "rgba(0,0,0,0)")
    bctx.fillStyle = bg
    bctx.fillRect(0, 0, 64, 64)
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false, color: new THREE.Color(shadowColor) }),
    )
    blob.position.z = 0.2
    scene.add(blob)

    const body = new THREE.Group() // page position + yaw/pitch/roll
    scene.add(body)
    let rig: Rig | null = null

    // ---------------- sizing ----------------
    let W = 0, H = 0, dpr = 1, S = 220
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      silkCanvas.width = Math.round(W * dpr)
      silkCanvas.height = Math.round(H * dpr)
      renderer.setPixelRatio(dpr)
      renderer.setSize(W, H, false)
      const fov = camera.fov * (Math.PI / 180)
      const dist = H / 2 / Math.tan(fov / 2)
      camera.aspect = W / H
      camera.position.set(W / 2, -H / 2, dist)
      camera.near = dist * 0.5
      camera.far = dist * 1.6
      camera.lookAt(W / 2, -H / 2, 0)
      camera.updateProjectionMatrix()
      S = opts.current.size ?? clamp(Math.min(W, H * 1.4) * 0.22, 150, 300)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---------------- spider state (page px, y down) ----------------
    const sp = {
      x: W * 0.5, y: -S, vx: 0, vy: 0, th: Math.PI / 2, pitch: 0, roll: 0, z: 0, vz: 0,
      mode: reduced ? "idle" : opts.current.enter ? "enter" : "idle",
      t: 0, idleT: 0, blink: 0, sleep: 0, eyesClosed: 0, wake: 0, preferGroup: 0, ik: 0,
      enterX: W * 0.5, enterY: H * 0.34, landed: false,
    }
    if (sp.mode !== "enter") {
      sp.x = reduced ? W * 0.6 : W * 0.5
      sp.y = reduced ? H * 0.2 : H * 0.4
      sp.landed = true
    }
    const ptr = { x: sp.x, y: sp.y, has: false, lastMove: -1e9, ix: 0, iy: 0 }

    // ---------------- silk state ----------------
    const silk = createSilk()
    let drag: Thread | null = null
    let dragEl: Element | null = null
    let tackX = 0, tackY = 0
    let dropLine: Thread | null = null
    let anchorEls = [] as Element[]
    let anchorScan = 0
    const rects = new Map() as Map<Element, DOMRect>

    const scanAnchors = () => {
      const root = position === "fixed" ? document : wrap.parentElement ?? document
      anchorEls = Array.from(root.querySelectorAll(opts.current.anchorSelector))
    }
    scanAnchors()

    // world helpers
    const v3 = new THREE.Vector3()
    const m4 = new THREE.Matrix4()
    const toPage = (local: THREE.Vector3, out: THREE.Vector3) => {
      out.copy(local).applyMatrix4(rig ? rig.root.matrixWorld : body.matrixWorld)
      out.y = -out.y
      return out
    }
    const spinPage = new THREE.Vector3()
    const headPage = new THREE.Vector3()

    const anchorAt = (x: number, y: number, el: Element | null) => {
      if (!el) return silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y })
      const r = rects.get(el) as DOMRect
      return silk.addAnchor({ el, u: (x - r.left) / Math.max(1, r.width), v: (y - r.top) / Math.max(1, r.height), sx: x, sy: y })
    }

    const startDrag = (x: number, y: number, el: Element) => {
      const t = silk.newThread(el)
      const a = silk.particle(x, y, anchorAt(x, y, el))
      const s = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
      if (a < 0 || s < 0) return null
      t.owned.push(a, s)
      t.parts.push(a, s)
      t.cons.push(silk.constraint(a, s, 0.5))
      t.born = sp.t
      drag = t
      dragEl = el
      tackX = x
      tackY = y
      return t
    }

    const dragSpinner = (t: Thread) => t.parts[t.parts.length - 1]

    // Grow the drag line: when the spinneret pulls away, the pinned end becomes
    // a free bead and a new pinned end takes its place.
    const feedDrag = (x: number, y: number) => {
      if (!drag) return
      const s = dragSpinner(drag)
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        an.sx = x
        an.sy = y
      }
      const prev = drag.parts[drag.parts.length - 2]
      const seg = Math.max(10, S * 0.07)
      const d = Math.hypot(x - silk.X[prev], y - silk.Y[prev])
      if (d > seg && drag.parts.length < 60) {
        silk.unpin(s)
        silk.X[s] = silk.PX[s] = x
        silk.Y[s] = silk.PY[s] = y
        const c = drag.cons[drag.cons.length - 1]
        silk.CR[c] = d
        const ns = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
        if (ns < 0) return
        drag.owned.push(ns)
        drag.parts.push(ns)
        drag.cons.push(silk.constraint(s, ns, 0.5))
      } else {
        silk.CR[drag.cons[drag.cons.length - 1]] = Math.max(0.5, d)
      }
    }

    const setThreads = () => silk.threads.filter((t) => t.state === 1)

    // a line between two particles, laid with a sag, and maybe a bridge from it
    const lay = (a: number, b: number, el: Element | null) => {
      const t = silk.newThread(el)
      silk.span(t, a, b, Math.max(12, S * 0.08), 0.02 + rand() * 0.05)
      t.state = 1
      t.born = -10
      silk.sprinkleDew(t, rand, Math.sqrt(S / 220))
      return t
    }
    const bridgeFrom = (t: Thread) => {
      const mid = t.parts[Math.floor(t.parts.length / 2)]
      let best = -1, bd = S * 1.1, host: Thread | null = null
      for (const o of setThreads()) {
        if (o === t || o.parts.length < 4) continue
        for (let k = 1; k < o.parts.length - 1; k++) {
          const p = o.parts[k]
          const d = Math.hypot(silk.X[p] - silk.X[mid], silk.Y[p] - silk.Y[mid])
          if (d < bd && d > S * 0.18) { bd = d; best = p; host = o }
        }
      }
      if (best < 0 || !host) return
      const b = lay(mid, best, null)
      b.born = sp.t
      b.hostIds.push(t.id, host.id)
    }

    // The web it spun before you arrived: lines between nearby marked elements
    // in view, then bridges between them.
    const seed = (n: number) => {
      const els = anchorEls.filter((e) => {
        const r = rects.get(e)
        return !!r && r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < H
      })
      if (els.length < 2) return
      const pt = (el: Element) => {
        const r = rects.get(el) as DOMRect
        return [r.left + r.width * (0.15 + rand() * 0.7), r.top + r.height * (0.08 + rand() * 0.45)]
      }
      const made = [] as Thread[]
      for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
        const A = els[Math.floor(rand() * els.length)]
        const ra = rects.get(A) as DOMRect
        const near = els.filter((e) => {
          if (e === A) return false
          const r = rects.get(e) as DOMRect
          const d = Math.hypot(r.left + r.width / 2 - ra.left - ra.width / 2, r.top + r.height / 2 - ra.top - ra.height / 2)
          return d > S * 0.4 && d < Math.min(W, H) * 0.6
        })
        if (!near.length) continue
        const B = near[Math.floor(rand() * near.length)]
        const [ax, ay] = pt(A), [bx, by] = pt(B)
        const pa = silk.particle(ax, ay, anchorAt(ax, ay, A))
        const pb = silk.particle(bx, by, anchorAt(bx, by, B))
        if (pa < 0 || pb < 0) break
        const t = lay(pa, pb, A)
        t.owned.push(pa, pb)
        made.push(t)
        k++
      }
      for (const t of made) if (rand() < 0.6) bridgeFrom(t)
    }
    let seeded = reduced || seedWebs <= 0

    // Tack the drag line down at (x, y) on el: it tightens to a gentle sag and
    // sometimes throws a bridge to a nearby line.
    const attach = (x: number, y: number, el: Element) => {
      if (!drag) return
      const t = drag
      const s = dragSpinner(t)
      const a0 = t.parts[0]
      const straight = Math.hypot(silk.X[a0] - x, silk.Y[a0] - y)
      if (straight < S * 0.1) {
        // too short to be worth a line: just move the start here
        silk.freeThread(t)
        silk.threads.splice(silk.threads.indexOf(t), 1)
        drag = null
        startDrag(x, y, el)
        return
      }
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        const r = rects.get(el) as DOMRect
        an.el = el
        an.u = (x - r.left) / Math.max(1, r.width)
        an.v = (y - r.top) / Math.max(1, r.height)
      }
      // re-lay as a straight line with a little slack: it twangs into a catenary
      const parts = t.parts
      const n = parts.length
      for (let k = 1; k < n - 1; k++) {
        const p = parts[k]
        const f = k / (n - 1)
        silk.X[p] = silk.X[a0] + (x - silk.X[a0]) * f + (rand() - 0.5) * 3
        silk.Y[p] = silk.Y[a0] + (y - silk.Y[a0]) * f
        silk.PX[p] = silk.X[p] + (rand() - 0.5) * 2
        silk.PY[p] = silk.Y[p] - 4 * Math.sin(Math.PI * f)
      }
      const slack = 0.015 + rand() * 0.05
      const rest = (straight * (1 + slack)) / (n - 1)
      for (const c of t.cons) silk.CR[c] = rest
      t.state = 1
      t.born = sp.t
      silk.sprinkleDew(t, rand, Math.sqrt(S / 220))
      drag = null

      // bridges: tie the middle of this line to a nearby older line
      if (rand() < 0.75) bridgeFrom(t)
      // too many lines: the oldest begin to fade
      const live = setThreads()
      const over = live.length - opts.current.maxThreads
      for (let k = 0; k < over; k++) kill(live[k], false)
      startDrag(x, y, el)
    }

    const kill = (t: Thread, burst: boolean) => {
      if (t.state === 2) return
      t.state = 2
      t.dieT = 0
      // threads hanging from this one go with it
      for (const o of silk.threads) if (o.hostIds.includes(t.id)) kill(o, burst)
      for (const p of t.parts) {
        silk.unpin(p)
        if (burst) {
          silk.PX[p] = silk.X[p] - (rand() - 0.5) * 6
          silk.PY[p] = silk.Y[p] + 1 + rand() * 3
        }
      }
    }

    const clearAll = () => {
      for (const t of silk.threads) kill(t, true)
      drag = null
      dragEl = null
      if (sp.mode === "sleep") wake()
      sp.vz += S * 0.9
    }

    // ---------------- fly ----------------
    const flyS = { on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, caught: -1, wrapped: 0, next: 9 + rand() * 6, seed: 0, done: false, cx: 0, cy: 0 }
    const cocoons = [] as { p: number; t: number; th: number }[]

    // ---------------- input ----------------
    const onMove = (x: number, y: number) => {
      const r = wrap.getBoundingClientRect()
      const nx = x - r.left, ny = y - r.top
      if (!ptr.has || Math.hypot(nx - ptr.x, ny - ptr.y) > 0.5) ptr.lastMove = sp.t
      ptr.x = nx
      ptr.y = ny
      ptr.has = true
    }
    const pm = (e: PointerEvent) => onMove(e.clientX, e.clientY)
    const tm = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) onMove(t.clientX, t.clientY)
    }
    const kd = (e: KeyboardEvent) => {
      if (!opts.current.clearKeys.includes(e.key)) return
      if (isTyping(document.activeElement)) return
      if (!silk.threads.length) return
      clearAll()
    }
    window.addEventListener("pointermove", pm, { passive: true })
    window.addEventListener("pointerdown", pm, { passive: true })
    window.addEventListener("touchstart", tm, { passive: true })
    window.addEventListener("touchmove", tm, { passive: true })
    window.addEventListener("keydown", kd)

    const wake = () => {
      sp.mode = "walk"
      sp.idleT = 0
      sp.wake = 1
      sp.vz += S * 0.7
    }

    // ---------------- model ----------------
    let disposed = false
    const loader = new GLTFLoader()
    const placeFeet = () => {
      if (!rig) return
      const c = Math.cos(sp.th), s = Math.sin(sp.th)
      for (const lg of rig.legs) {
        const lx = lg.foot.x * S, ly = -lg.foot.y * S
        lg.fx = sp.x + lx * c - ly * s
        lg.fy = sp.y + lx * s + ly * c
        lg.fz = 0
      }
    }
    // The spider: a skinned model plus its two photo projections. Textures
    // load first so the first frame it appears in is already fully dressed.
    const texLoader = new THREE.TextureLoader()
    const loadTex = (src: string) =>
      new Promise((done: (t: THREE.Texture | null) => void) => {
        if (!src) return done(null)
        texLoader.load(src, (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          done(t)
        }, undefined, () => done(null))
      })
    const own = useDefaultRig
    Promise.all([loadTex(topTextureSrc ?? ""), loadTex(faceTextureSrc ?? "")]).then(([top, front]) => {
      if (disposed || !modelSrc) return
      loader.load(
        modelSrc,
        (gltf) => {
          if (disposed) return
          rig = buildRig(gltf.scene, top, front, own ? DEFAULT_TIPS : null)
          body.add(rig.root)
          placeFeet()
        },
        undefined,
        () => {},
      )
    })

    // ---------------- per-frame ----------------
    const knee = [0, 0, 0, 0, 0, 0]
    const qA = new THREE.Quaternion()
    const qB = new THREE.Quaternion()
    const mA = new THREE.Matrix4()
    const mB = new THREE.Matrix4()
    const inv = new THREE.Matrix4()
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vN = new THREE.Vector3(), vC = new THREE.Vector3()
    const nd1 = new THREE.Vector3(), nd2 = new THREE.Vector3(), fb2 = new THREE.Vector3()
    const qS = new THREE.Quaternion(), qT = new THREE.Quaternion()

    // rotation that carries the rest frame (d, n) onto (d2, n2)
    const frameRot = (d: THREE.Vector3, n: THREE.Vector3, d2: THREE.Vector3, n2: THREE.Vector3, out: THREE.Quaternion) => {
      const b1 = vC.crossVectors(n, d).normalize()
      mA.makeBasis(d, n, b1)
      const b2 = fb2.crossVectors(n2, d2).normalize()
      mB.makeBasis(d2, n2, b2)
      mA.transpose()
      mB.multiply(mA)
      return out.setFromRotationMatrix(mB)
    }

    const updateLegs = (dt: number) => {
      if (!rig) return
      const c = Math.cos(sp.th), s = Math.sin(sp.th)
      const speed = Math.hypot(sp.vx, sp.vy)
      const walking = sp.mode === "walk" || sp.mode === "hunt"
      const tuck = sp.sleep
      const dur = clamp(0.19 - (speed / S) * 0.03, 0.085, 0.19)
      const lead = dur * 0.95
      const thresh = (walking ? 0.1 : 0.045) * S
      const hang = sp.mode === "enter" && !sp.landed
      const errs = [] as number[]
      const homes = [] as number[]
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        const k = 1 - tuck * 0.22
        let lx = lg.foot.x * S * k, ly = -lg.foot.y * S * k
        const hx = sp.x + lx * c - ly * s + sp.vx * lead
        const hy = sp.y + lx * s + ly * c + sp.vy * lead
        homes.push(hx, hy)
        errs.push(Math.hypot(lg.fx - hx, lg.fy - hy))
        // a foot left far behind (pointer jumped) is put back at once
        if (errs[i] > S * 0.6) {
          lg.fx = hx
          lg.fy = hy
          lg.stepping = false
          errs[i] = 0
        }
      }
      if (!hang) {
        const stepping = [false, false]
        for (let i = 0; i < 8; i++) if (rig.legs[i].stepping) stepping[GROUP[i]] = true
        for (const g of [sp.preferGroup, 1 - sp.preferGroup]) {
          if (stepping[0] || stepping[1]) break
          let worst = 0
          for (let i = 0; i < 8; i++) if (GROUP[i] === g) worst = Math.max(worst, errs[i])
          if (worst > thresh) {
            for (let i = 0; i < 8; i++) {
              if (GROUP[i] !== g || errs[i] < thresh * 0.3) continue
              const lg = rig.legs[i]
              lg.stepping = true
              lg.t = 0
              lg.dur = dur * (0.9 + rand() * 0.2)
              lg.sx = lg.fx
              lg.sy = lg.fy
            }
            sp.preferGroup = 1 - g
            stepping[g] = true
          }
        }
      }
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        if (hang) {
          // dangling on the line: feet drawn in under the body, paddling
          const k = 0.62
          const lx = lg.foot.x * S * k, ly = -lg.foot.y * S * k
          lg.fx = sp.x + lx * c - ly * s
          lg.fy = sp.y + lx * s + ly * c
          lg.fz = S * (0.05 + 0.025 * Math.sin(sp.t * 5 + i * 1.7))
          continue
        }
        if (lg.stepping) {
          lg.t += dt / lg.dur
          const f = Math.min(1, lg.t)
          const e = f * f * (3 - 2 * f)
          lg.fx = lg.sx + (homes[i * 2] - lg.sx) * e
          lg.fy = lg.sy + (homes[i * 2 + 1] - lg.sy) * e
          lg.fz = Math.sin(Math.PI * f) * S * (0.05 + Math.min(0.04, (speed / S) * 0.01))
          if (f >= 1) {
            lg.stepping = false
            lg.fz = 0
            pluck(lg.fx, lg.fy)
          }
        } else {
          lg.fz += (0 - lg.fz) * damp(20, dt)
        }
      }
      // Legs follow IK while it walks; resting, facing you, asleep or hanging,
      // they ease back to the sculpted pose and the feet re-home under it.
      const facing = sp.mode === "idle" && Math.abs(angDiff(sp.th, Math.PI / 2)) < 0.3
      const ikTo = hang || sp.mode === "sleep" || facing ? 0 : 1
      sp.ik += (ikTo - sp.ik) * damp(ikTo ? 10 : 5, dt)
      if (sp.ik < 0.5) {
        for (let i = 0; i < rig.legs.length; i++) {
          const lg = rig.legs[i]
          lg.fx = homes[i * 2] - sp.vx * lead
          lg.fy = homes[i * 2 + 1] - sp.vy * lead
          lg.fz = 0
          lg.stepping = false
        }
      }

      // pose the bones. The pole swings with the leg from its rest bend, so a
      // foot at its rest place gives the sculpted leg back untouched.
      rig.root.updateMatrixWorld(true)
      inv.copy(rig.root.matrixWorld).invert()
      const w = sp.ik
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        if (w < 0.001) {
          lg.b1.quaternion.identity()
          lg.b2.quaternion.identity()
        } else {
          vA.set(lg.fx, -lg.fy, lg.fz).applyMatrix4(inv)
          vC.copy(vA).sub(lg.hip).normalize()
          qS.setFromUnitVectors(lg.rd, vC)
          vB.copy(lg.rp).applyQuaternion(qS)
          solveKnee(lg.hip.x, lg.hip.y, lg.hip.z, vA.x, vA.y, vA.z, lg.l1, lg.l2, vB.x, vB.y, vB.z, knee)
          const d1 = vA.set(lg.knee.x - lg.hip.x, lg.knee.y - lg.hip.y, lg.knee.z - lg.hip.z).normalize()
          const d2 = vB.set(lg.foot.x - lg.knee.x, lg.foot.y - lg.knee.y, lg.foot.z - lg.knee.z).normalize()
          nd1.set(knee[0] - lg.hip.x, knee[1] - lg.hip.y, knee[2] - lg.hip.z).normalize()
          nd2.set(knee[3] - knee[0], knee[4] - knee[1], knee[5] - knee[2]).normalize()
          const nn = vN.crossVectors(nd1, nd2)
          if (nn.lengthSq() < 1e-8) nn.copy(lg.restN)
          nn.normalize()
          frameRot(d1, lg.restN, nd1, nn, qA)
          frameRot(d2, lg.restN, nd2, nn, qB)
          qB.premultiply(qT.copy(qA).invert())
          lg.b1.quaternion.identity().slerp(qA, w)
          lg.b2.quaternion.identity().slerp(qB, w)
        }
        if (hang) {
          // dangling on the line: the legs paddle a little around their rest pose
          qT.setFromAxisAngle(lg.restN, Math.sin(sp.t * 5 + i * 1.7) * 0.14)
          lg.b1.quaternion.multiply(qT)
          qT.setFromAxisAngle(lg.restN, Math.sin(sp.t * 5 + i * 1.7 + 0.8) * 0.2)
          lg.b2.quaternion.multiply(qT)
        }
      }
    }

    const pluck = (x: number, y: number) => {
      const r = S * 0.08
      for (const t of silk.threads) {
        if (t.state !== 1) continue
        for (const p of t.parts) {
          if (silk.INV[p] === 0) continue
          const d = Math.hypot(silk.X[p] - x, silk.Y[p] - y)
          if (d < r) silk.PY[p] -= 2.2 * (1 - d / r)
        }
      }
    }

    const updateSpider = (dt: number) => {
      sp.t += dt
      const o = opts.current
      if (sp.mode === "enter") {
        const t = sp.t
        const dropT = 1.9
        const p = Math.min(1, t / dropT)
        const ease = 1 - Math.pow(1 - p, 3)
        sp.x = sp.enterX + Math.sin(t * 2.1) * S * 0.04 * Math.exp(-t * 0.5)
        sp.y = -S * 0.7 + (sp.enterY + S * 0.7) * ease
        if (t > dropT) sp.y += Math.sin((t - dropT) * 9) * S * 0.07 * Math.exp(-(t - dropT) * 3)
        sp.th = Math.PI / 2 + Math.sin(t * 1.3) * 0.22 * Math.exp(-t * 0.4)
        sp.pitch += (0.55 - sp.pitch) * damp(3, dt)
        if (!dropLine) {
          const tl = silk.newThread(null)
          const a = silk.particle(sp.enterX, -2, silk.addAnchor({ el: null, u: 0, v: 0, sx: sp.enterX, sy: -2 }))
          const b = silk.particle(sp.enterX, -1, silk.addAnchor({ el: null, u: 0, v: 0, sx: sp.enterX, sy: -1 }))
          tl.owned.push(a, b)
          tl.parts.push(a, b)
          tl.cons.push(silk.constraint(a, b, 1))
          tl.state = 1
          dropLine = tl
        }
        if (t > 2.7 && !sp.landed) {
          sp.landed = true
          // bite the line: it springs up and away
          if (dropLine) {
            const end = dropLine.parts[dropLine.parts.length - 1]
            silk.unpin(end)
            silk.PY[end] = silk.Y[end] + 14
            const tl = dropLine
            setTimeout(() => kill(tl, false), 650)
          }
          sp.mode = "idle"
          sp.idleT = 0.4
          sp.vx = sp.vy = 0
          placeFeet()
          ptr.x = sp.x
          ptr.y = sp.y
        }
        return
      }

      const moved = ptr.has && sp.t - ptr.lastMove < 0.25
      // a caught fly is worth a walk when you leave the spider alone
      const huntFly = !reduced && flyS.on && flyS.caught >= 0 && !moved && sp.t - ptr.lastMove > 1.2
      let tx = ptr.x, ty = ptr.y
      if (huntFly) {
        tx = silk.X[flyS.caught]
        ty = silk.Y[flyS.caught]
      }
      if (reduced) {
        tx = sp.x
        ty = sp.y
      }
      const dx = tx - sp.x, dy = ty - sp.y
      const dist = Math.hypot(dx, dy)

      if (sp.mode === "sleep") {
        // the pointer, or a fly struggling in the silk, wakes it
        if ((moved && Math.hypot(ptr.x - ptr.ix, ptr.y - ptr.iy) > 4) || (huntFly && flyS.t > 1.5)) wake()
      } else if (moved || huntFly || dist > S * 0.12) {
        if (sp.mode !== "walk" && sp.mode !== "hunt") {
          sp.mode = "walk"
          sp.idleT = 0
        }
        if (huntFly) sp.mode = "hunt"
        else if (sp.mode === "hunt") sp.mode = "walk"
      }

      if (sp.mode === "walk" || sp.mode === "hunt") {
        const maxV = S * 2.7
        const stop = sp.mode === "hunt" ? S * 0.32 : 4
        let want = Math.min(maxV, Math.max(0, dist - stop) * 3.2)
        const head = Math.atan2(dy, dx)
        const err = Math.abs(angDiff(sp.th, head))
        // big turns are made mostly on the spot
        want *= clamp(Math.cos(err) * 1.2, 0.18, 1)
        const ux = dist > 0.001 ? dx / dist : 0, uy = dist > 0.001 ? dy / dist : 0
        sp.vx += (ux * want - sp.vx) * damp(6.5, dt)
        sp.vy += (uy * want - sp.vy) * damp(6.5, dt)
        const speed = Math.hypot(sp.vx, sp.vy)
        if (dist > 6) {
          const turn = angDiff(sp.th, head)
          sp.th += clamp(turn, -8 * dt, 8 * dt) * Math.min(1, 0.25 + speed / (S * 0.3))
        }
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        sp.pitch += (0 - sp.pitch) * damp(9, dt)
        if (!moved && dist <= stop + 6 && speed < S * 0.06) {
          if (sp.mode === "hunt") {
            flyS.wrapped += dt
          } else {
            sp.mode = "idle"
            sp.idleT = 0
            ptr.ix = ptr.x
            ptr.iy = ptr.y
          }
        }
      } else {
        sp.vx += (0 - sp.vx) * damp(10, dt)
        sp.vy += (0 - sp.vy) * damp(10, dt)
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
      }

      if (sp.mode === "idle") {
        sp.idleT += dt
        // turn to face you (screen-down), then rear up so the eyes show
        const face = Math.PI / 2
        if (sp.idleT > 0.15) sp.th += clamp(angDiff(sp.th, face), -4 * dt, 4 * dt)
        const facing = Math.abs(angDiff(sp.th, face)) < 0.3
        const rearTo = facing ? (reduced ? 0.6 : 0.85) : 0
        sp.pitch += (rearTo - sp.pitch) * damp(4, dt)
        // two blinks shortly after it settles
        const bt = sp.idleT - 1.0
        sp.blink = bt > 0 && bt < 0.18 ? Math.sin((bt / 0.18) * Math.PI) : bt > 0.34 && bt < 0.52 ? Math.sin(((bt - 0.34) / 0.18) * Math.PI) : 0
        if (reduced) sp.blink = Math.max(0, Math.sin(sp.t * 0.9) * 40 - 39)
        if (!reduced && sp.idleT * 1000 > o.sleepAfter) {
          sp.mode = "sleep"
          ptr.ix = ptr.x
          ptr.iy = ptr.y
        }
      }
      const sleeping = sp.mode === "sleep"
      sp.sleep += ((sleeping ? 1 : 0) - sp.sleep) * damp(sleeping ? 1.4 : 7, dt)
      if (sleeping) sp.pitch += (0 - sp.pitch) * damp(2.5, dt)
      sp.eyesClosed = Math.max(sp.blink, sp.sleep)
      sp.wake = Math.max(0, sp.wake - dt * 2)

      // body bounce: a spring on height, kicked by wake-ups and clears
      sp.vz += (-sp.z * 160 - sp.vz * 14) * dt
      sp.z += sp.vz * dt
      // lean into acceleration
      const lat = -Math.sin(sp.th) * sp.vx + Math.cos(sp.th) * sp.vy
      sp.roll += (clamp(-lat / (S * 30), -0.12, 0.12) - sp.roll) * damp(6, dt)
    }

    const placeBody = () => {
      const breathe = Math.sin(sp.t * (sp.sleep > 0.5 ? 1.6 : 2.6)) * 0.004
      body.position.set(sp.x, -sp.y, sp.z - sp.sleep * S * 0.025)
      body.rotation.set(0, 0, 0)
      body.rotation.order = "ZYX"
      body.rotation.z = -sp.th
      body.rotation.y = -sp.pitch * 0.85
      body.rotation.x = sp.roll
      if (rig) {
        rig.root.scale.setScalar(S)
        // rear up around the back feet, so they stay on the page
        const th = sp.pitch * 0.85
        const px = (rig.legs[3].foot.x + rig.legs[7].foot.x) * 0.5 * S
        rig.root.position.set(px * (Math.cos(th) - 1), 0, -px * Math.sin(th))
        rig.abdomen.rotation.y = sp.pitch * 0.5 + Math.sin(sp.t * 7) * 0.01 * Math.min(1, Math.hypot(sp.vx, sp.vy) / S)
        rig.abdomen.scale.setScalar(1 + breathe)
        rig.uniforms.uBlink.value = sp.eyesClosed
      }
      body.updateMatrixWorld(true)
      if (rig) {
        toPage(rig.spinneret, spinPage)
        toPage(rig.headFront, headPage)
      } else {
        spinPage.set(sp.x - Math.cos(sp.th) * S * 0.2, sp.y - Math.sin(sp.th) * S * 0.2, 0)
        headPage.set(sp.x + Math.cos(sp.th) * S * 0.15, sp.y + Math.sin(sp.th) * S * 0.15, 0)
      }
    }

    const updateWebs = () => {
      if (reduced) return
      if (dropLine && !sp.landed) {
        const end = dropLine.parts[dropLine.parts.length - 1]
        const an = silk.anchors[silk.PIN[end]]
        if (an) {
          an.sx = spinPage.x
          an.sy = spinPage.y
        }
        const a = dropLine.parts[0]
        silk.CR[dropLine.cons[0]] = Math.max(1, Math.hypot(spinPage.x - silk.X[a], spinPage.y - silk.Y[a]))
        return
      }
      if (!sp.landed) return
      const x = spinPage.x, y = spinPage.y
      // the most specific marked element under the spinnerets
      let el: Element | null = null
      let area = Infinity
      for (const e of anchorEls) {
        const r = rects.get(e)
        if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) continue
        const a = r.width * r.height
        if (a < area) { area = a; el = e }
      }
      const walking = Math.hypot(sp.vx, sp.vy) > S * 0.1
      if (!drag) {
        if (el && walking) startDrag(x, y, el)
        return
      }
      feedDrag(x, y)
      if (el && walking) {
        const r = rects.get(el) as DOMRect
        const big = Math.max(r.width, r.height) > S * 1.3
        if (el !== dragEl) attach(x, y, el)
        else if (big && Math.hypot(x - tackX, y - tackY) > S * 0.42) attach(x, y, el)
      }
      // a line that never finds an element is let go
      if (drag && silk.length(drag) > Math.hypot(W, H) * 0.9) {
        const t = drag
        drag = null
        dragEl = null
        kill(t, false)
      }
    }

    const updateFly = (dt: number) => {
      if (reduced || !opts.current.fly) return
      const f = flyS
      if (!f.on) {
        f.next -= dt
        if (f.next <= 0 && setThreads().length >= 3) {
          f.on = true
          f.cx = 0
          f.t = 0
          f.caught = -1
          f.wrapped = 0
          f.seed = rand() * 100
          const side = rand() < 0.5 ? -1 : 1
          f.x = side < 0 ? -20 : W + 20
          f.y = H * (0.15 + rand() * 0.6)
          f.vx = -side * 90
          f.vy = 0
        }
        return
      }
      f.t += dt
      if (f.caught < 0) {
        const n = f.seed
        const ax = Math.sin(f.t * 1.7 + n) * 260 + Math.sin(f.t * 4.3 + n * 2) * 140
        const ay = Math.cos(f.t * 1.3 + n * 3) * 220 + Math.sin(f.t * 5.1 + n) * 120
        // flies are drawn to the web: drift toward a bead of silk
        if (f.cx === 0 || rand() < dt * 0.4) {
          const live = setThreads()
          const t = live[Math.floor(rand() * live.length)]
          if (t) {
            const p = t.parts[Math.floor(t.parts.length / 2)]
            f.cx = silk.X[p]
            f.cy = silk.Y[p]
          }
        }
        const gx = f.cx || W * 0.5, gy = f.cy || H * 0.45
        f.vx += (ax + (gx - f.x) * 0.9) * dt
        f.vy += (ay + (gy - f.y) * 0.9) * dt
        const v = Math.hypot(f.vx, f.vy)
        const maxV = 230
        if (v > maxV) { f.vx *= maxV / v; f.vy *= maxV / v }
        f.x += f.vx * dt
        f.y += f.vy * dt
        // caught when it crosses a set line
        if (f.t > 1.2) {
          for (const t of silk.threads) {
            if (t.state !== 1) continue
            for (let k = 1; k < t.parts.length - 1; k++) {
              const p = t.parts[k]
              const q = t.parts[k + 1]
              // near the segment p-q
              const ex = silk.X[q] - silk.X[p], ey = silk.Y[q] - silk.Y[p]
              const u = clamp(((f.x - silk.X[p]) * ex + (f.y - silk.Y[p]) * ey) / (ex * ex + ey * ey || 1), 0, 1)
              if (Math.hypot(silk.X[p] + ex * u - f.x, silk.Y[p] + ey * u - f.y) < 6 && silk.INV[p] > 0) {
                f.caught = p
                silk.PY[p] -= 6
                break
              }
            }
            if (f.caught >= 0) break
          }
        }
        if (f.t > 16 || f.x < -60 || f.x > W + 60 || f.y < -60 || f.y > H + 60) {
          if (f.t > 3) {
            f.on = false
            f.next = 14 + rand() * 10
          }
        }
      } else {
        f.x = silk.X[f.caught]
        f.y = silk.Y[f.caught]
        if (silk.INV[f.caught] > 0 && f.wrapped < 0.01 && rand() < 0.12) {
          silk.PX[f.caught] += (rand() - 0.5) * 3
          silk.PY[f.caught] += (rand() - 0.5) * 3
        }
        const hostAlive = silk.threads.some((t) => t.state === 1 && t.parts.includes(f.caught))
        if (!hostAlive) {
          f.on = false
          f.next = 12 + rand() * 10
        } else if (f.wrapped > 1.6) {
          cocoons.push({ p: f.caught, t: 0, th: rand() * Math.PI })
          f.on = false
          f.next = 16 + rand() * 12
          if (sp.mode === "hunt") {
            sp.mode = "idle"
            sp.idleT = 0
            ptr.x = sp.x
            ptr.y = sp.y
            ptr.ix = sp.x
            ptr.iy = sp.y
          }
        }
      }
    }

    // ---------------- drawing (silk layer) ----------------
    const dew = document.createElement("canvas")
    dew.width = dew.height = 32
    {
      const d = dew.getContext("2d") as CanvasRenderingContext2D
      const g = d.createRadialGradient(16, 16, 2, 16, 16, 15)
      g.addColorStop(0, "rgba(255,255,255,0.12)")
      g.addColorStop(0.7, "rgba(255,255,255,0.28)")
      g.addColorStop(0.92, "rgba(255,255,255,0.75)")
      g.addColorStop(1, "rgba(255,255,255,0)")
      d.fillStyle = g
      d.beginPath()
      d.arc(16, 16, 15, 0, Math.PI * 2)
      d.fill()
      d.fillStyle = "rgba(255,255,255,0.95)"
      d.beginPath()
      d.ellipse(11.5, 11, 3.2, 2.4, -0.6, 0, Math.PI * 2)
      d.fill()
      d.fillStyle = "rgba(10,20,80,0.25)"
      d.beginPath()
      d.ellipse(17, 23, 7, 3, 0, 0, Math.PI)
      d.fill()
    }

    const pathThread = (t: Thread) => {
      const { X, Y } = silk
      const P = t.parts
      ctx.moveTo(X[P[0]], Y[P[0]])
      for (let k = 1; k < P.length - 1; k++) {
        const a = P[k], b = P[k + 1]
        ctx.quadraticCurveTo(X[a], Y[a], (X[a] + X[b]) / 2, (Y[a] + Y[b]) / 2)
      }
      const last = P[P.length - 1]
      ctx.lineTo(X[last], Y[last])
    }

    const drawSilk = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      const col = opts.current.silkColor
      ctx.strokeStyle = col
      // Settled lines share one path per pass; fading-in, dying and drag
      // lines keep their own alpha.
      const solid = [] as Thread[]
      for (const t of silk.threads) {
        if (t.parts.length < 2 || t.alpha <= 0.01) continue
        const a = t.alpha * (t.state === 0 ? 0.75 : Math.min(1, 0.55 + (time - t.born) * 2))
        if (a >= 0.999) {
          solid.push(t)
          continue
        }
        ctx.beginPath()
        pathThread(t)
        ctx.globalAlpha = a * 0.13
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.globalAlpha = a * 0.88
        ctx.lineWidth = 0.95
        ctx.stroke()
      }
      if (solid.length) {
        ctx.beginPath()
        for (const t of solid) pathThread(t)
        ctx.globalAlpha = 0.13
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.globalAlpha = 0.88
        ctx.lineWidth = 0.95
        ctx.stroke()
      }
      // micro-fibres: a second hair-thin strand that wanders off the first
      ctx.beginPath()
      for (const t of solid) {
        if (t.parts.length < 4) continue
        const { X, Y } = silk
        const P = t.parts
        for (let k = 0; k < P.length; k++) {
          const o = Math.sin(k * 1.9 + t.id) * 0.9
          if (k === 0) ctx.moveTo(X[P[k]], Y[P[k]] + o)
          else ctx.lineTo(X[P[k]], Y[P[k]] + o)
        }
      }
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 0.5
      ctx.stroke()
      // dew
      for (const t of silk.threads) {
        if (!t.dews.length || t.alpha <= 0.02) continue
        const { X, Y } = silk
        const P = t.parts
        for (let k = 0; k < t.dews.length; k += 2) {
          const f = t.dews[k]
          const i = Math.min(P.length - 2, Math.floor(f))
          const fr = f - i
          const a = P[i], b = P[i + 1]
          let x = X[a] + (X[b] - X[a]) * fr
          let y = Y[a] + (Y[b] - Y[a]) * fr
          let r = t.dews[k + 1]
          if (t.state === 2) {
            y += t.dieT * t.dieT * 260 * (0.6 + (k % 5) * 0.12)
            r *= 1 + t.dieT * 0.4
          }
          const tw = 0.75 + 0.25 * Math.sin(time * 2.2 + k * 3.7 + t.id)
          ctx.globalAlpha = t.alpha * tw
          const R = r * 2.1
          ctx.drawImage(dew, x - R, y - R + r * 0.6, R * 2, R * 2)
        }
      }
      ctx.globalAlpha = 1
      // cocoons
      for (const c of cocoons) {
        const alive = silk.threads.some((t) => t.state !== 2 && t.parts.includes(c.p))
        if (!alive) c.t = -1
        if (c.t < 0) continue
        ctx.save()
        ctx.translate(silk.X[c.p], silk.Y[c.p] + 5)
        ctx.rotate(c.th * 0.3)
        ctx.drawImage(cocoonSprite, -8, -11, 16, 22)
        ctx.restore()
      }
      for (let k = cocoons.length - 1; k >= 0; k--) if (cocoons[k].t < 0) cocoons.splice(k, 1)
      drawFly(time)
      drawZ(time)
    }

    // The fly and the cocoon are painted once into sprites: drawing gradients
    // under a rotation for the first time mid-animation stalls some GPUs.
    const sprite = (w: number, h: number, paint: (d: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas")
      c.width = w * 4
      c.height = h * 4
      const d = c.getContext("2d") as CanvasRenderingContext2D
      d.scale(4, 4)
      d.translate(w / 2, h / 2)
      paint(d)
      return c
    }
    const flyBody = sprite(24, 14, (d) => {
      const g = d.createLinearGradient(0, -4, 0, 4)
      g.addColorStop(0, "#5b5f66")
      g.addColorStop(0.5, "#1d1f24")
      g.addColorStop(1, "#0c0d10")
      d.fillStyle = g
      d.beginPath()
      d.ellipse(-4.5, 0, 6, 3.6, 0, 0, Math.PI * 2)
      d.fill()
      d.beginPath()
      d.ellipse(1.8, 0, 3.6, 3.2, 0, 0, Math.PI * 2)
      d.fill()
      d.fillStyle = "rgba(255,255,255,0.18)"
      for (let k = 0; k < 3; k++) d.fillRect(-8 + k * 2.6, -2.8, 1.1, 5.6)
      d.fillStyle = "#8c1a12"
      for (const side of [-1, 1]) {
        d.beginPath()
        d.ellipse(5.2, side * 1.9, 1.9, 1.7, 0, 0, Math.PI * 2)
        d.fill()
      }
      d.fillStyle = "rgba(255,220,210,0.7)"
      d.fillRect(5.4, -2.6, 0.7, 0.7)
    })
    const flyWing = sprite(20, 10, (d) => {
      const g = d.createLinearGradient(6, 0, -6, 0)
      g.addColorStop(0, "rgba(235,240,255,0.65)")
      g.addColorStop(1, "rgba(190,205,255,0.18)")
      d.fillStyle = g
      d.beginPath()
      d.ellipse(0, 0, 8.5, 3.6, 0, 0, Math.PI * 2)
      d.fill()
      d.strokeStyle = "rgba(40,40,60,0.35)"
      d.lineWidth = 0.35
      d.stroke()
    })
    const flyWrap = sprite(26, 14, (d) => {
      d.fillStyle = "rgba(250,252,255,0.92)"
      d.beginPath()
      d.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2)
      d.fill()
      d.strokeStyle = "rgba(255,255,255,0.9)"
      d.lineWidth = 0.5
      for (let k = 0; k < 6; k++) {
        d.beginPath()
        d.ellipse(0, 0, 11.2, 1.2, k * 0.5, 0, Math.PI * 2)
        d.stroke()
      }
    })
    const cocoonSprite = sprite(16, 22, (d) => {
      const g = d.createRadialGradient(-2, -3, 1, 0, 0, 9)
      g.addColorStop(0, "rgba(255,255,255,0.98)")
      g.addColorStop(1, "rgba(220,228,255,0.75)")
      d.fillStyle = g
      d.beginPath()
      d.ellipse(0, 0, 5.5, 8.5, 0, 0, Math.PI * 2)
      d.fill()
      d.strokeStyle = "rgba(255,255,255,0.8)"
      d.lineWidth = 0.5
      for (let k = -3; k <= 3; k++) {
        d.beginPath()
        d.ellipse(0, k * 2.1, 5.6 - Math.abs(k) * 0.6, 1.2, 0.25, 0, Math.PI * 2)
        d.stroke()
      }
    })

    // upload the sprites now, not on the frame a fly first appears
    ctx.globalAlpha = 0.004
    for (const c of [dew, flyBody, flyWing, flyWrap, cocoonSprite]) {
      ctx.drawImage(c, 0, 0, 2, 2)
      ctx.save()
      ctx.translate(4, 4)
      ctx.rotate(0.7)
      ctx.scale(0.9, 0.9)
      ctx.drawImage(c, 0, 0, 3, 3)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    const drawFly = (time: number) => {
      const f = flyS
      if (!f.on) return
      const caught = f.caught >= 0
      const wrap01 = Math.min(1, f.wrapped / 1.6)
      const ang = caught ? Math.sin(time * 23) * 0.3 * (1 - wrap01) : Math.atan2(f.vy, f.vx)
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(ang)
      const s = clamp(S / 220, 0.7, 1.2)
      ctx.scale(s, s)
      // shadow
      ctx.globalAlpha = 0.22
      ctx.drawImage(flyBody, -7, 3, 24, 14)
      ctx.globalAlpha = 1
      // wings: a blur of beats while flying, slow twitches once stuck
      const beat = caught ? Math.sin(time * 18) * 0.25 * (1 - wrap01) : Math.sin(time * 90)
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.rotate(side * (0.5 + beat * 0.35))
        ctx.drawImage(flyWing, -16, side * 4.2 - 5, 20, 10)
        ctx.restore()
      }
      ctx.drawImage(flyBody, -12, -7, 24, 14)
      if (wrap01 > 0) {
        ctx.globalAlpha = wrap01
        ctx.drawImage(flyWrap, -14.5, -7, 26, 14)
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }

    const drawZ = (time: number) => {
      if (sp.sleep < 0.4) return
      const a = (sp.sleep - 0.4) / 0.6
      const base = clamp(S / 220, 0.7, 1.3)
      ctx.fillStyle = "#ffffff"
      ctx.textBaseline = "middle"
      for (let k = 0; k < 3; k++) {
        const ph = ((time * 0.45 + k / 3) % 1)
        const x = headPage.x + S * 0.12 + ph * S * 0.16 + Math.sin(time * 1.4 + k * 2) * 4
        const y = headPage.y - S * 0.12 - ph * S * 0.42
        ctx.globalAlpha = a * Math.sin(ph * Math.PI)
        ctx.font = "italic 700 " + Math.round((14 + ph * 12) * base) + "px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
        ctx.fillText("z", x, y)
      }
      ctx.globalAlpha = 1
    }

    // ---------------- loop ----------------
    let raf = 0
    let last = 0
    let acc = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const t = now / 1000
      let dt = last ? t - last : 1 / 60
      last = t
      dt = Math.min(dt, 1 / 20)

      anchorScan -= dt
      if (anchorScan <= 0) {
        scanAnchors()
        anchorScan = 1
      }
      const wr = wrap.getBoundingClientRect()
      rects.clear()
      for (const e of anchorEls) {
        const r = e.getBoundingClientRect()
        rects.set(e, new DOMRect(r.left - wr.left, r.top - wr.top, r.width, r.height))
      }

      if (!seeded) {
        seeded = true
        seed(seedWebs)
      }
      updateSpider(dt)
      placeBody()
      updateLegs(dt)
      updateWebs()
      updateFly(dt)

      // fixed 120 Hz silk steps
      acc += dt
      let steps = 0
      while (acc >= 1 / 120 && steps < 4) {
        stepSilk(silk, 1 / 120, sp.t, rects, 4)
        acc -= 1 / 120
        steps++
      }
      if (steps === 4) acc = 0
      for (let k = silk.threads.length - 1; k >= 0; k--) {
        const th = silk.threads[k]
        if (th.state === 2) {
          th.dieT += dt
          th.alpha = Math.max(0, 1 - th.dieT / 0.85)
          if (th.dieT > 0.9) {
            silk.freeThread(th)
            silk.threads.splice(k, 1)
            if (th === dropLine) dropLine = null
          }
        }
      }
      drawSilk(sp.t)

      // spider: shadow rig follows it, render only around it
      const span = S * 1.25
      key.position.set(sp.x - S * 0.9, -sp.y + S * 1.3, S * 3.2)
      key.target.position.set(sp.x, -sp.y, 0)
      const sc = key.shadow.camera as THREE.OrthographicCamera
      sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span
      sc.near = 1; sc.far = S * 8
      sc.updateProjectionMatrix()
      rim.position.set(sp.x + S, -sp.y - S * 1.5, S)
      rim.target.position.set(sp.x, -sp.y, 0)
      catcher.position.set(sp.x, -sp.y, 0)
      catcher.scale.set(span * 2.4, span * 2.4, 1)
      const blobS = S * (0.42 - sp.pitch * 0.05)
      blob.position.set(sp.x + Math.cos(sp.th) * S * 0.02 + S * 0.02, -sp.y - S * 0.03, 0.2)
      blob.rotation.z = -sp.th
      blob.scale.set(blobS * 1.25, blobS * 0.8, 1)
      ;(blob.material as THREE.MeshBasicMaterial).opacity = 0.75 - sp.z / (S * 0.5)

      if (rig) {
        const pad = S * 0.95
        const x0 = clamp(sp.x - pad, 0, W), x1 = clamp(sp.x + pad, 0, W)
        const y0 = clamp(sp.y - pad, 0, H), y1 = clamp(sp.y + pad, 0, H)
        renderer.setScissorTest(true)
        renderer.setScissor(x0, H - y1, x1 - x0, y1 - y0)
        renderer.render(scene, camera)
      }
    }
    const start = () => {
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const vis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", vis)
    start()

    return () => {
      disposed = true
      stop()
      ro.disconnect()
      document.removeEventListener("visibilitychange", vis)
      window.removeEventListener("pointermove", pm)
      window.removeEventListener("pointerdown", pm)
      window.removeEventListener("touchstart", tm)
      window.removeEventListener("touchmove", tm)
      window.removeEventListener("keydown", kd)
      envTex.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.forceContextLoss() // libère le contexte WebGL tout de suite (le navigateur en limite le nombre : arrêts/reprises répétés)
    }
  }
  const cleanup = effect()
  return () => {
    if (cleanup) cleanup()
    wrap.remove()
  }
}

// The default spider: "Prismatic Jumping Spider 3D Model Free" by iRahulRajput
// (sketchfab.com/rt699448), CC BY 4.0. Reduced to 7k triangles; its colour is
// baked into the vertices plus a top and a front photo projection.
// Foot tips of the default model in the rig frame (L1-L4, R1-R4): its front
// legs lie side by side and one is raised, so they are given, not searched.
const DEFAULT_TIPS = [0.5, 0.16, 0.03, 0.4, 0.23, 0.11, 0.02, 0.42, 0.04, -0.44, 0.31, 0.01, 0.5, -0.15, 0.03, 0.5, -0.24, 0.02, 0.32, -0.42, 0.02, -0.44, -0.34, 0.01]

;(window as unknown as { SilkSpider: unknown }).SilkSpider = { mount: mountSilkSpider }
