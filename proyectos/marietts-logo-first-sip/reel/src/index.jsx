import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
// Design system Mariett's
const C = {moss: '#464704', brown: '#423926', ivory: '#F3F5E7', white: '#FFFFFF'};

const fontFaces = `
@font-face{font-family:'Lexend';font-weight:400;src:url(${staticFile('fonts/Lexend-Regular.ttf')}) format('truetype');}
@font-face{font-family:'The Seasons';font-weight:400;src:url(${staticFile('fonts/TheSeasons-Regular.ttf')}) format('truetype');}
`;

const SHADOW = '0 2px 6px rgba(0,0,0,.40), 0 6px 26px rgba(0,0,0,.38)';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const s = (t) => Math.round(t * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

// Layout de la pantalla dividida (sin escalar hacia arriba: paneles 1080x540 del 16:9 original)
const PANEL_H = 540;
const SPLIT = {a: 0, b: 548, band: [1088, 1372], c: 1372};

const Clip = ({clip}) => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <OffthreadVideo src={staticFile(`clips/${clip.file}`)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

// Gancho: "Your logo" (The Seasons itálica) y luego "on the first sip." (Lexend Regular, slide)
const HookTitles = ({dur}) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  const t1 = interpolate(f, [s(0.15), s(0.75)], [0, 1], {...clamp, easing: ease});
  const t2 = interpolate(f, [s(0.85), s(1.5)], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.30) 0%, rgba(0,0,0,.12) 26%, rgba(0,0,0,0) 40%)'}} />
      <div style={{position: 'absolute', top: 270, left: 0, right: 0, textAlign: 'center', color: C.white}}>
        <div style={{fontFamily: "'The Seasons'", fontStyle: 'italic', fontSize: 132, lineHeight: 1.0, letterSpacing: -1,
          textShadow: SHADOW, opacity: t1, transform: `translateY(${(1 - t1) * 26}px)`}}>
          Your logo
        </div>
        <div style={{fontFamily: 'Lexend', fontWeight: 400, fontSize: 60, marginTop: 16, letterSpacing: 0.5,
          textShadow: SHADOW, opacity: t2, transform: `translateX(${(1 - t2) * 160}px)`}}>
          on the first sip.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Panel = ({p, top}) => (
  <div style={{position: 'absolute', left: 0, top, width: 1080, height: PANEL_H, overflow: 'hidden'}}>
    <OffthreadVideo src={staticFile(`clips/${p.file}`)} muted style={{width: 1080, height: PANEL_H}} />
  </div>
);

// Pantalla dividida en 3 + "Now available for your events." + fundido a moss + logo
const SplitOutro = ({fadeAt}) => {
  const f = useCurrentFrame();
  const txt = interpolate(f, [s(0.4), s(1.1)], [0, 1], {...clamp, easing: ease});
  const fade = interpolate(f, [s(fadeAt), s(fadeAt + 0.7)], [1, 0], {...clamp, easing: Easing.inOut(Easing.quad)});
  const move = interpolate(f, [s(fadeAt + 0.2), s(fadeAt + 1.0)], [0, 1], {...clamp, easing: ease});
  const logo = interpolate(f, [s(fadeAt + 0.6), s(fadeAt + 1.5)], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const [b0, b1] = SPLIT.band;
  const textY = interpolate(move, [0, 1], [(b0 + b1) / 2, 1110]);
  return (
    <AbsoluteFill style={{backgroundColor: C.moss}}>
      <AbsoluteFill style={{opacity: fade}}>
        <Panel p={data.panels[0]} top={SPLIT.a} />
        <Panel p={data.panels[1]} top={SPLIT.b} />
        <Panel p={data.panels[2]} top={SPLIT.c} />
      </AbsoluteFill>
      <Img src={staticFile('brand/primary-ivory.png')} style={{position: 'absolute', width: 640, left: (1080 - 640) / 2,
        top: 720, opacity: logo, transform: `scale(${0.97 + 0.03 * logo})`}} />
      <div style={{position: 'absolute', left: 60, right: 60, top: textY, transform: `translateY(-50%) translateY(${(1 - txt) * 30}px)`,
        textAlign: 'center', color: C.white, fontFamily: 'Lexend', fontWeight: 400, fontSize: 54, letterSpacing: 0.4,
        textShadow: SHADOW, opacity: txt}}>
        Now available for your events.
      </div>
    </AbsoluteFill>
  );
};

const Reel = () => {
  const split = s(data.splitAt);
  const hookEnd = s(2.6); // los títulos cubren el gancho y el inicio de la impresión
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontFaces}</style>
      {data.clips.map((c, i) => (
        <Sequence key={i} from={s(c.start)} durationInFrames={s(c.end) - s(c.start)}>
          <Clip clip={c} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={hookEnd}>
        <HookTitles dur={hookEnd} />
      </Sequence>
      <Sequence from={split}>
        <SplitOutro fadeAt={data.fadeAt - data.splitAt} />
      </Sequence>
      <Audio src={staticFile(data.music)} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={s(data.duration)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
