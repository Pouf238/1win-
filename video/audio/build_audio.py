#!/usr/bin/env python3
"""
SYMO Print — construction de la bande son (60,00 s).

1. Découpe la voix off (ElevenLabs) phrase par phrase et la replace sur la
   timeline de 60 s SANS modifier sa vitesse (seuls les silences changent).
2. Compose une musique originale (synthèse procédurale, libre de droits)
   calée sur la grille rythmique de la vidéo (120 BPM).
3. Génère les effets sonores (pops, whoosh, risers, impacts, papier,
   imprimante, tampon, clavier, tap, ding...).
4. Mixe : ducking automatique de la musique sous la voix, normalisation
   -14 LUFS, true peak <= -1 dBTP.
5. Écrit `timeline.json` (scènes, mots horodatés, repères) lu par Remotion :
   c'est la source unique de vérité pour la synchronisation image/son.

Usage : python3 build_audio.py   (depuis n'importe où)
Dépendances : numpy, scipy, ffmpeg, faster-whisper (pour words_src.json, déjà fourni)
"""
import json, os, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REMOTION = os.path.join(ROOT, "remotion")
OUT_AUDIO = os.path.join(REMOTION, "public", "audio")
OUT_DATA = os.path.join(REMOTION, "src", "data")
os.makedirs(OUT_AUDIO, exist_ok=True)
os.makedirs(OUT_DATA, exist_ok=True)

SR = 48000
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(238)

# ----------------------------------------------------------------------------
# 1. VOIX : clips (début source, fin source, décalage) — coupes dans les silences
# ----------------------------------------------------------------------------
VOICE_SRC = os.path.join(HERE, "voix-off.mp3")
CLIPS = [  # (src_start, src_end, offset) -> dst = src + offset
    (0.000, 7.450, 0.15),   # Scène 1 : questions + « autrement ? »
    (7.450, 16.190, 0.40),  # Scène 2 : univers
    (16.190, 23.375, 2.70), # Scène 3 : logo (laisse la place au décompte)
    (23.375, 34.460, 3.20), # Scène 4 : mission
    (34.460, 44.615, 4.10), # Scène 5 : communauté
    (44.615, 99.000, 5.15), # Scène 6 : final
]
SCENES = [  # (id, start, end)
    ("hook", 0.0, 7.6),
    ("univers", 7.6, 16.6),
    ("logo", 16.6, 26.3),
    ("mission", 26.3, 37.9),
    ("communaute", 37.9, 49.5),
    ("final", 49.5, 60.0),
]
IMPACT_LOGO = 18.5
IMPACT_FINAL = 49.5


