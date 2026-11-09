/**
 * TOUS LES TEXTES DE LA VIDÉO — modifiables ici sans toucher aux animations.
 * Les horaires viennent de `data/timeline.json` (généré par video/audio/build_audio.py
 * à partir de la voix off), ce qui garde la synchro image/son.
 */
export const CONTENT = {
  handle: '@symoprint', // ⚠️ provisoire — remplacer par le vrai nom du compte
  brandName: 'SYMO Print',

  hook: {
    questions: [
      {text: 'Quel papier pour mes cartes de visite ?', author: 'Awa · Boutique'},
      {text: 'Quelle technique pour mes t-shirts ?', author: 'Karim · Association', tshirt: true},
    ],
    avalanche: [
      'DTF ou broderie ?',
      'Flyer ou dépliant ?',
      'Mat ou brillant ?',
      'Pourquoi mes couleurs sortent ternes ?',
      "C'est quoi un BAT ?",
    ],
    titleLines: [['ET', 'SI', 'ON', 'VOUS'], ['FAISAIT', 'DÉCOUVRIR'], ["L'IMPRIMERIE"]],
    hand: 'autrement ?',
  },

  univers: {
    titles: ['DES IDÉES QUI PRENNENT VIE.', 'DES COULEURS QUI ATTIRENT LES REGARDS.', 'DES IMPRESSIONS QUI MARQUENT LES ESPRITS.'],
    paper: 'PAPIER',
    textile: 'TEXTILE',
  },

  logo: {
    title1: ['NOUS SOMMES', 'SYMO PRINT.'],
    stamp: 'NOUVEAU COMPTE',
    title2: ['NOUVEAU COMPTE,', 'NOUVELLE AVENTURE !'],
    title3a: "L'IMPRESSION",
    title3b: 'prend la parole !',
    title4: ['ET NOUS ARRIVONS', 'SUR VOS ÉCRANS !'],
  },

  mission: {
    intro: ['ICI,', 'PAS DE JARGON.'],
    jargon: ['Quadrichromie', 'Fond perdu', 'BAT', 'Pantone', '300 DPI', 'Grammage'],
    items: [
      {key: 'conseils', title: 'DES CONSEILS POUR MIEUX IMPRIMER.'},
      {key: 'astuces', title: 'DES ASTUCES POUR MIEUX COMMUNIQUER.'},
      {key: 'coulisses', title: "LES COULISSES DE L'IMPRIMERIE."},
      {key: 'techniques', title: "LES TECHNIQUES ET SECRETS DE L'IMPRESSION."},
      {key: 'idées', title: 'DES IDÉES POUR VALORISER VOTRE IMAGE.'},
    ],
    techniques: ['CMJN', 'DTF', 'BRODERIE'],
  },

  communaute: {
    lead: 'QUE VOUS SOYEZ',
    profiles: ['ENTREPRENEUR', 'COMMERÇANT', 'CRÉATEUR', 'CURIEUX'],
    title1: ['ENTREPRENEUR, COMMERÇANT,', 'CRÉATEUR OU SIMPLEMENT CURIEUX…'],
    title2: ['CET UNIVERS', 'EST AUSSI LE VÔTRE !'],
    title3: ['UNE QUESTION ?', 'POSEZ-LA EN COMMENTAIRE !'],
    typed: 'Quelle technique pour imprimer le logo sur mes t-shirts ?',
    reply: 'On vous répond en vidéo !',
  },

  final: {
    title1: ['BIENVENUE DANS', "L'UNIVERS SYMO PRINT !"],
    title2: ['ABONNEZ-VOUS, PARTAGEZ', 'ET RESTEZ CONNECTÉS !'],
    firstFollowers: 'Soyez parmi nos premiers abonnés !',
    signatureA: 'SYMO PRINT —',
    signatureB: ['VOS', 'IDÉES', 'PRENNENT', 'FORME.'],
  },

  // Mots-clés colorés en orange dans les sous-titres
  keywords: ['papier', 't-shirts', 't-shirt', 'autrement', 'idée', 'vie', 'textile', 'métier', 'simoprint', 'nouveau', 'nouveaux',
    'aventure', 'aventures', 'parole', 'écrans', 'jargon', 'conseils', 'astuces', 'coulisses', 'secrets', 'image',
    'curieux', 'vôtre', 'commentaire', 'vidéo', 'bienvenue', 'abonnez', 'connectés', 'forme'],
};
