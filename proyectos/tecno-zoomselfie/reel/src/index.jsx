import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
const f = (s) => Math.round(s * FPS);
// Design System – Tecno
const C = {navy: '#0B2342', azul: '#0F3B6B', verde: '#2CA58D', verdeOsc: '#1E7F6C', blanco: '#FFFFFF', glow: '#5FF2D2'};
const FONT = "'DM Sans', sans-serif";
const fontFaces = [400, 500, 700, 800, 900].map((w) =>
  `@font-face{font-family:'DM Sans';font-weight:${w};src:url(${staticFile(`fonts/dm-sans-latin-${w}-normal.woff2`)}) format('woff2');}`).join('\n');
const clean = (t) => t.replace(/[.,¿?]/g, '');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const sp = (frame, fps, cfg = {}) => spring({frame, fps, config: {damping: 12, stiffness: 180, ...cfg}});

/* ---------------- piezas comunes ---------------- */
const Bg = ({color}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: color, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 58%)'}} />
      <AbsoluteFill style={{opacity: 0.1, top: -60, transform: `translateY(${(frame * 0.6) % 60}px)`,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.9) 1.5px, transparent 1.5px)',
        backgroundSize: '60px 60px'}} />
      {[[150, 420, 220], [950, 1560, 280], [960, 300, 130], [120, 1500, 160]].map(([x, y, r], i) => (
        <div key={i} style={{position: 'absolute', left: x, top: y + Math.sin((frame + i * 20) / 22) * 14, width: r, height: r,
          borderRadius: 999, border: '4px solid rgba(255,255,255,.13)', transform: 'translate(-50%,-50%)'}} />
      ))}
    </AbsoluteFill>
  );
};
const Wipe = ({children}) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, 9], [0, 1500], {...clamp, easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{clipPath: `circle(${r}px at 50% 50%)`}}>{children}</AbsoluteFill>;
};

// Mockup de iPhone dibujado (sin assets de Apple) con la grabación de pantalla adentro
const MW = 442, MH = Math.round(442 * 2.174), MX = 540, MY = 838;
const Mockup = ({m, src, children}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = sp(frame, fps, {damping: 14, stiffness: 120});
  const t0 = m.start;
  return (
    <div style={{position: 'absolute', left: MX, top: MY, width: MW, height: MH,
      transform: `translate(-50%,-50%) translateY(${(1 - p) * 260}px) rotate(${(1 - p) * -6}deg) scale(${0.9 + 0.1 * p})`}}>
      <div style={{position: 'absolute', inset: -12, borderRadius: 86, background: 'linear-gradient(145deg,#9aa3ad,#4b535d 40%,#c9d0d6 70%,#5a626c)',
        boxShadow: '0 40px 90px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.25)'}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: 74, overflow: 'hidden', background: '#000'}}>
        {m.shots.map(([ts, src0, rate], i) => {
          const te = i + 1 < m.shots.length ? m.shots[i + 1][0] : m.end + 0.5;
          return (
            <Sequence key={i} from={f(ts - t0)} durationInFrames={f(te - t0) - f(ts - t0)}>
              <OffthreadVideo src={staticFile(`clips/${src}`)} muted startFrom={f(src0)} playbackRate={rate}
                style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </Sequence>
          );
        })}
        {children}
        <div style={{position: 'absolute', top: 16, left: '50%', width: 130, height: 38, borderRadius: 999, background: '#000', transform: 'translateX(-50%)'}} />
      </div>
    </div>
  );
};