def load_audio(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def write_wav(path, x):
    x = np.atleast_2d(x)
    if x.shape[0] != 2:
        x = np.vstack([x, x])
    data = (np.clip(x.T, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2",
                    "-i", "-", path], input=data, check=True)


voice_src = load_audio(VOICE_SRC)
voice = np.zeros(N)
fade = int(0.008 * SR)
for s0, s1, off in CLIPS:
    a, b = int(s0 * SR), min(int(s1 * SR), len(voice_src))
    seg = voice_src[a:b].copy()
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    d = int((s0 + off) * SR)
    voice[d:d + len(seg)] += seg[: max(0, N - d)]

# Mots horodatés (transcription faster-whisper de la voix source)
words_src = json.load(open(os.path.join(HERE, "words_src.json"), encoding="utf-8"))


def shift(t):
    for s0, s1, off in CLIPS:
        if s0 - 0.05 <= t < s1:
            return t + off
    return t + CLIPS[-1][2]


words = [{"w": w["w"], "s": round(shift(w["s"]), 3), "e": round(shift(w["e"]), 3)} for w in words_src]


def wt(prefix, n=1):
    """Instant (dst) du n-ième mot commençant par `prefix` (insensible à la casse)."""
    k = 0
    for w in words:
        if w["w"].lower().lstrip("'").startswith(prefix.lower()):
            k += 1
            if k == n:
                return w["s"]
    raise KeyError(prefix)


# ----------------------------------------------------------------------------
# Outils de synthèse
# ----------------------------------------------------------------------------
def t_arr(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, f1, f2, o=2):
    return sosfilt(butter(o, [f1, f2], "band", fs=SR, output="sos"), x)


def place(buf, x, t, gain=1.0, pan=0.0):
    """Ajoute le son mono x dans le buffer stéréo buf à l'instant t."""
    i = int(t * SR)
    if i >= buf.shape[1] or i + len(x) <= 0:
        return
    j0 = max(0, -i)
    x = x[j0:]
    i = max(i, 0)
    n = min(len(x), buf.shape[1] - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + n] += x[:n] * gain * l * 1.414
    buf[1, i:i + n] += x[:n] * gain * r * 1.414


def env_exp(d, tau):
    return np.exp(-t_arr(d) / tau)


def saw(f, d, detune=0.0):
    t = t_arr(d)
    ph = (f * (1 + detune)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def noise(d):
    return rng.standard_normal(int(d * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def reverb_ir(d=2.2, tau=0.55):
    t = t_arr(d)
    irl = rng.standard_normal(len(t)) * np.exp(-t / tau)
    irr = rng.standard_normal(len(t)) * np.exp(-t / tau)
    irl, irr = lp(irl, 6000), lp(irr, 6000)
    irl[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    irr[: int(0.017 * SR)] *= np.linspace(0, 1, int(0.017 * SR))
    return irl / np.abs(irl).sum() * 6, irr / np.abs(irr).sum() * 6


IRL, IRR = reverb_ir()


def add_reverb(buf, wet):
    l = fftconvolve(buf[0], IRL)[: buf.shape[1]]
    r = fftconvolve(buf[1], IRR)[: buf.shape[1]]
    return buf + wet * np.vstack([l, r])


# ----------------------------------------------------------------------------
# 2. MUSIQUE (originale) — La mineur, Am | F | C | G, 120 BPM
# ----------------------------------------------------------------------------
BEAT = 0.5
music = np.zeros((2, N))
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
ROOTS = [45, 41, 36, 43]


def pad(t0, t1, chord, gain, cutoff):
    d = t1 - t0
    x = np.zeros(int(d * SR))
    for m in chord + [chord[0] + 12]:
        for dt in (-0.004, 0.0, 0.005):
            x += saw(midi(m), d, dt)
    x = lp(x, cutoff, 2) / 12
    a = min(int(0.6 * SR), len(x) // 3)
    e = np.ones(len(x))
    e[:a] = np.linspace(0, 1, a)
    e[-a:] = np.linspace(1, 0, a)
    place(music, x * e, t0, gain, -0.25)
    place(music, x * e, t0 + 0.011, gain, 0.25)


def kick(t, g=1.0):
    d = 0.42
    t_ = t_arr(d)
    f = 45 + 95 * np.exp(-t_ / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.16)
    x += 0.3 * lp(noise(d), 3000) * np.exp(-t_ / 0.004)
    place(music, np.tanh(1.6 * x), t, 0.55 * g)


def clap(t, g=1.0):
    d = 0.25
    x = bp(noise(d), 900, 3200) * env_exp(d, 0.05)
    place(music, x, t, 0.22 * g)


def hat(t, g=1.0, pan=0.2):
    d = 0.06
    x = hp(noise(d), 7000) * env_exp(d, 0.012)
    place(music, x, t, 0.12 * g, pan)


def bass(t, m, d, g=1.0):
    t_ = t_arr(d)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t_) + 0.35 * lp(saw(f, d), 900)
    e = np.minimum(1, t_ / 0.01) * np.exp(-t_ / (d * 0.9))
    place(music, np.tanh(1.3 * x * e), t, 0.30 * g)


def pluck(t, m, g=1.0, pan=0.0):
    d = 0.35
    t_ = t_arr(d)
    x = saw(midi(m), d) * np.exp(-t_ / 0.09)
    x = lp(x, 2600)
    place(music, x, t, 0.10 * g, pan)


def groove(t0, t1, level=1.0, kick4=True, claps=True, plucks=True, bassline=True, hats=True,
           pad_cut=1400, pad_gain=0.20):
    nbars = int(np.ceil((t1 - t0) / (4 * BEAT)))
    for b in range(nbars):
        bt = t0 + b * 4 * BEAT
        ci = b % 4
        pad(bt, min(bt + 4 * BEAT + 0.3, t1 + 0.3), CHORDS[ci], pad_gain * level, pad_cut)
        for k in range(4):
            tb = bt + k * BEAT
            if tb >= t1:
                break
            if kick4 or k in (0, 2):
                kick(tb, level)
            if claps and k in (1, 3):
                clap(tb, level)
            if hats:
                hat(tb + BEAT / 2, level, 0.25 if k % 2 else -0.25)
            if bassline:
                for e in range(2):
                    bass(tb + e * BEAT / 2, ROOTS[ci], BEAT / 2 * 0.95, level)
            if plucks:
                arp = CHORDS[ci] + [CHORDS[ci][1] + 12]
                for s in range(2):
                    pluck(tb + s * BEAT / 2, arp[(k * 2 + s) % 4] + 12, level, (-0.4, 0.4)[s])


def riser(t_end, d, g=1.0):
    t_ = t_arr(d)
    f = 200 * (2 ** (3.2 * t_ / d))
    x = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    nz = noise(d)
    nz = np.concatenate([bp(nz[i:i + 2400], 300 + 6000 * (i / len(nz)), 800 + 9000 * (i / len(nz)))
                         for i in range(0, len(nz), 2400)])[: len(t_)]
    x = (x * 0.4 + nz * 0.8) * (t_ / d) ** 2
    return x * g, t_end - d


# Scène 1 — nappe sombre + battement de cœur
pad(0.0, 7.9, [45, 52, 57], 0.22, 500)
for k in range(0, 13):
    kick(0.2 + k * 0.5, 0.35 if k % 2 == 0 else 0.18)
# Scène 2 — groove léger (demi-temps)
groove(7.6, 16.6, level=0.75, kick4=False, claps=False, bassline=False, pad_cut=1000)
# Scène 3+ — groove complet calé sur l'impact logo
groove(IMPACT_LOGO, 26.3, level=1.0)
groove(26.3, 37.9, level=0.85, claps=True)
groove(37.9, IMPACT_FINAL, level=0.9, pad_cut=1800, pad_gain=0.24)
groove(IMPACT_FINAL, 57.5, level=1.1, pad_cut=2400, pad_gain=0.26)
# Accord final (C majeur) qui résonne jusqu'à la fin
pad(57.5, 60.6, [48, 55, 60, 64, 67], 0.26, 2200)
bass(57.5, 36, 2.4, 1.2)
kick(57.5, 1.0)

music = add_reverb(music, 0.35)

# ----------------------------------------------------------------------------
# 3. EFFETS SONORES
# ----------------------------------------------------------------------------
sfx = np.zeros((2, N))


def s_pop(t, g=1.0, pitch=1.0, pan=0.0):
    d = 0.12
    t_ = t_arr(d)
    f = (900 * pitch) * np.exp(-t_ / 0.03) + 300 * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.035)
    place(sfx, x, t, 0.35 * g, pan)


def s_whoosh(t, d=0.55, g=1.0, up=True):
    t_ = t_arr(d)
    x = noise(d)
    out = np.zeros_like(x)
    step = 1200
    for i in range(0, len(x), step):
        p = i / len(x)
        p = p if up else 1 - p
        out[i:i + step] = bp(x[i:i + step], 250 + 2500 * p, 900 + 7000 * p)
    e = np.sin(np.pi * t_ / d) ** 2
    place(sfx, out * e, t - d / 2, 0.55 * g, -0.3)
    place(sfx, out * e, t - d / 2 + 0.01, 0.55 * g, 0.3)


def s_impact(t, g=1.0):
    d = 2.5
    t_ = t_arr(d)
    f = 38 + 70 * np.exp(-t_ / 0.06)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.55)
    x += 0.5 * lp(noise(d), 1800) * np.exp(-t_ / 0.08)
    x += 0.2 * hp(noise(d), 4000) * np.exp(-t_ / 0.4)
    place(sfx, np.tanh(1.8 * x), t, 0.75 * g)


def s_hit(t, g=1.0):
    d = 1.2
    t_ = t_arr(d)
    f = 45 + 60 * np.exp(-t_ / 0.04)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.3)
    x += 0.35 * lp(noise(d), 2500) * np.exp(-t_ / 0.03)
    place(sfx, np.tanh(1.5 * x), t, 0.6 * g)


def s_tick(t, g=1.0, f=2200):
    d = 0.05
    t_ = t_arr(d)
    x = np.sin(2 * np.pi * f * t_) * np.exp(-t_ / 0.006) + 0.3 * hp(noise(d), 5000) * np.exp(-t_ / 0.003)
    place(sfx, x, t, 0.35 * g)


def s_paper(t, g=1.0, pan=0.0):
    d = 0.25
    t_ = t_arr(d)
    x = bp(noise(d), 1500, 7000) * (np.exp(-t_ / 0.03) + 0.3 * np.exp(-t_ / 0.1))
    x += 0.4 * lp(noise(d), 300) * np.exp(-t_ / 0.02)
    place(sfx, x, t, 0.45 * g, pan)


def s_printer(t, d, g=1.0):
    t_ = t_arr(d)
    x = bp(noise(d), 400, 2500) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 14 * t_)))
    x += 0.25 * np.sin(2 * np.pi * 110 * t_) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t_))
    e = np.minimum(1, t_ / 0.08) * np.minimum(1, (d - t_) / 0.15)
    place(sfx, x * e, t, 0.16 * g, 0.2)


