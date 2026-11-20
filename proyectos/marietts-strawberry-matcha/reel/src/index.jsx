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
@font-face{font-family:'Lexend';font-weight:500;src:url(${staticFile('fonts/Lexend-Medium.ttf')}) format('truetype');}
@font-face{font-family:'The Seasons';font-weight:400;src:url(${staticFile('fonts/TheSeasons-Regular.ttf')}) format('truetype');}
`;

// sombreado sutil: separa el texto blanco del fondo sin caja
const SHADOW = '0 2px 6px rgba(0,0,0,.35), 0 6px 24px rgba(0,0,0,.35)';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const s = (f) => Math.round(f * FPS);

const Clip = ({clip}) => {
  const frame = useCurrentFrame();
  const dur = s(clip.end - clip.start);
  // push-in leve y constante para dar dinamismo sin distraer
  const scale = interpolate(frame, [0, dur], [1.0, 1.045], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile(`clips/${clip.file}`)} muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}} />
    </AbsoluteFill>
  );
};

// Títulos de apertura: "The holiday menu is here." (Lexend Medium, slide down)
// + "Strawberry Matcha" (The Seasons Bold Italic, slide right)
const Titles = ({dur}) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [dur - 9, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t1 = interpolate(f, [s(0.25), s(0.95)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const t2 = interpolate(f, [s(0.8), s(1.55)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill style={{opacity: out}}>
      {/* degradado muy suave arriba para asegurar lectura */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,.12) 30%, rgba(0,0,0,0) 45%)'}} />
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', color: C.white}}>
        <div style={{fontFamily: 'Lexend', fontWeight: 500, fontSize: 58, letterSpacing: 0.5, textShadow: SHADOW,
          opacity: t1, transform: `translateY(${(1 - t1) * -70}px)`}}>
          The holiday menu is here.
        </div>
        <div style={{fontFamily: "'The Seasons'", fontWeight: 700, fontStyle: 'italic', fontSize: 96, lineHeight: 1.1,
          marginTop: 14, letterSpacing: -0.5, textShadow: SHADOW, WebkitTextStroke: '1.2px #fff',
          opacity: t2, transform: `translateX(${(1 - t2) * -140}px)`}}>
          Strawberry Matcha
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Cierre: fondo moss, CTA en Lexend Regular y luego el logo en fundido
const Outro = () => {
  const f = useCurrentFrame();
  const txt = interpolate(f, [s(0.15), s(0.85)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const logo = interpolate(f, [s(1.75), s(2.65)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const shift = interpolate(f, [s(1.6), s(2.5)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill style={{backgroundColor: C.moss}}>
      <Img src={staticFile('brand/primary-ivory.png')} style={{position: 'absolute', width: 640, left: (1080 - 640) / 2,
        top: 660, opacity: logo, transform: `scale(${0.97 + 0.03 * logo})`}} />
      <div style={{position: 'absolute', left: 80, right: 80, top: 960 + shift * 120, transform: 'translateY(-50%)',
        textAlign: 'center', color: C.white, fontFamily: 'Lexend', fontWeight: 400, fontSize: 50, lineHeight: 1.45,
        letterSpacing: 0.3, opacity: txt}}>
        <div style={{transform: `translateY(${(1 - txt) * 24}px)`}}>Now booking December.</div>
        <div style={{transform: `translateY(${(1 - txt) * 36}px)`}}>Inquire about your event.</div>
      </div>
    </AbsoluteFill>
  );
};

const Reel = () => {
  const outro = s(data.outroAt);
  const titlesEnd = s(data.clips[0].end);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontFaces}</style>
      {data.clips.map((c, i) => (
        <Sequence key={i} from={s(c.start)} durationInFrames={s(c.end) - s(c.start)}>
          <Clip clip={c} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={titlesEnd}>
        <Titles dur={titlesEnd} />
      </Sequence>
      <Sequence from={outro}>
        <Outro />
      </Sequence>
      <Audio src={staticFile(data.music)} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={s(data.duration)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