/* ---------------- Escena 1 · Zoom ---------------- */
const Reticle = ({t}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - t, [0, 8, 22], [0, 1, 0], clamp);
  const s = interpolate(frame - t, [0, 10], [1.5, 1], clamp);
  if (p <= 0) return null;
  const L = 60, B = `6px solid ${C.glow}`;
  return (
    <div style={{position: 'absolute', left: '50%', top: '42%', width: 230, height: 230, transform: `translate(-50%,-50%) scale(${s})`, opacity: p,
      filter: `drop-shadow(0 0 10px ${C.glow})`}}>
      {[{top: 0, left: 0, borderTop: B, borderLeft: B}, {top: 0, right: 0, borderTop: B, borderRight: B},
        {bottom: 0, left: 0, borderBottom: B, borderLeft: B}, {bottom: 0, right: 0, borderBottom: B, borderRight: B}].map((st, i) =>
        <div key={i} style={{position: 'absolute', width: L, height: L, borderRadius: 8, ...st}} />)}
    </div>
  );
};
const ZoomScene = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const m = data.mock.zoom; const rel = (t) => f(t - m.start);
  const active = data.zchips.filter((c) => frame >= rel(c.t)).length - 1;
  return (
    <AbsoluteFill>
      <Bg color={C.navy} />
      <Mockup m={m} src="zoom.mp4">
        {data.zchips.map((c, i) => <Reticle key={i} t={rel(c.t)} />)}
      </Mockup>
      {/* chips 1x · 4x · 8x a la derecha del mockup */}
      {data.zchips.map((c, i) => {
        const pin = sp(frame - 6 - i * 4, fps, {damping: 13});
        const on = i === active; const pop = sp(frame - rel(c.t), fps, {damping: 9, stiffness: 240});
        return (
          <div key={i} style={{position: 'absolute', left: 908, top: 620 + i * 210, width: 150, height: 150, borderRadius: 999,
            transform: `translate(-50%,-50%) translateX(${(1 - pin) * 300}px) scale(${on ? 1 + 0.18 * pop : 0.82})`,
            display: 'grid', placeItems: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 56, letterSpacing: -2,
            background: on ? C.glow : 'rgba(255,255,255,.1)', color: on ? C.navy : 'rgba(255,255,255,.75)',
            border: `3px solid ${on ? C.glow : 'rgba(255,255,255,.3)'}`, boxShadow: on ? `0 0 46px ${C.glow}` : 'none'}}>{c.label}</div>
        );
      })}
      {/* lupa a la izquierda */}
      <div style={{position: 'absolute', left: 172, top: 840, transform: `translate(-50%,-50%) scale(${0.9 + 0.1 * Math.sin(frame / 8)})`, opacity: sp(frame - 8, fps)}}>
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /><path d="M10.5 7.5v6M7.5 10.5h6" stroke={C.glow} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 2 · Selfie Center Stage ---------------- */
const Person = ({x, p}) => (
  <div style={{position: 'absolute', left: x, top: 0, transform: `translate(-50%,0) scale(${p})`, opacity: Math.min(1, p * 1.5)}}>
    <svg width="74" height="90" viewBox="0 0 24 28" fill="#fff"><circle cx="12" cy="7" r="5.2" /><path d="M2 27c0-6.5 4.5-10.5 10-10.5S22 20.5 22 27z" /></svg>
  </div>
);
const SelfieScene = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const m = data.mock.selfie;
  const tWide = f(12.65 - m.start);
  const more = sp(frame - tWide, fps, {damping: 11});
  const frameW = interpolate(more, [0, 1], [110, 250]);
  return (
    <AbsoluteFill>
      <Bg color={C.verdeOsc} />
      <Mockup m={m} src="selfie.mp4" />
      {/* ícono de encuadre que se abre para que entren más personas */}
      <div style={{position: 'absolute', left: 172, top: 760, width: 270, height: 200, transform: 'translate(-50%,-50%)', opacity: sp(frame - 6, fps)}}>
        <div style={{position: 'absolute', left: '50%', top: '50%', width: frameW, height: 150, transform: 'translate(-50%,-50%)',
          border: `5px solid ${C.glow}`, borderRadius: 26, boxShadow: `0 0 26px ${C.glow}`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 36, height: 100}}>
          <Person x={135} p={1} /><Person x={135 - 70} p={more} /><Person x={135 + 70} p={more} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 172, top: 920, transform: 'translate(-50%,-50%)', fontFamily: FONT, fontWeight: 800, fontSize: 30,
        color: '#fff', letterSpacing: '0.1em', opacity: sp(frame - 10, fps), whiteSpace: 'nowrap'}}>{more > 0.5 ? '+2' : '1'}</div>
      {/* cámara frontal: ícono de rotación a la derecha */}
      <div style={{position: 'absolute', left: 908, top: 840, transform: `translate(-50%,-50%) rotate(${interpolate(sp(frame - 4, fps, {damping: 14}), [0, 1], [-180, 0])}deg)`}}>
        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="3" /><path d="M9 4h6" /><circle cx="12" cy="12.5" r="3" stroke={C.glow} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Pri con gráficos detrás ---------------- */