def s_stamp(t, g=1.0):
    d = 0.5
    t_ = t_arr(d)
    x = np.sin(2 * np.pi * (60 + 80 * np.exp(-t_ / 0.02)) * t_) * np.exp(-t_ / 0.09)
    x += 0.7 * bp(noise(d), 800, 4000) * np.exp(-t_ / 0.015)
    place(sfx, np.tanh(2 * x), t, 0.6 * g)


def s_ding(t, g=1.0, f0=1320):
    d = 1.4
    t_ = t_arr(d)
    x = sum(a * np.sin(2 * np.pi * f0 * r * t_) * np.exp(-t_ / (0.5 / r)) for a, r in
            [(1, 1), (0.5, 2.0), (0.3, 2.76), (0.2, 5.4)])
    place(sfx, x * np.minimum(1, t_ / 0.002), t, 0.18 * g, 0.15)


def s_shimmer(t, d=1.2, g=1.0):
    for k in range(10):
        s_ding(t + k * d / 10, 0.25 * g * (1 - k / 12), 1760 * 2 ** (rng.integers(0, 12) / 12))


def s_swell(t, d=1.6, g=1.0):
    t_ = t_arr(d)
    x = sum(np.sin(2 * np.pi * midi(m) * t_) for m in (60, 64, 67, 72))
    e = np.sin(np.pi * t_ / d) ** 2
    place(sfx, lp(x, 3000) * e / 4, t, 0.35 * g)


