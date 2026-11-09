# SYMO Print — Vidéo de lancement « L'impression prend la parole ! »

Production Motion Design de 60 s (9:16), avec ses déclinaisons, entièrement modifiable.

## Livrables (`video/remotion/out/`)

| Fichier | Format | Durée |
|---|---|---|
| `SYMO-Print_Lancement_9x16_60s.mp4` | 1080 × 1920, 9:16, H.264 + AAC 320k | 60,00 s |
| `SYMO-Print_Lancement_9x16_60s_sous-titres.mp4` | 1080 × 1920, sous-titres incrustés | 60,00 s |
| `SYMO-Print_Lancement_16x9_60s.mp4` | 1920 × 1080, 16:9 (site internet) | 60,00 s |
| `SYMO-Print_Lancement_16x9_60s_sous-titres.mp4` | 1920 × 1080, sous-titres incrustés | 60,00 s |
| `SYMO-Print_Teaser_9x16_15s.mp4` | 1080 × 1920, teaser | 15,00 s |
| `SYMO-Print_Logo_Animation_1080x1080.mp4` | 1080 × 1080, animation de logo seule | 6,00 s |
| `SYMO-Print_Hero_Loop_16x9_sans-son.mp4` | 1920 × 1080, boucle parfaite **sans son** pour le Hero du site | 8,00 s |
| `SYMO-Print_Lancement_sous-titres.srt` | Sous-titres séparés (TikTok, YouTube, Facebook) | — |

> Les MP4 ne sont pas versionnés dans Git (trop lourds) : ils sont livrés à part. Pour les régénérer, voir plus bas.

## Structure du projet

```
video/
├── SCRIPT-VOIX-OFF.md        script minuté (référence créative)
├── ANALYSE-REFERENCES.md     analyse des 3 vidéos de référence
├── VOIX-OFF-ELEVENLABS.txt   texte envoyé à ElevenLabs
├── assets/logo/              logos officiels fournis (non modifiés)
├── audio/
│   ├── voix-off.mp3          voix off ElevenLabs (source)
│   ├── words_src.json        transcription mot à mot horodatée de la voix
│   └── build_audio.py        ⚙️ bande son : voix replacée + musique + effets + mixage
└── remotion/                 ⚙️ projet vidéo (React + Remotion)
    ├── public/               logos, polices (Inter, Caveat — licence OFL), audio généré
    ├── src/config/brand.ts   🎨 couleurs de la charte, polices, logos
    ├── src/config/content.ts ✏️ TOUS les textes (titres, questions, @compte…)
    ├── src/data/timeline.json  ⏱️ scènes + mots horodatés (généré par build_audio.py)
    ├── src/data/captions.json  ✏️ texte des sous-titres
    ├── src/components/       briques : typo cinétique, fonds, logo, téléphone, pictos…
    ├── src/scenes/           Scene1Hook … Scene6Final (une scène = un fichier)
    ├── src/compositions/     Master (9:16 / 16:9), Teaser, Logo, Hero
    └── scripts/              render.mjs, stills.mjs, make_srt.py
```

## Synchronisation image / son

La voix off d'ElevenLabs a été **découpée dans ses silences et replacée** sur la timeline de 60 s, **sans modifier sa vitesse**. Seules les respirations entre les scènes ont été rallongées (décompte avant le logo, impact final…).
`build_audio.py` écrit `timeline.json`, qui contient les mots horodatés. Toutes les animations se calent **sur les mots prononcés** (par ex. `ws('autrement')`). Si la voix change, il suffit de relancer les deux commandes ci-dessous pour que tout se recale.

## Modifier

- **Un texte** : `remotion/src/config/content.ts` (et `src/data/captions.json` pour les sous-titres).
- **Le nom du compte** : `CONTENT.handle` (actuellement `@symoprint`, **provisoire**).
- **Une couleur** : `remotion/src/config/brand.ts`.
- **Une durée, une coupe de la voix** : `audio/build_audio.py` (`CLIPS`, `SCENES`).
- **Prévisualiser en direct** : `cd video/remotion && npm install && npm run studio`.

## Régénérer

```bash
# 1. Bande son + timeline (Python 3, numpy, scipy, ffmpeg)
python3 video/audio/build_audio.py
# 2. Vidéos (Node 18+)
cd video/remotion && npm install
node scripts/render.mjs all        # ou : node scripts/render.mjs Master-9x16
python3 scripts/make_srt.py
```

## Notes de production

- **Musique et effets sonores 100 % originaux**, synthétisés par `build_audio.py` (La mineur, 120 BPM, progression Am–F–C–G). Il n'y a aucun échantillon tiers, donc aucun problème de droits.
- **Mixage** : −14 LUFS intégrés, true peak −1 dBTP. La musique baisse automatiquement sous la voix (environ +12 dB d'écart pendant la parole).
- **Logo** : utilisé tel que fourni, sans déformation ni changement de couleur. Le logo complet est posé sur une carte blanche pour rester lisible sur les fonds bleu pétrole. Les PNG fournis utilisent #0F7291 et #F2912A, légèrement différents de la charte (#1F7A8C et #F4A62A), qui est appliquée partout ailleurs.
- **Polices** : Inter (celle du site) et Caveat pour les mots manuscrits. Les deux sont sous licence SIL OFL et embarquées.
- **Zones de sécurité** : en 9:16, les éléments importants évitent le bas et la droite de l'écran, où TikTok et Reels affichent leur interface.