const PriLayer = ({p, children}) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(`clips/${p.clip}`)} muted startFrom={p.startFrom} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    {children}
    <OffthreadVideo src={staticFile(`clips/${p.cut}`)} muted transparent startFrom={p.startFrom}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);
const IntroGraphics = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const big = sp(frame - 2, fps, {damping: 12, stiffness: 120});
  const chip = (d) => sp(frame - d, fps, {damping: 11});
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(11,35,66,.55) 0%, rgba(11,35,66,.15) 45%, rgba(11,35,66,0) 60%)'}} />
      <div style={{position: 'absolute', left: 835, top: 760, transform: `translate(-50%,-50%) scale(${interpolate(big, [0, 1], [1.6, 1])})`, opacity: big,
        fontFamily: FONT, fontWeight: 900, fontSize: 430, lineHeight: 1, color: 'transparent', WebkitTextStroke: `10px ${C.glow}`,
        filter: `drop-shadow(0 0 30px ${C.glow})`}}>2</div>
      {[['ZOOM 8x', 250, 440, 8], ['SELFIE', 820, 420, 14]].map(([t, x, y, d]) => (
        <div key={t} style={{position: 'absolute', left: x, top: y + Math.sin((frame + d) / 7) * 10, transform: `translate(-50%,-50%) scale(${chip(d)})`,
          padding: '16px 32px', borderRadius: 999, background: C.glow, color: C.navy, fontFamily: FONT, fontWeight: 900, fontSize: 46,
          boxShadow: `0 0 34px ${C.glow}`, whiteSpace: 'nowrap'}}>{t}</div>
      ))}
    </>
  );
};