def s_key(t, g=1.0):
    d = 0.04
    t_ = t_arr(d)
    x = bp(noise(d), 2000, 8000) * np.exp(-t_ / 0.005) + 0.5 * np.sin(2 * np.pi * 180 * t_) * np.exp(-t_ / 0.008)
    place(sfx, x, t, 0.22 * g, rng.uniform(-0.3, 0.3))


def s_scratch(t, g=1.0):
    d = 0.35
    t_ = t_arr(d)
    x = bp(noise(d), 1000, 5000) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t_)) * np.sin(np.pi * t_ / d)
    place(sfx, x, t, 0.35 * g)


def s_riser(t_end, d, g=1.0):
    x, t0 = riser(t_end, d, g)
    place(sfx, x, t0, 0.32)


CUES = []  # (temps, nom) — exportés dans timeline.json pour la vérification


def cue(name, t):
    CUES.append({"t": round(t, 3), "sfx": name})
    return t


# --- Scène 1 : bulles de questions
q1, q2, autrement = wt("quel", 1), wt("quel", 2), wt("autrement")
BUBBLES = [q1, q2, q2 + 0.75, q2 + 0.95, q2 + 1.12, q2 + 1.27, q2 + 1.40]
for i, b in enumerate(BUBBLES):
    s_pop(cue("pop", b), 1.0 if i < 2 else 0.7, 1 + 0.08 * i, (-0.4, 0.4)[i % 2])
