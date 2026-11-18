import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
// Design system – Mariett's (tokens.json)
const C = {moss: '#464704', sage: '#9ca889', brown: '#423926', sand: '#b7a78c', ivory: '#f3f5e7'};

const fontFaces = `
@font-face{font-family:'The Seasons';src:url(${staticFile('fonts/TheSeasons-Regular.ttf')}) format('truetype');}
@font-face{font-family:'Lexend';font-weight:300;src:url(${staticFile('fonts/Lexend-Light.ttf')}) format('truetype');}
@font-face{font-family:'Lexend';font-weight:400;src:url(${staticFile('fonts/Lexend-Regular.ttf')}) format('truetype');}
@font-face{font-family:'Lexend';font-weight:600;src:url(${staticFile('fonts/Lexend-SemiBold.ttf')}) format('truetype');}
@font-face{font-family:'Lexend';font-weight:700;src:url(${staticFile('fonts/Lexend-Bold.ttf')}) format('truetype');}
`;
const SEASONS = {fontFamily: "'The Seasons', Georgia, serif"};
const LEXEND = {fontFamily: "Lexend, 'Helvetica Neue', Arial, sans-serif"};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const f = (s) => Math.round(s * FPS);
// The Seasons es DEMO: su apóstrofo trae la marca "DEMO". Los apóstrofos van en Lexend.
const ap = (t) => t.split(/(['’])/).map((p, i) => (p === "'" || p === '’')
  ? <span key={i} style={{fontFamily: 'Lexend', fontStyle: 'normal', fontWeight: 300}}>’</span> : p);
// halo ivory para separar el texto moss de los cuadros de la pared
const HALO = '0 0 14px rgba(243,245,231,.95), 0 0 4px rgba(243,245,231,.9)';
const SHADE = '0 2px 10px rgba(0,0,0,.55), 0 0 3px rgba(0,0,0,.35)';

const Clip = ({clip}) => {
  const frame = useCurrentFrame();
  const dur = f(clip.end - clip.start);
  // push-in muy leve para dar ritmo sin que se note el zoom
  const z = clip.zoom ?? [1.0, 1.04];
  const scale = interpolate(frame, [0, dur], z, clamp);
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile(`clips/${clip.file}`)} muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`,
          transformOrigin: clip.origin || '50% 40%'}} />
    </AbsoluteFill>
  );
};

// Título de apertura, como la referencia: "Better Together" + pastilla moss con la serie
const IntroTitle = ({dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = spring({frame: frame - 3, fps, config: {damping: 16, stiffness: 90}});
  const pill = spring({frame: frame - 14, fps, config: {damping: 18, stiffness: 110}});
  const out = interpolate(frame, [dur - 6, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1095, textAlign: 'center',
        ...SEASONS, fontStyle: 'italic', fontSize: 128, lineHeight: 1, letterSpacing: '-0.01em', color: '#fff', whiteSpace: 'nowrap',
        opacity: t, transform: `translateY(${(1 - t) * 50}px) scale(${0.94 + 0.06 * t})`,
        filter: `blur(${(1 - t) * 8}px)`, textShadow: '0 6px 30px rgba(0,0,0,.25)'}}>Better Together</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1280, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: C.moss, color: C.ivory, ...LEXEND, fontWeight: 400, fontSize: 40,
          padding: '10px 26px', letterSpacing: '0.01em', clipPath: `inset(0 ${(1 - pill) * 100}% 0 0)`}}>
          A Mariett's Flavors Podcast Series</div>
      </div>
    </AbsoluteFill>
  );
};

// Placa de la pregunta (moss a sangre, como la referencia)
const QuestionCard = ({card, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame, fps, config: {damping: 15, stiffness: 120}});
  const b = spring({frame: frame - 8, fps, config: {damping: 18}});
  const inBg = interpolate(frame, [0, 5], [0, 1], clamp);
  const out = interpolate(frame, [dur - 4, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: C.moss, opacity: inBg * out, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', padding: '0 110px'}}>
        <div style={{...SEASONS, fontStyle: 'italic', color: C.ivory, fontSize: 130, lineHeight: 0.98,
          opacity: a, transform: `translateY(${(1 - a) * 40}px)`}}>{ap(card.title)}</div>
        <div style={{width: 120 * b, height: 3, background: C.sage, margin: '44px auto'}} />
        <div style={{...LEXEND, fontWeight: 300, color: C.ivory, fontSize: 46, opacity: b,
          transform: `translateY(${(1 - b) * 20}px)`}}>{card.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// Subtítulo: palabras que entran una a una; las clave van grandes en The Seasons itálica con pop
const Caption = ({c, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const band = !!c.band;  // pantalla dividida: franja moss en la unión, texto ivory
  const light = band || c.dark;
  const ink = light ? C.ivory : C.moss;
  const sub = light ? C.ivory : C.brown;
  const glow = band ? 'none' : c.dark ? SHADE : HALO;
  const enIn = interpolate(frame, [2, 9], [0, 1], clamp);
  const bandIn = spring({frame, fps, config: {damping: 20, stiffness: 160}});
  return (
    <div style={{position: 'absolute', left: band ? 0 : 90, right: band ? 0 : 90, top: c.y, transform: 'translateY(-50%)',
      opacity: out, textAlign: 'center', padding: band ? '26px 80px 30px' : 0,
      background: band ? `rgba(70,71,4,${0.94 * bandIn})` : 'none', textShadow: glow}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', columnGap: 16, rowGap: 0}}>
        {c.words.map((w, i) => {
          const fr = f(w.t) - f(c.start);
          const p = spring({frame: frame - fr, fps, config: w.em ? {damping: 9, stiffness: 200, mass: 0.7} : {damping: 20, stiffness: 220}});
          const vis = frame >= fr;
          const base = w.em
            ? {...SEASONS, fontStyle: 'italic', fontSize: 104, lineHeight: 1.0, color: ink, letterSpacing: '-0.01em'}
            : {...LEXEND, fontWeight: 400, fontSize: 52, lineHeight: 1.15, color: ink};
          const tr = w.em
            ? `translateY(${(1 - p) * 36}px) scale(${interpolate(p, [0, 1], [0.5, 1])}) rotate(${(1 - p) * -6}deg)`
            : `translateY(${(1 - p) * 18}px)`;
          return <span key={i} style={{...base, display: 'inline-block', opacity: vis ? Math.min(1, p * 1.5) : 0,
            transform: tr, whiteSpace: 'nowrap', margin: w.em ? '0 6px' : 0}}>{w.em ? ap(w.text) : w.text}</span>;
        })}
      </div>
      {c.tr && <div style={{...LEXEND, fontWeight: 300, fontSize: 34, lineHeight: 1.25, color: sub, marginTop: 14,
        opacity: enIn * 0.95}}>{c.tr}</div>}
    </div>
  );
};

// Textos fijos pedidos: serie arriba y "Better Together" abajo a la derecha (dentro de la zona segura).
// El color sale de la luz medida debajo de cada texto en cada toma (moss sobre claro, ivory sobre oscuro).
const Overlays = ({clip, fadeIn}) => {
  const frame = useCurrentFrame();
  const a = fadeIn ? interpolate(frame, [0, 10], [0, 1], clamp) : 1;
  const top = clip.ovTop === 'dark' ? C.ivory : C.moss;
  const sh = (col) => (col === C.ivory ? SHADE : HALO);
  return (
    <AbsoluteFill style={{opacity: a}}>
      <div style={{position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', ...LEXEND, fontWeight: 400,
        fontSize: 30, letterSpacing: '0.04em', color: top, textShadow: sh(top)}}>A Mariett's Flavors Podcast Series</div>
      <div style={{position: 'absolute', top: 1410, right: 72, ...SEASONS, fontStyle: 'italic', fontSize: 50,
        lineHeight: 1, color: C.ivory, background: C.moss, padding: '10px 22px 14px'}}>Better Together</div>
    </AbsoluteFill>
  );
};

const Outro = ({o}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bg = interpolate(frame, [0, 6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const logo = spring({frame: frame - 3, fps, config: {damping: 16, stiffness: 110}});
  const t1 = spring({frame: frame - 12, fps, config: {damping: 16}});
  const t2 = spring({frame: frame - 20, fps, config: {damping: 16}});
  const bob = Math.sin(frame / 5) * 10;
  return (
    <AbsoluteFill style={{backgroundColor: C.moss, opacity: bg, justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column'}}>
      <Img src={staticFile('brand/primary-ivory.png')} style={{width: 760, opacity: logo,
        transform: `translateY(${(1 - logo) * 30}px)`}} />
      <div style={{...SEASONS, fontStyle: 'italic', color: C.ivory, fontSize: 92, marginTop: 110, opacity: t1,
        transform: `translateY(${(1 - t1) * 30}px)`}}>{ap(o.title)}</div>
      <div style={{...LEXEND, fontWeight: 400, color: C.ivory, fontSize: 34, letterSpacing: '0.3em', marginTop: 34,
        opacity: t2}}>{o.sub}</div>
      <svg width="70" height="90" viewBox="0 0 70 90" style={{marginTop: 40, opacity: t2, transform: `translateY(${bob}px)`}}>
        <path d="M35 4 V80 M8 54 L35 82 L62 54" stroke={C.ivory} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{...LEXEND, fontWeight: 400, color: C.sand, fontSize: 30, letterSpacing: '0.12em', marginTop: 36,
        opacity: t2}}>@MARIETTSFLAVORS</div>
    </AbsoluteFill>
  );
};

const Reel = () => {
  const d = data;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontFaces}</style>
      {d.clips.map((c, i) => (
        <Sequence key={i} from={f(c.start)} durationInFrames={f(c.end) - f(c.start)}>
          <Clip clip={c} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={f(d.intro.end)}>
        <IntroTitle dur={f(d.intro.end)} />
      </Sequence>
      {d.clips.filter((c) => c.end > d.overlays.start).map((c, i) => {
        const a = Math.max(c.start, d.overlays.start);
        return (
          <Sequence key={'o' + i} from={f(a)} durationInFrames={f(c.end) - f(a)}>
            <Overlays clip={c} fadeIn={i === 0} />
          </Sequence>
        );
      })}
      {d.captions.map((c, i) => (
        <Sequence key={'c' + i} from={f(c.start)} durationInFrames={Math.max(4, f(c.end) - f(c.start))}>
          <Caption c={c} dur={Math.max(4, f(c.end) - f(c.start))} />
        </Sequence>
      ))}
      {d.card && (
        <Sequence from={f(d.card.start)} durationInFrames={f(d.card.end) - f(d.card.start)}>
          <QuestionCard card={d.card} dur={f(d.card.end) - f(d.card.start)} />
        </Sequence>
      )}
      <Sequence from={f(d.outro.start)}>
        <Outro o={d.outro} />
      </Sequence>
      <Audio src={staticFile('audio.wav')} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={f(data.duration)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