/* ---------------- Final sin voz: comparativa + CTA tipo encuesta ---------------- */
const MiniMock = ({x, y, w, src, from, rate = 1, emph, label, tLabel}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const h = Math.round(w * 2.174);
  const lab = sp(frame - tLabel, fps, {damping: 10, stiffness: 220});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, zIndex: emph > 0.5 ? 2 : 1,
      transform: `translate(-50%,-50%) scale(${0.92 + 0.14 * emph})`, filter: `brightness(${0.75 + 0.25 * emph})`}}>
      <div style={{position: 'absolute', inset: -10, borderRadius: 64, background: 'linear-gradient(145deg,#9aa3ad,#4b535d 40%,#c9d0d6 70%,#5a626c)',
        boxShadow: `0 30px 70px rgba(0,0,0,.45), 0 0 ${60 * emph}px rgba(95,242,210,${0.6 * emph})`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: 55, overflow: 'hidden', background: '#000'}}>
        <OffthreadVideo src={staticFile(`clips/${src}`)} muted startFrom={f(from)} playbackRate={rate} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <div style={{position: 'absolute', top: 12, left: '50%', width: 96, height: 28, borderRadius: 999, background: '#000', transform: 'translateX(-50%)'}} />
      </div>
      {lab > 0.01 && <div style={{position: 'absolute', left: '50%', top: -34, transform: `translate(-50%,-50%) scale(${lab})`, padding: '12px 28px',
        borderRadius: 999, background: C.glow, color: C.navy, fontFamily: FONT, fontWeight: 900, fontSize: 40, whiteSpace: 'nowrap',
        boxShadow: `0 0 30px ${C.glow}`}}>{label}</div>}
    </div>
  );
};
const CompareScene = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const cp = data.compare; const rel = (t) => f(t - cp.start);
  const pin = sp(frame, fps, {damping: 14, stiffness: 120});
  const toRight = sp(frame - rel(cp.tSelfie), fps, {damping: 14});
  const eL = interpolate(frame, [rel(cp.tPro) - 12, rel(cp.tPro)], [0.5, 1], clamp) * (1 - toRight) + 0.25 * toRight;
  const eR = 0.5 * (1 - toRight) + toRight;
  return (
    <AbsoluteFill>
      <Bg color={C.navy} />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - pin) * 300}px)`, opacity: pin}}>
        <MiniMock x={300} y={850} w={330} src="zoom.mp4" from={16.4} rate={0.6} emph={eL} label="18 PRO · 8x" tLabel={rel(cp.tPro)} />
        <MiniMock x={780} y={850} w={330} src="selfie.mp4" from={2.6} rate={0.45} emph={eR} label="PRO" tLabel={rel(cp.tAir)} />
      </div>
    </AbsoluteFill>
  );
};
const PollIcon = ({k, color}) => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    {k === 0 ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></> : <><rect x="3" y="6" width="18" height="13" rx="3" /><circle cx="12" cy="12.5" r="3" /></>}
  </svg>
);
const PollScene = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const q = sp(frame - 2, fps, {damping: 12});
  const tap = f(1.4), fill = sp(frame - tap, fps, {damping: 16, stiffness: 90});
  const press = interpolate(frame - tap, [-3, 0, 5], [1, 0.94, 1], clamp);
  const cmt = sp(frame - f(2.3), fps, {damping: 12}); const btn = sp(frame - f(2.9), fps, {damping: 9, stiffness: 200});
  const glow = interpolate(frame - f(2.9), [0, 4, 14], [0.2, 1.25, 0.75], clamp);
  const opt = (i, label) => {
    const p = sp(frame - f(0.5 + i * 0.25), fps, {damping: 11});
    const chosen = i === 0; const w = chosen ? fill * 100 : fill * 0;
    return (
      <div key={i} style={{position: 'absolute', left: 540, top: 830 + i * 185, width: 780, height: 150, borderRadius: 999, overflow: 'hidden',
        transform: `translate(-50%,-50%) translateX(${(1 - p) * (i ? 900 : -900)}px) scale(${chosen ? press : 1})`,
        background: 'rgba(255,255,255,.14)', border: `3px solid ${chosen && fill > 0.1 ? C.glow : 'rgba(255,255,255,.35)'}`,
        boxShadow: chosen && fill > 0.1 ? `0 0 34px rgba(95,242,210,.6)` : 'none'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${w}%`, background: `linear-gradient(90deg, ${C.verde}, ${C.glow})`}} />
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 50px'}}>
          <PollIcon k={i} color={chosen && fill > 0.5 ? C.navy : '#fff'} />
          <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 62, letterSpacing: -1, color: chosen && fill > 0.5 ? C.navy : '#fff'}}>{label}</span>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Bg color={C.verdeOsc} />
      <div style={{position: 'absolute', left: 540, top: 540, transform: `translate(-50%,-50%) translateY(${(1 - q) * -60}px) scale(${0.8 + 0.2 * q})`, opacity: q,
        fontFamily: FONT, fontWeight: 900, fontSize: 96, letterSpacing: -3, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 6px 24px rgba(11,35,66,.45)'}}>
        ¿Con cuál te quedás?</div>
      {opt(0, 'ZOOM')}{opt(1, 'SELFIE')}
      <div style={{position: 'absolute', left: 540, top: 1235, transform: `translate(-50%,-50%) translateY(${(1 - cmt) * 40}px)`, opacity: cmt,
        fontFamily: FONT, fontWeight: 700, fontSize: 52, color: '#fff', whiteSpace: 'nowrap'}}>Contanos en comentarios</div>
      <div style={{position: 'absolute', left: 540, top: 1405, transform: `translate(-50%,-50%) scale(${btn})`, opacity: Math.min(1, btn * 2),
        padding: '26px 56px', borderRadius: 999, background: C.navy, border: `3px solid ${C.glow}`, whiteSpace: 'nowrap',
        boxShadow: `0 0 ${50 * glow}px rgba(95,242,210,${0.8 * glow})`, fontFamily: FONT, fontWeight: 900, fontSize: 60, letterSpacing: -1, color: '#fff',
        textShadow: `0 0 ${16 * glow}px rgba(95,242,210,${0.9 * glow})`}}>Consultanos por el 18 Pro</div>
    </AbsoluteFill>
  );
};