s_riser(cue("riser", autrement - 0.05), 1.3, 0.8)
s_hit(cue("bass-hit", autrement))
s_whoosh(cue("whoosh", 7.55), 0.7)
# --- Scène 2 : supports
s_paper(cue("paper", wt("carte", 1)), 1.0, -0.3)
s_paper(cue("paper", wt("affiche", 1)), 1.0, 0.3)
s_whoosh(cue("cloth", wt("t", 2)), 0.4, 0.6)
s_printer(cue("printer", wt("idée", 1)), 1.6)
for k in range(4):
    s_paper(wt("prendre") + 0.08 * k, 0.5, rng.uniform(-0.5, 0.5))
s_whoosh(cue("whoosh", wt("papiers")), 0.5, 0.8)
s_riser(cue("riser", 16.6), 1.6, 0.9)
# --- Scène 3 : décompte + logo
COUNT = [16.85, 17.4, 17.95]
for c in COUNT:
    s_tick(cue("tick", c), 1.2, 1800)
s_riser(cue("riser", IMPACT_LOGO), 1.8, 1.2)
s_impact(cue("impact-logo", IMPACT_LOGO), 1.1)
s_shimmer(IMPACT_LOGO + 0.05, 1.4, 1.0)
s_stamp(cue("stamp", wt("nouveaux")))
s_ding(wt("nouvelles"), 0.8)
s_swell(cue("swell", wt("impression") - 0.15), 1.6, 0.8)
s_whoosh(cue("whoosh", wt("arrive") - 0.25), 0.6)
s_whoosh(cue("whoosh", 26.3), 0.6, 0.8)
# --- Scène 4 : mission
s_scratch(cue("scratch", wt("jargon")))
s_whoosh(cue("whoosh", wt("conseils") - 0.15), 0.4, 0.6)
s_pop(cue("pop", wt("astuces") - 0.1), 0.9, 1.2)
s_printer(cue("printer", wt("coulisses")), 1.3, 0.9)
s_tick(cue("lock-click", wt("secrets")), 1.0, 900)
s_shimmer(wt("secrets") + 0.1, 0.8, 0.7)
s_ding(cue("sparkle", wt("valoriser")), 0.7, 1760)
s_whoosh(cue("whoosh", 37.9), 0.6, 0.8)
# --- Scène 5 : communauté
for p in ("entrepreneur", "commerçant", "créateur", "curieux"):
    s_tick(cue("tick", wt(p)), 0.8, 1500)
s_swell(cue("swell", wt("univers", 1) - 0.2), 1.8, 0.9)
t_type = wt("question") + 0.2
for k in range(16):
    s_key(t_type + k * 0.075, 0.9)
