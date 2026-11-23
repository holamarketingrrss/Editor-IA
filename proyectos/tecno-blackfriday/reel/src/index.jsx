import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
// Design System – Tecno
const C = {navy: '#0B2342', verde: '#2CA58D', salvia: '#84BC9C', blanco: '#FFFFFF', glow: '#5FF2D2'};

const fontFaces = [400, 500, 700, 800, 900].map((w) =>
  `@font-face{font-family:'DM Sans';font-weight:${w};src:url(${staticFile(`fonts/dm-sans-latin-${w}-normal.woff2`)}) format('woff2');}`).join('\n');
const FONT = "'DM Sans', sans-serif";

const SUB_Y = 1335; // centro de los subtítulos (zona segura: 220 arriba / 420 abajo)
const clean = (t) => t.replace(/[.,]/g, '');

const Clip = ({clip}) => {
  const frame = useCurrentFrame();
  const dur = Math.round(clip.end * FPS) - Math.round(clip.start * FPS);
  // punch-in fijo por toma + leve deriva; en los inserts, push-in más marcado
  const drift = clip.broll ? interpolate(frame, [0, dur], [1.04, 1.12]) : interpolate(frame, [0, dur], [0, 0.025]);
  const scale = clip.broll ? drift : clip.zoom + drift;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile(`clips/${clip.file}`)} muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`,
          transformOrigin: clip.broll ? '50% 50%' : '50% 28%'}} />
    </AbsoluteFill>
  );
};

const fitSize = (text, base, weight) => {
  const perChar = weight >= 900 ? 0.6 : 0.56; // ancho aprox. de DM Sans por carácter (em)
  return Math.min(base, Math.floor(940 / (text.length * perChar)));
};

const Word = ({w, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const text = clean(w.text);
  const out = interpolate(frame, [dur - 2, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  if (!w.key) {
    const pop = spring({frame, fps, config: {damping: 16, stiffness: 260, mass: 0.5}});
    const size = fitSize(text, 96, 800);
    return (
      <div style={{position: 'absolute', left: 540, top: SUB_Y, fontFamily: FONT, fontWeight: 800, fontSize: size,
        letterSpacing: -1.5, color: C.blanco, whiteSpace: 'nowrap', opacity: Math.min(1, pop * 2) * out,
        transform: `translate(-50%,-50%) translateY(${(1 - pop) * 22}px) scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        textShadow: '0 3px 8px rgba(11,35,66,.55), 0 8px 28px rgba(11,35,66,.45)'}}>{text}</div>
    );
  }

  // palabra clave: rebote sutil con sobrepaso, halo verde que se enciende y se asienta, barrido de luz
  const pop = spring({frame, fps, config: {damping: 9, stiffness: 210, mass: 0.7}});
  const scale = interpolate(pop, [0, 1], [0.55, 1]);
  const glow = interpolate(frame, [0, 4, 14], [0.2, 1.25, 0.75], {extrapolateRight: 'clamp'});
  const sweep = interpolate(frame, [2, 16], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const bar = spring({frame: frame - 3, fps, config: {damping: 14, stiffness: 180}});
  const size = fitSize(text, 150, 900);
  const base = {fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -3, whiteSpace: 'nowrap', lineHeight: 1};
  return (
    <div style={{position: 'absolute', left: 540, top: SUB_Y, opacity: Math.min(1, pop * 2.2) * out,
      transform: `translate(-50%,-50%) translateY(${(1 - pop) * 36}px) scale(${scale})`}}>
      <div style={{...base, color: C.blanco, position: 'relative',
        textShadow: `0 0 ${10 * glow}px rgba(95,242,210,${0.95 * glow}), 0 0 ${34 * glow}px rgba(44,165,141,${0.9 * glow}),
          0 0 ${80 * glow}px rgba(44,165,141,${0.55 * glow}), 0 6px 18px rgba(11,35,66,.55)`}}>
        {text}
        <div style={{...base, position: 'absolute', inset: 0, color: 'transparent',
          backgroundImage: `linear-gradient(105deg, transparent ${sweep - 22}%, rgba(255,255,255,0) ${sweep - 12}%, ${C.glow} ${sweep}%, rgba(255,255,255,0) ${sweep + 12}%, transparent ${sweep + 22}%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>{text}</div>
      </div>
      <div style={{margin: '14px auto 0', height: 10, borderRadius: 999, width: `${bar * 46}%`,
        background: `linear-gradient(90deg, ${C.verde}, ${C.glow})`, boxShadow: `0 0 18px ${C.verde}`}} />
    </div>
  );
};

const Hook = ({h}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = Math.round((h.end - h.start) * FPS);
  const p = spring({frame, fps, config: {damping: 13, stiffness: 170}});
  const out = interpolate(frame, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dot = 0.6 + 0.4 * Math.sin(frame / 3);
  return (
    <div style={{position: 'absolute', left: 540, top: 282, opacity: p * out,
      transform: `translate(-50%,-50%) translateY(${(1 - p) * -30}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      display: 'flex', alignItems: 'center', gap: 18, padding: '18px 34px', borderRadius: 999,
      background: 'rgba(11,35,66,.86)', border: `2px solid ${C.verde}`, boxShadow: `0 0 28px rgba(44,165,141,.55)`,
      fontFamily: FONT, whiteSpace: 'nowrap'}}>
      <div style={{width: 16, height: 16, borderRadius: 999, background: C.glow, opacity: dot, boxShadow: `0 0 14px ${C.glow}`}} />
      <span style={{fontWeight: 800, fontSize: 38, letterSpacing: '0.18em', color: C.glow}}>{h.tag}</span>
      <span style={{fontWeight: 500, fontSize: 38, color: C.blanco}}>· {h.text}</span>
    </div>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bg = interpolate(frame, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const iso = spring({frame: frame - 3, fps, config: {damping: 11, stiffness: 150}});
  const logo = spring({frame: frame - 8, fps, config: {damping: 14, stiffness: 140}});
  const handle = spring({frame: frame - 16, fps, config: {damping: 15}});
  const ring = interpolate(frame, [0, 40], [0.6, 1.25], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: bg}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, #123a63 0%, ${C.navy} 62%)`}} />
      <div style={{position: 'absolute', left: 540, top: 830, width: 760, height: 760, borderRadius: 999,
        border: `3px solid rgba(44,165,141,${0.5 * (1.25 - ring) / 0.65 + 0.12})`, transform: `translate(-50%,-50%) scale(${ring})`}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 54, paddingBottom: 120}}>
        <Img src={staticFile('brand/isotipo-blanco.png')} style={{width: 190, transform: `scale(${iso})`,
          filter: `drop-shadow(0 0 24px rgba(44,165,141,.6))`}} />
        <Img src={staticFile('brand/logotipo-blanco.png')} style={{width: 600, opacity: logo,
          transform: `translateY(${(1 - logo) * 30}px)`}} />
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 50, letterSpacing: '0.06em', color: C.blanco,
          opacity: handle, transform: `translateY(${(1 - handle) * 24}px)`, padding: '14px 36px', borderRadius: 999,
          background: 'rgba(44,165,141,.18)', border: `2px solid ${C.verde}`}}>@tecnomorenooficial</div>
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
        // duración = fin redondeado − inicio redondeado (sin huecos de 1 cuadro); la última toma sigue bajo el fundido del cierre
        <Sequence key={i} from={Math.round(c.start * FPS)}
          durationInFrames={Math.round(c.end * FPS) - Math.round(c.start * FPS) + (i === data.clips.length - 1 ? 6 : 0)}>
          <Clip clip={c} />
        </Sequence>
      ))}
      {/* degradé navy suave abajo para que lean los subtítulos */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(11,35,66,0) 52%, rgba(11,35,66,.38) 72%, rgba(11,35,66,.5) 100%)'}} />
      <Sequence from={0} durationInFrames={Math.round(data.hook.end * FPS)}><Hook h={data.hook} /></Sequence>
      {data.words.map((w, i) => {
        const from = Math.round(w.start * FPS);
        const dur = Math.max(4, Math.round(w.end * FPS) - from);
        return (
          <Sequence key={'w' + i} from={from} durationInFrames={dur}>
            <Word w={w} dur={dur} />
          </Sequence>
        );
      })}
      <Sequence from={outroStart}><Outro /></Sequence>
      <Audio src={staticFile('voz.wav')} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={Math.round(data.duration * FPS)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
