import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';
import brand from './brand.json';

const FPS = 30;
const C = brand.colores;
// un color puede ser el nombre de la paleta de la marca ('amarillo') o un hex ('#FFFFFF')
const col = (v) => C[v] ?? v;

// Tipografías de la marca: brand.fuentes tiene 4 casilleros (G, B, S, K). "archivo" es el woff2 en public/fonts.
const fontFaces = Object.values(brand.fuentes)
  .filter((f) => f.archivo)
  .map((f) => `@font-face{font-family:'${f.familia}';font-weight:${f.peso ?? 400};src:url(${staticFile('fonts/' + f.archivo)}) format('woff2');}`)
  .join('\n');

const FONT = Object.fromEntries(Object.entries(brand.fuentes).map(([k, f]) => [k, {
  fontFamily: `'${f.familia}', ${f.respaldo ?? 'sans-serif'}`,
  fontWeight: f.peso ?? 400,
  textTransform: f.mayusculas ? 'uppercase' : 'none',
  lineHeight: f.interlineado ?? 1,
  letterSpacing: f.espaciado ?? 0,
}]));

const SHADOW = '0 4px 10px rgba(0,0,0,.55), 0 10px 40px rgba(0,0,0,.45)';
// palabras en color: sombra más densa para separarlas de fondos cálidos (sin caja)
const SHADOW_COLOR = '0 3px 0 rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.75), 0 12px 48px rgba(0,0,0,.6)';

const Clip = ({clip}) => {
  const frame = useCurrentFrame();
  const durationInFrames = Math.round((clip.end - clip.start) * FPS);
  // leve push-in en cada toma
  const scale = interpolate(frame, [0, durationInFrames], [1.06, 1.14], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo
        src={staticFile(`clips/${clip.file}`)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: clip.pos || '50% 50%', transform: `scale(${scale})`}}
      />
    </AbsoluteFill>
  );
};

const Word = ({w, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 11, stiffness: 220, mass: 0.6}});
  const out = w.hold ? 1 : interpolate(frame, [dur - 3, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(pop, [0, 1], [0.4, 1]);
  const rot = interpolate(pop, [0, 1], [w.rot * 2.5, w.rot]);
  const y = interpolate(pop, [0, 1], [40, 0]);
  const color = col(w.color);
  const esTexto = color.toLowerCase() === col('texto').toLowerCase();
  return (
    <div style={{
      position: 'absolute', left: w.x, top: w.y, transform: `translate(-50%,-50%) translateY(${y}px) rotate(${rot}deg) scale(${scale})`,
      opacity: Math.min(pop * 1.6, 1) * out, color, fontSize: w.size,
      textShadow: esTexto ? SHADOW : SHADOW_COLOR,
      whiteSpace: 'nowrap', ...FONT[w.font],
    }}>{w.text}</div>
  );
};

const Sticker = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 9, stiffness: 160}});
  const wiggle = Math.sin(frame / 4) * 3;
  return (
    <Img src={staticFile(`brand/${s.img}`)} style={{
      position: 'absolute', left: s.x, top: s.y, width: s.w,
      transform: `translate(-50%,-50%) scale(${pop}) rotate(${s.rot + wiggle}deg)`,
      filter: s.white ? 'brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,.5))' : 'drop-shadow(0 6px 16px rgba(0,0,0,.5))',
    }} />
  );
};

// Cierre: fondo de marca + logo + @handle
const Outro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = brand.outro ?? {};
  const bg = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const logo = spring({frame: frame - 4, fps, config: {damping: 10, stiffness: 150}});
  const handle = spring({frame: frame - 14, fps, config: {damping: 14}});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: col(o.fondo ?? brand.acentos?.[0] ?? 'texto'), opacity: bg * 0.92}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 60}}>
        <Img src={staticFile(`brand/${brand.logo}`)} style={{width: 620, transform: `scale(${logo}) rotate(${(1 - logo) * -20}deg)`,
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.35))'}} />
        <div style={{...FONT[o.fuenteHandle ?? 'S'], fontSize: 64, color: col(o.colorHandle ?? 'texto'), letterSpacing: 4, opacity: handle,
          transform: `translateY(${(1 - handle) * 40}px)`, textShadow: '0 4px 14px rgba(0,0,0,.35)'}}>{brand.handle}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Reel = () => {
  const outroStart = Math.round(data.outroAt * FPS);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontFaces}</style>
      {data.clips.map((c, i) => (
        <Sequence key={i} from={Math.round(c.start * FPS)} durationInFrames={Math.round((c.end - c.start) * FPS)}>
          <Clip clip={c} />
        </Sequence>
      ))}
      {/* viñeta suave para que se lean las palabras, sin fondo por palabra */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,.35) 100%)'}} />
      {data.stickers.map((s, i) => (
        <Sequence key={'s' + i} from={Math.round(s.start * FPS)} durationInFrames={Math.round((s.end - s.start) * FPS)}>
          <Sticker s={s} />
        </Sequence>
      ))}
      {data.words.map((w, i) => {
        const from = Math.round((w.start + data.voiceOffset) * FPS);
        const dur = Math.max(5, Math.round((w.end + data.voiceOffset) * FPS) - from);
        return (
          <Sequence key={'w' + i} from={from} durationInFrames={dur}>
            <Word w={w} dur={dur} />
          </Sequence>
        );
      })}
      {data.clips.length > 0 && (
        <Sequence from={outroStart}>
          <Outro />
        </Sequence>
      )}
      {data.voz !== false && (
        <Sequence from={Math.round(data.voiceOffset * FPS)}>
          <Audio src={staticFile('voz.mp3')} />
        </Sequence>
      )}
      {data.music && <Audio src={staticFile(data.music)} volume={data.musicVolume ?? 0.18} />}
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={Math.max(1, Math.round(data.duration * FPS))} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