cue("typing", t_type)
s_pop(cue("send", wt("posez") + 0.75), 1.0, 1.3)
s_pop(cue("reply", wt("répond")), 1.0, 1.5)
for k in range(3):
    s_pop(wt("vidéo") + 0.1 + k * 0.12, 0.5, 1.8 + 0.2 * k, (-0.3, 0, 0.3)[k])
s_riser(cue("riser", IMPACT_FINAL), 1.4, 1.0)
# --- Scène 6 : final
s_impact(cue("impact-final", IMPACT_FINAL), 1.0)
for k in range(4):
    s_pop(IMPACT_FINAL + 0.12 + k * 0.1, 0.5, 1.4 + 0.15 * k, (-0.4, 0.4)[k % 2])
s_tick(cue("tap", wt("abonnez")), 1.2, 700)
s_ding(cue("ding", wt("abonnez") + 0.3), 1.0)
s_pop(cue("share", wt("partagez")), 0.8, 1.3)
s_ding(cue("bell", wt("connectés")), 0.7, 1980)
s_whoosh(cue("whoosh", wt("simoprint", 3) - 0.15), 0.5, 0.6)
s_shimmer(wt("forme"), 1.5, 0.8)

sfx = add_reverb(sfx, 0.18)

# ----------------------------------------------------------------------------
# 4. MIXAGE — ducking de la musique sous la voix
# ----------------------------------------------------------------------------
voice_c = hp(voice, 70)
win = int(0.02 * SR)
rms = np.sqrt(np.convolve(voice_c ** 2, np.ones(win) / win, mode="same"))
gate = (rms > 0.012).astype(float)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
envd = np.zeros_like(gate)
# lissage attaque/relâchement (vectorisé par blocs pour la vitesse)
blk = 240
g_blk = gate[: len(gate) // blk * blk].reshape(-1, blk).max(1)
e = 0.0
out = np.zeros_like(g_blk)
a_b, r_b = att ** blk, rel ** blk
for i, g in enumerate(g_blk):
    c = a_b if g > e else r_b
    e = c * e + (1 - c) * g
    out[i] = e
envd[: len(out) * blk] = np.repeat(out, blk)
duck = 10 ** (-9.0 * envd / 20)  # jusqu'à -9 dB sous la voix

music *= duck
mix_nv = music * 0.15 + sfx * 0.30
voice_st = np.vstack([voice_c, voice_c]) * 1.0
mix = voice_st + mix_nv

# fondu de sortie très doux sur la dernière seconde (aucune coupure brutale)
fo = int(1.2 * SR)
curve = np.ones(N)
curve[-fo:] = np.linspace(1, 0.15, fo) ** 1.5
mix *= curve
mix_nv *= curve


def finalize(path, x, lufs=-14.0):
    tmp = path + ".tmp.wav"
    write_wav(tmp, x / max(1e-9, np.abs(x).max()) * 0.9)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af",
                    f"loudnorm=I={lufs}:TP=-1.0:LRA=11:linear=true,aresample=48000",
                    "-t", f"{DUR:.3f}", "-c:a", "pcm_s16le", path], check=True)
    os.remove(tmp)


finalize(os.path.join(OUT_AUDIO, "mix.wav"), mix)
finalize(os.path.join(OUT_AUDIO, "music_sfx.wav"), mix_nv, -16.0)
write_wav(os.path.join(OUT_AUDIO, "voice_placed.wav"), voice_st * 0.9 / np.abs(voice_st).max())

