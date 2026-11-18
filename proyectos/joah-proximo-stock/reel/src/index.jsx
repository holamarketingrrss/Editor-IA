import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
// JOAH: verde de marca #517054 (logo); oliva claro para texto sobre video; celeste para flashes
const C = {verde: '#517054', verdeOsc: '#2F4632', oliva: '#A9C483', blanco: '#FFFFFF', celeste: '#BFE6FF', crema: '#F3F3F4'};

const weights = [300, 400, 500, 600, 700, 800, 900];
const fontFaces = weights.map((w) => ['normal', 'italic'].map((s) =>
  `@font-face{font-family:'Montserrat';font-weight:${w};font-style:${s};src:url(${staticFile(`fonts/montserrat-latin-${w}-${s}.woff2`)}) format('woff2');}`
).join('')).join('');

// sombreado bajo (sin trazo): sombra corta y densa debajo + halo suave para separar del fondo
const SHADOW = '0 5px 0 rgba(0,0,0,.28), 0 6px 14px rgba(0,0,0,.65), 0 14px 40px rgba(0,0,0,.45)';

const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

const Clip = ({clip}) => {
  const frame = useCurrentFrame();
  const dur = Math.round((clip.end - clip.start) * FPS);
  let scale;
  if (clip.punch) {
    // toma hablada: zoom continuo + salto de zoom con la voz
    const p = Math.round((clip.punch - clip.start) * FPS);
    if (frame < p) {
      // entrada del video: zoom in rápido en los primeros 12 cuadros y sigue empujando
      scale = clip.zoom === 'in'
        ? interpolate(frame, [0, 12, p], [1.0, 1.1, 1.16], {easing: Easing.out(Easing.cubic), extrapolateRight: 'clamp'})
        : interpolate(frame, [0, p], [1.18, 1.06], {easing: ease, extrapolateRight: 'clamp'});
    } else {
      scale = interpolate(frame, [p, dur], [1.24, 1.32], {extrapolateRight: 'clamp'});
    }
  } else if (clip.zoom === 'in') {
    scale = interpolate(frame, [0, dur], [1.02, 1.16], {easing: ease, extrapolateRight: 'clamp'});
  } else {
    scale = interpolate(frame, [0, dur], [1.18, 1.03], {easing: ease, extrapolateRight: 'clamp'});
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo
        src={staticFile(`clips/${clip.file}`)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover',
          transformOrigin: clip.origin || '50% 50%', transform: `scale(${scale})`}}
      />
    </AbsoluteFill>
  );
};

// flash en el corte: sube 3 cuadros antes, pico en el corte, baja en 6
const Flash = ({type}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 3, 9], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const celeste = type === 'flash_celeste';
  return (
    <AbsoluteFill style={{
      opacity: o, mixBlendMode: celeste ? 'screen' : 'normal',
      background: celeste
        ? `radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, ${C.celeste} 45%, #7FC8F8 100%)`
        : '#FFFFFF',
    }} />
  );
};

const Word = ({w, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 12, stiffness: 260, mass: 0.5}});
  const scale = interpolate(pop, [0, 1], [w.hi ? 0.55 : 0.75, 1]);
  const y = interpolate(pop, [0, 1], [26, 0]);
  return (
    <div style={{
      position: 'absolute', left: 540, top: 1290, width: 1000,
      transform: `translate(-50%,-50%) translateY(${y}px) scale(${scale}) rotate(${w.hi ? -3 : 0}deg)`,
      opacity: Math.min(pop * 2, 1), color: w.color, fontSize: w.size,
      fontFamily: "'Montserrat'", fontWeight: w.weight, fontStyle: w.italic ? 'italic' : 'normal',
      textTransform: w.upper ? 'uppercase' : 'none', letterSpacing: w.upper ? -1 : 0,
      textAlign: 'center', lineHeight: 1, textShadow: SHADOW, whiteSpace: 'nowrap',
    }}>{w.text}</div>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bg = interpolate(frame, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const sp = (d, cfg = {damping: 12, stiffness: 170}) => spring({frame: frame - d, fps, config: cfg});
  const logo = sp(3);
  const l1 = sp(9), l2 = sp(14), l3 = sp(20), l4 = sp(26);
  const pulse = 1 + Math.sin(Math.max(0, frame - 30) / 5) * 0.025;
  const T = {fontFamily: "'Montserrat'", textAlign: 'center', lineHeight: 1};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, ${C.verde} 0%, ${C.verdeOsc} 100%)`, opacity: bg}} />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 380}}>
        <Img src={staticFile('brand/blanco.png')} style={{width: 260,
          transform: `scale(${logo}) rotate(${(1 - logo) * -25}deg)`, filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.3))'}} />
        <div style={{...T, marginTop: 90, fontSize: 112, fontWeight: 900, color: C.blanco, textTransform: 'uppercase', letterSpacing: -2,
          opacity: l1, transform: `translateY(${(1 - l1) * 40}px)`, textShadow: '0 6px 16px rgba(0,0,0,.3)'}}>Escribinos</div>
        <div style={{...T, marginTop: 34, padding: '22px 54px', borderRadius: 999, background: C.blanco, color: C.verde,
          fontSize: 84, fontWeight: 800, fontStyle: 'italic', opacity: l2,
          transform: `translateY(${(1 - l2) * 40}px) scale(${pulse})`, boxShadow: '0 10px 30px rgba(0,0,0,.3)'}}>por WhatsApp</div>
        <div style={{...T, marginTop: 56, fontSize: 60, fontWeight: 500, color: C.blanco, opacity: l3,
          transform: `translateY(${(1 - l3) * 30}px)`}}>y pedí el <span style={{fontWeight: 900, fontStyle: 'italic', color: '#D6E8BE'}}>catálogo mayorista</span></div>
        <div style={{...T, marginTop: 90, fontSize: 50, fontWeight: 700, color: C.blanco, letterSpacing: 3, opacity: l4 * 0.95}}>@joah.tiendaa</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Reel = () => {
  const outroStart = Math.round(data.outroAt * FPS);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontFaces}</style>
      {data.clips.map((c, i) => {
        const from = Math.round(c.start * FPS);
        const dur = (i === data.clips.length - 1 ? outroStart + 8 : Math.round(c.end * FPS)) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Clip clip={c} />
          </Sequence>
        );
      })}
      {/* oscurecido suave en la zona de subtítulos para que no se pierdan (sin caja) */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.55) 64%, rgba(0,0,0,.55) 75%, rgba(0,0,0,0) 86%)'}} />
      {data.words.map((w, i) => {
        const from = Math.round(w.start * FPS);
        const dur = Math.max(4, Math.round(w.end * FPS) - from);
        return (
          <Sequence key={'w' + i} from={from} durationInFrames={dur}>
            <Word w={w} dur={dur} />
          </Sequence>
        );
      })}
      {data.clips.filter((c) => c.trans !== 'none').map((c, i) => (
        <Sequence key={'f' + i} from={Math.round(c.start * FPS) - 3} durationInFrames={10}>
          <Flash type={c.trans} />
        </Sequence>
      ))}
      <Sequence from={outroStart}>
        <Outro />
      </Sequence>
      <Sequence from={outroStart - 3} durationInFrames={10}><Flash type="flash_blanco" /></Sequence>
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={Math.round(data.duration * FPS)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
