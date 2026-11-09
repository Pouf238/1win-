import {useVideoConfig} from 'remotion';

export type Rect = {x: number; y: number; w: number; h: number};

/**
 * Zones de mise en page. Les scènes dessinent leurs visuels dans une boîte
 * virtuelle de 1000 × 1000 (voir <Zone/>) : la même scène s'adapte ainsi au
 * vertical 9:16, à l'horizontal 16:9 et au carré.
 * Le vertical respecte les zones de sécurité TikTok / Reels (bas et droite).
 */
export const useLayout = () => {
  const {width: W, height: H} = useVideoConfig();
  const landscape = W > H * 1.2;
  const square = !landscape && W >= H * 0.9;
  if (landscape) {
    return {
      W, H, landscape, square,
      u: H / 1080,
      title: {x: 0.06 * W, y: 0.16 * H, w: 0.42 * W, h: 0.68 * H} as Rect,
      visual: {x: 0.5 * W, y: 0.06 * H, w: 0.46 * W, h: 0.88 * H} as Rect,
      full: {x: 0.2 * W, y: 0.04 * H, w: 0.6 * W, h: 0.92 * H} as Rect,
      pillY: 0.86 * H,
      titleAlign: 'left' as const,
    };
  }
  if (square) {
    return {
      W, H, landscape, square,
      u: W / 1080,
      title: {x: 0.07 * W, y: 0.05 * H, w: 0.86 * W, h: 0.26 * H} as Rect,
      visual: {x: 0.15 * W, y: 0.3 * H, w: 0.7 * W, h: 0.62 * H} as Rect,
      full: {x: 0.08 * W, y: 0.08 * H, w: 0.84 * W, h: 0.84 * H} as Rect,
      pillY: 0.9 * H,
      titleAlign: 'center' as const,
    };
  }
  return {
    W, H, landscape, square,
    u: W / 1080,
    title: {x: 0.065 * W, y: 0.085 * H, w: 0.87 * W, h: 0.235 * H} as Rect,
    visual: {x: 0.04 * W, y: 0.31 * H, w: 0.92 * W, h: 0.47 * H} as Rect,
    full: {x: 0.04 * W, y: 0.2 * H, w: 0.92 * W, h: 0.6 * H} as Rect,
    pillY: 0.8 * H,
    titleAlign: 'center' as const,
  };
};