# ----------------------------------------------------------------------------
# 5. TIMELINE pour Remotion
# ----------------------------------------------------------------------------
timeline = {
    "fps": 30,
    "duration": DUR,
    "impactLogo": IMPACT_LOGO,
    "impactFinal": IMPACT_FINAL,
    "countdown": COUNT,
    "bubbles": BUBBLES,
    "scenes": [{"id": i, "start": s, "end": e} for i, s, e in SCENES],
    "voiceClips": [{"srcStart": a, "srcEnd": b, "offset": o} for a, b, o in CLIPS],
    "words": words,
    "sfx": CUES,
}
json.dump(timeline, open(os.path.join(OUT_DATA, "timeline.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("OK — mix.wav, music_sfx.wav, voice_placed.wav, timeline.json")
print("Dernier mot :", words[-1])

# Contrôle d'équilibre voix / musique (pendant la parole)
_m = envd > 0.5
_rv = np.sqrt(np.mean(voice_st[0][_m] ** 2))
_rm = np.sqrt(np.mean(mix_nv[0][_m] ** 2))
_rm_free = np.sqrt(np.mean(mix_nv[0][~_m] ** 2))
print(f"Voix/musique pendant la parole : {20*np.log10(_rv/_rm):+.1f} dB ; musique hors parole vs voix : {20*np.log10(_rm_free/_rv):+.1f} dB")

# ----------------------------------------------------------------------------
# 6. TEASER 15 s (segments du mix, mêmes segments que Extras.tsx → TEASER_SEGMENTS)
# ----------------------------------------------------------------------------
TEASER = [(0.0, 7.45), (18.3, 4.3), (54.75, 3.25)]
full = load_audio(os.path.join(OUT_AUDIO, "mix.wav"))  # mono suffit pour l'assemblage
mixst = np.vstack([full, full])
xf = int(0.04 * SR)
teaser = np.zeros((2, int(15.0 * SR)))
pos = 0
for k, (s0, d) in enumerate(TEASER):
    seg = mixst[:, int(s0 * SR): int((s0 + d) * SR) + xf].copy()
    if k > 0:
        seg[:, :xf] *= np.linspace(0, 1, xf)
    if k < len(TEASER) - 1:
        seg[:, -xf:] *= np.linspace(1, 0, xf)
    n = min(seg.shape[1], teaser.shape[1] - pos)
    teaser[:, pos:pos + n] += seg[:, :n]
    pos += int(d * SR)
# whoosh aux raccords
sfx = np.zeros((2, teaser.shape[1]))
for j in (7.45, 11.75):
    s_whoosh(j, 0.6, 0.9)
teaser += sfx * 0.3
fo = int(0.6 * SR)
teaser[:, -fo:] *= np.linspace(1, 0.2, fo)
tmp = os.path.join(OUT_AUDIO, "teaser.tmp.wav")
write_wav(tmp, teaser / np.abs(teaser).max() * 0.9)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11:linear=true,aresample=48000",
                "-t", "15.000", "-c:a", "pcm_s16le", os.path.join(OUT_AUDIO, "teaser.wav")], check=True)
os.remove(tmp)

# ----------------------------------------------------------------------------
# 7. JINGLE DU LOGO (6 s) — riser, impact à 1,6 s, scintillement, accord final
# ----------------------------------------------------------------------------
L6 = int(6.0 * SR)
sfx = np.zeros((2, L6))
music = np.zeros((2, L6))
s_riser(1.6, 1.4, 1.2)
s_impact(1.6, 1.1)
s_shimmer(1.65, 1.4, 1.0)
s_whoosh(3.3, 0.6, 0.8)
s_ding(4.1, 0.9)
pad(1.6, 6.3, [48, 55, 60, 64, 67], 0.3, 2200)
bass(1.6, 36, 3.0, 1.2)
kick(1.6, 1.0)
music = add_reverb(music, 0.35)
sting = sfx * 0.6 + music * 0.5
fo = int(0.8 * SR)
sting[:, -fo:] *= np.linspace(1, 0, fo) ** 2
tmp = os.path.join(OUT_AUDIO, "sting.tmp.wav")
write_wav(tmp, sting / np.abs(sting).max() * 0.9)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.0:LRA=11:linear=true,aresample=48000",
                "-t", "6.000", "-c:a", "pcm_s16le", os.path.join(OUT_AUDIO, "logo_sting.wav")], check=True)
os.remove(tmp)
print("OK — teaser.wav (15 s), logo_sting.wav (6 s)")
