import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {GlobalStyle} from '../components/core';
import {CaptionPill} from '../components/Captions';
import {SceneShell} from '../components/SceneShell';
import {Scene1Hook} from '../scenes/Scene1Hook';
import {Scene2Univers} from '../scenes/Scene2Univers';
import {Scene3Logo} from '../scenes/Scene3Logo';
import {Scene4Mission} from '../scenes/Scene4Mission';
import {Scene5Communaute} from '../scenes/Scene5Communaute';
import {Scene6Final} from '../scenes/Scene6Final';
import {scene, TimeProvider} from '../lib/time';

/** Les 6 scènes posées sur la timeline absolue (secondes). */
export const MasterVisuals: React.FC<{t: number; subtitles?: boolean}> = ({t, subtitles}) => {
  const s = (id: string) => scene(id);
  return (
    <TimeProvider t={t}>
      <GlobalStyle />
      <AbsoluteFill style={{background: '#0B2D34', overflow: 'hidden'}}>
        <SceneShell start={0} end={s('univers').start} type="none"><Scene1Hook /></SceneShell>
        <SceneShell start={s('univers').start} end={s('logo').start} type="iris" tin={0.45}><Scene2Univers /></SceneShell>
        <SceneShell start={s('logo').start} end={s('mission').start} type="wipe" tin={0.4}><Scene3Logo /></SceneShell>
        <SceneShell start={s('mission').start} end={s('communaute').start} type="iris" tin={0.35} origin={[0.5, 0.56]}><Scene4Mission /></SceneShell>
        <SceneShell start={s('communaute').start} end={s('final').start} type="push" tin={0.45}><Scene5Communaute /></SceneShell>
        <SceneShell start={s('final').start} end={60.01} type="iris" tin={0.3}><Scene6Final /></SceneShell>
        {subtitles && <CaptionPill />}
      </AbsoluteFill>
    </TimeProvider>
  );
};

/** Vidéo principale (60 s) — 9:16 ou 16:9 selon la composition. */
export const Master: React.FC<{subtitles?: boolean; withAudio?: boolean}> = ({subtitles = false, withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <>
      <MasterVisuals t={frame / fps} subtitles={subtitles} />
      {withAudio && <Audio src={staticFile('audio/mix.wav')} />}
    </>
  );
};