/* ---------------- Subtítulos dinámicos ---------------- */
const fitSize = (text, base, perChar) => Math.min(base, Math.floor(900 / (text.length * perChar)));
const Word = ({w, dur}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const text = clean(w.text); const vo = w.kind === 'vo';
  const p = sp(frame, fps, w.key ? {damping: 9, stiffness: 210, mass: 0.7} : {damping: 13, stiffness: 260, mass: 0.5});
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const D = 140;
  const off = w.key ? [0, 60] : {left: [-D, 0], right: [D, 0], up: [0, -D * 0.7], down: [0, D * 0.7], zoom: [0, 0]}[w.entry];
  const sIn = w.key || w.entry === 'zoom' ? interpolate(p, [0, 1], [0.4, 1]) : interpolate(p, [0, 1], [0.7, 1]);
  const floatY = Math.sin((frame + w.start * 30) / 6) * (w.key ? 4 : 7); const floatX = w.key ? 0 : Math.cos((frame + w.start * 17) / 9) * 5;
  const size = w.key ? fitSize(text, 150, 0.6) : fitSize(text, vo ? 96 : 94, 0.56);
  const half = (text.length * size * (w.key ? 0.6 : 0.56)) / 2;
  const x = Math.max(70 + half, Math.min(1010 - half, w.x));
  const base = {fontFamily: FONT, fontWeight: w.key ? 900 : 800, fontSize: size, letterSpacing: w.key ? -3 : -1.5, whiteSpace: 'nowrap', lineHeight: 1};
  const glow = interpolate(frame, [0, 4, 14], [0.2, 1.25, 0.75], {extrapolateRight: 'clamp'});
  const sweep = interpolate(frame, [2, 16], [-60, 160], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const bar = sp(frame - 3, fps, {damping: 14});
  return (
    <div style={{position: 'absolute', left: x, top: w.y, opacity: Math.min(1, p * 2.2) * out,
      transform: `translate(-50%,-50%) translate(${(1 - p) * off[0] + floatX}px, ${(1 - p) * off[1] + floatY}px) scale(${sIn * (1 - (1 - out) * 0.3)})`}}>
      {w.key ? (
        <>
          <div style={{...base, color: C.blanco, position: 'relative',
            textShadow: `0 0 ${10 * glow}px rgba(95,242,210,${0.95 * glow}), 0 0 ${34 * glow}px rgba(44,165,141,${0.9 * glow}),
              0 0 ${80 * glow}px rgba(44,165,141,${0.55 * glow}), 0 6px 18px rgba(11,35,66,.55)`}}>
            {text}
            <div style={{...base, position: 'absolute', inset: 0, color: 'transparent',
              backgroundImage: `linear-gradient(105deg, transparent ${sweep - 22}%, rgba(255,255,255,0) ${sweep - 12}%, ${C.glow} ${sweep}%, rgba(255,255,255,0) ${sweep + 12}%, transparent ${sweep + 22}%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>{text}</div>
          </div>
          <div style={{margin: '12px auto 0', height: 10, borderRadius: 999, width: `${bar * 46}%`,
            background: `linear-gradient(90deg, ${C.verde}, ${C.glow})`, boxShadow: `0 0 18px ${C.verde}`}} />
        </>
      ) : (
        <div style={{...base, color: C.blanco, textShadow: '0 3px 8px rgba(11,35,66,.55), 0 8px 28px rgba(11,35,66,.45)'}}>{text}</div>
      )}
    </div>
  );
};

const Hook = ({h}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const dur = f(h.end); const p = sp(frame, fps, {damping: 13, stiffness: 170});
  const out = interpolate(frame, [dur - 5, dur], [1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 540, top: 272, opacity: p * out, transform: `translate(-50%,-50%) translateY(${(1 - p) * -30}px)`,
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 30px', borderRadius: 999, background: 'rgba(11,35,66,.86)',
      border: `2px solid ${C.verde}`, boxShadow: '0 0 28px rgba(44,165,141,.55)', fontFamily: FONT, whiteSpace: 'nowrap'}}>
      <div style={{width: 16, height: 16, borderRadius: 999, background: C.glow, opacity: 0.6 + 0.4 * Math.sin(frame / 3), boxShadow: `0 0 14px ${C.glow}`}} />
      <span style={{fontWeight: 800, fontSize: 32, letterSpacing: '0.16em', color: C.glow}}>{h.tag}</span>
      <span style={{fontWeight: 500, fontSize: 32, color: C.blanco}}>· {h.text}</span>
    </div>
  );
};

const Outro = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const bg = interpolate(frame, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const iso = sp(frame - 3, fps, {damping: 11, stiffness: 150}); const logo = sp(frame - 8, fps, {damping: 14, stiffness: 140});
  const handle = sp(frame - 16, fps, {damping: 15});
  const ring = interpolate(frame, [0, 40], [0.6, 1.25], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: bg}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, #123a63 0%, ${C.navy} 62%)`}} />
      <div style={{position: 'absolute', left: 540, top: 830, width: 760, height: 760, borderRadius: 999,
        border: `3px solid rgba(44,165,141,${0.5 * (1.25 - ring) / 0.65 + 0.12})`, transform: `translate(-50%,-50%) scale(${ring})`}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 54, paddingBottom: 120}}>
        <Img src={staticFile('brand/isotipo-blanco.png')} style={{width: 190, transform: `scale(${iso})`, filter: 'drop-shadow(0 0 24px rgba(44,165,141,.6))'}} />
        <Img src={staticFile('brand/logotipo-blanco.png')} style={{width: 600, opacity: logo, transform: `translateY(${(1 - logo) * 30}px)`}} />
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 50, letterSpacing: '0.06em', color: C.blanco, opacity: handle,
          transform: `translateY(${(1 - handle) * 24}px)`, padding: '14px 36px', borderRadius: 999,
          background: 'rgba(44,165,141,.18)', border: `2px solid ${C.verde}`}}>@tecnomorenooficial</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- Composición ---------------- */
const Reel = () => {
  const [s0] = data.segs; const mz = data.mock.zoom, ms = data.mock.selfie, cp = data.compare, pl = data.poll;
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      <style>{fontFaces}</style>
      <Sequence from={0} durationInFrames={f(mz.start)}>
        <PriLayer p={data.pri0}><IntroGraphics /></PriLayer>
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(11,35,66,0) 55%, rgba(11,35,66,.4) 80%, rgba(11,35,66,.5) 100%)'}} />
      </Sequence>
      <Sequence from={f(mz.start)} durationInFrames={f(ms.start) - f(mz.start)}><Wipe><ZoomScene /></Wipe></Sequence>
      <Sequence from={f(ms.start)} durationInFrames={f(cp.start) - f(ms.start)}><Wipe><SelfieScene /></Wipe></Sequence>
      <Sequence from={f(cp.start)} durationInFrames={f(pl.start) - f(cp.start)}><Wipe><CompareScene /></Wipe></Sequence>
      <Sequence from={f(pl.start)} durationInFrames={f(data.outroAt) - f(pl.start) + 8}><Wipe><PollScene /></Wipe></Sequence>
      <Sequence from={0} durationInFrames={f(data.hook.end)}><Hook h={data.hook} /></Sequence>
      {data.words.map((w, i) => {
        const from = f(w.start); const dur = Math.max(4, f(w.end) - from);
        return <Sequence key={'w' + i} from={from} durationInFrames={dur}><Word w={w} dur={dur} /></Sequence>;
      })}
      <Sequence from={f(data.outroAt)}><Outro /></Sequence>
      <Audio src={staticFile('voz.wav')} />
      {data.sfx.map((e, i) => (
        <Sequence key={'s' + i} from={Math.max(0, f(e.t))} durationInFrames={30}>
          <Audio src={staticFile(`sfx/${e.f}.wav`)} volume={e.v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const Root = () => <Composition id="Reel" component={Reel} durationInFrames={f(data.duration)} fps={FPS} width={1080} height={1920} />;
registerRoot(Root);
