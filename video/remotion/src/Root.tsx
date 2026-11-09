import React from 'react';
import {Composition} from 'remotion';
import {Master} from './compositions/Master';
import {HeroLoop, LogoReveal, Teaser} from './compositions/Extras';

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {/* 1. Vidéo principale — 1080 × 1920, 9:16, exactement 60 s */}
    <Composition id="Master-9x16" component={Master} durationInFrames={60 * FPS} fps={FPS} width={1080} height={1920} defaultProps={{subtitles: false}} />
    {/* 5. Version sous-titrée — 9:16 */}
    <Composition id="Master-9x16-SousTitres" component={Master} durationInFrames={60 * FPS} fps={FPS} width={1080} height={1920} defaultProps={{subtitles: true}} />
    {/* 2. Version horizontale — 1920 × 1080, 16:9 */}
    <Composition id="Master-16x9" component={Master} durationInFrames={60 * FPS} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: false}} />
    <Composition id="Master-16x9-SousTitres" component={Master} durationInFrames={60 * FPS} fps={FPS} width={1920} height={1080} defaultProps={{subtitles: true}} />
    {/* 3. Teaser — 15 s, 9:16 */}
    <Composition id="Teaser-15s" component={Teaser} durationInFrames={15 * FPS} fps={FPS} width={1080} height={1920} />
    {/* 4. Animation du logo — 1080 × 1080, 6 s */}
    <Composition id="Logo-Animation" component={LogoReveal} durationInFrames={6 * FPS} fps={FPS} width={1080} height={1080} />
    {/* Boucle Hero du site — 16:9, 8 s, sans son */}
    <Composition id="Hero-Loop" component={HeroLoop} durationInFrames={8 * FPS} fps={FPS} width={1920} height={1080} />
  </>
);
