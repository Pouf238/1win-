import {staticFile} from 'remotion';

/**
 * Charte SYMO Print — NE PAS MODIFIER les couleurs principales (brief §3).
 * `petrolDeep` / `petrolNight` sont des ombres du bleu pétrole (#1F7A8C mélangé
 * à du noir) utilisées uniquement pour la profondeur des fonds sombres.
 */
export const BRAND = {
  petrol: '#1F7A8C',
  orange: '#F4A62A',
  white: '#FFFFFF',
  grey: '#F5F5F5',
  petrolDeep: '#14525E',
  petrolNight: '#0B2D34',
  ink: '#0E3A43', // texte foncé sur fond clair (pétrole très sombre)
  muted: '#6B8A90',
};

export const FONT_SANS = 'SymoInter';
export const FONT_HAND = 'SymoCaveat';

export const LOGO = {
  icon: staticFile('logo/symo-print-icon.png'), // 1024 × 1024
  wordmark: staticFile('logo/symo-print-wordmark.png'), // 3000 × 882
  wordmarkRatio: 3000 / 882,
};

export const fontFaces = `
@font-face { font-family: '${FONT_SANS}'; src: url('${staticFile('fonts/Inter.ttf')}') format('truetype'); font-weight: 100 900; font-display: block; }
@font-face { font-family: '${FONT_HAND}'; src: url('${staticFile('fonts/Caveat.ttf')}') format('truetype'); font-weight: 400 700; font-display: block; }
`;
