import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, Img,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';
import data from './data.json';

const FPS = 30;
const f = (s) => Math.round(s * FPS);
// Design System – Tecno
const C = {navy: '#0B2342', azul: '#0F3B6B', verde: '#2CA58D', verdeOsc: '#1E7F6C', salvia: '#84BC9C', blanco: '#FFFFFF', glow: '#5FF2D2'};
const FONT = "'DM Sans', sans-serif";
const fontFaces = [400, 500, 700, 800, 900].map((w) =>
  `@font-face{font-family:'DM Sans';font-weight:${w};src:url(${staticFile(`fonts/dm-sans-latin-${w}-normal.woff2`)}) format('woff2');}`).join('\n');
const clean = (t) => t.replace(/[.,¿?]/g, '');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const sp = (frame, fps, cfg = {}) => spring({frame, fps, config: {damping: 12, stiffness: 180, ...cfg}});

// tiempo (s) de una palabra dentro de un segmento, relativo al inicio del segmento
const wordAt = (seg, text) => {
  const s = data.segs.find((x) => x.i === seg);
  const w = data.words.find((x) => x.seg === seg && clean(x.text).toLowerCase().startsWith(text.toLowerCase()));
  return w ? w.start - s.start : 0;
};

/* ---------------- Pri a cámara ---------------- */
const PriClip = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = f(s.end) - f(s.start);
  const base = s.i === 7 ? 1.26 : 1.16;
  let scale = base + interpolate(frame, [0, dur], [0, 0.04]);
  // entrada con "settle" (viene de más cerca) para que el corte se sienta con energía
  scale += interpolate(sp(frame, fps, {damping: 16}), [0, 1], [0.12, 0]);
  for (const z of data.zooms.filter((z) => z.seg === s.i)) {
    const p = sp(frame - f(z.t - s.start), fps, {damping: 15, stiffness: 140});
    scale += p * (z.to - base);
  }
  const [fx, fy] = s.face;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile(`clips/${s.clip}`)} muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`,
          transformOrigin: `${(fx / 1080) * 100}% ${(fy / 1920) * 100}%`}} />
    </AbsoluteFill>
  );
};

/* ---------------- Fondos y piezas gráficas ---------------- */
const Bg = ({color, grid = true}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: color, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 42%, rgba(255,255,255,.13) 0%, rgba(255,255,255,0) 55%)'}} />
      {grid && <AbsoluteFill style={{opacity: 0.11, transform: `translateY(${(frame * 0.6) % 60}px)`,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.9) 1.5px, transparent 1.5px)',
        backgroundSize: '60px 60px', top: -60}} />}
      {/* anillos del isotipo flotando */}
      {[[170, 300, 210], [930, 1560, 260], [960, 260, 120]].map(([x, y, r], i) => (
        <div key={i} style={{position: 'absolute', left: x, top: y + Math.sin((frame + i * 20) / 22) * 14, width: r, height: r,
          borderRadius: 999, border: '4px solid rgba(255,255,255,.14)', transform: 'translate(-50%,-50%)'}} />
      ))}
    </AbsoluteFill>
  );
};

const Wipe = ({children, color}) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, 9], [0, 1500], {...clamp, easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{clipPath: `circle(${r}px at 50% 50%)`}}>{children}</AbsoluteFill>;
};

const StepChip = ({n, label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = sp(frame - 3, fps, {damping: 13});
  return (
    <div style={{position: 'absolute', left: 540, top: 262, transform: `translate(-50%,-50%) translateY(${(1 - p) * -40}px)`, opacity: p,
      display: 'flex', alignItems: 'center', gap: 16, padding: '14px 30px', borderRadius: 999, background: 'rgba(11,35,66,.55)',
      border: `2px solid ${C.glow}`, fontFamily: FONT, color: C.blanco, whiteSpace: 'nowrap', boxShadow: '0 0 24px rgba(95,242,210,.35)'}}>
      <span style={{fontWeight: 900, fontSize: 34, color: C.glow, letterSpacing: '0.14em'}}>PASO {n}</span>
      <span style={{fontWeight: 600, fontSize: 32, opacity: 0.9}}>· {label}</span>
    </div>
  );
};

const Phone = ({x, y, w = 300, on = 1, children, glow = 0, label}) => {
  const h = w * 2.06;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: 'translate(-50%,-50%)'}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: w * 0.17, background: '#151a22',
        boxShadow: `0 30px 60px rgba(0,0,0,.35), 0 0 ${60 * glow}px rgba(95,242,210,${0.8 * glow})`, border: '3px solid #3a4352'}} />
      <div style={{position: 'absolute', inset: w * 0.04, borderRadius: w * 0.135, overflow: 'hidden', background: '#05070b'}}>
        <div style={{position: 'absolute', inset: 0, opacity: on, background: `linear-gradient(160deg, ${C.azul} 0%, ${C.verde} 120%)`}}>
          {children}
        </div>
        <div style={{position: 'absolute', top: w * 0.035, left: '50%', width: w * 0.3, height: w * 0.085, borderRadius: 999,
          background: '#000', transform: 'translateX(-50%)'}} />
      </div>
      {label && <div style={{position: 'absolute', top: h + 26, left: '50%', transform: 'translateX(-50%)', fontFamily: FONT,
        fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,.85)', letterSpacing: '0.12em', whiteSpace: 'nowrap'}}>{label}</div>}
    </div>
  );
};

const AppGrid = ({w}) => (
  <div style={{position: 'absolute', top: w * 0.32, left: w * 0.1, right: w * 0.1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: w * 0.06}}>
    {Array.from({length: 16}).map((_, i) => (
      <div key={i} style={{aspectRatio: '1', borderRadius: w * 0.05,
        background: ['#5FF2D2', '#84BC9C', '#ffffff', '#2CA58D'][i % 4], opacity: 0.55 + (i % 3) * 0.15}} />
    ))}
  </div>
);

const BtIcon = ({size = 90, color = '#fff'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7l10 10-5 5V2l5 5L7 17" />
  </svg>
);
const WifiIcon = ({size = 90, color = '#fff', level = 3}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="19" r="1.4" fill={color} />
    {level > 0 && <path d="M8.5 15.5a5 5 0 0 1 7 0" />}
    {level > 1 && <path d="M5.5 12.5a9.2 9.2 0 0 1 13 0" />}
    {level > 2 && <path d="M2.5 9.5a13.5 13.5 0 0 1 19 0" />}
  </svg>
);
const Check = ({size = 60, p = 1, color = C.navy}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="22" strokeDashoffset={22 * (1 - p)} />
  </svg>
);

/* ---------------- Escenas de la voz en off ---------------- */
// 1 · Encendé el nuevo y acercalo
const Scene1 = ({s}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const tOn = f(wordAt(1, 'encendé')), tNear = f(wordAt(1, 'acercalo'));
  const on = interpolate(frame, [tOn, tOn + 8], [0, 1], clamp);
  const pIn = sp(frame, fps, {damping: 14});
  const near = sp(frame - tNear, fps, {damping: 14, stiffness: 120});
  const xNew = interpolate(near, [0, 1], [800, 705]); const xOld = interpolate(near, [0, 1], [280, 375]);
  const pulse = (frame - tNear) / 18;
  return (
    <AbsoluteFill>
      <Bg color={C.navy} />
      <StepChip n={1} label="Encendé y acercá" />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - pIn) * 120}px)`, opacity: pIn}}>
        <Phone x={xOld} y={880} w={310} label="ANTERIOR"><AppGrid w={310} /></Phone>
        <Phone x={xNew} y={880} w={310} on={on} glow={on * (0.6 + 0.4 * Math.sin(frame / 5))} label="NUEVO">
          <div style={{position: 'absolute', top: '38%', width: '100%', textAlign: 'center', fontFamily: FONT, fontWeight: 800,
            fontSize: 64, color: '#fff', transform: `scale(${0.7 + 0.3 * on})`}}>Hola</div>
        </Phone>
        {frame > tNear && [0, 1, 2].map((k) => {
          const q = ((pulse + k / 3) % 1);
          return <div key={k} style={{position: 'absolute', left: 540, top: 880, width: 140 + q * 300, height: 140 + q * 300, borderRadius: 999,
            border: `4px solid ${C.glow}`, opacity: (1 - q) * 0.7, transform: 'translate(-50%,-50%)'}} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

// 2 · Bluetooth y Wi-Fi activados
const Toggle = ({y, icon, label, t}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const pIn = sp(frame - (y > 900 ? 5 : 0), fps, {damping: 13});
  const on = sp(frame - t, fps, {damping: 11, stiffness: 220});
  const pop = interpolate(frame - t, [0, 4, 14], [1, 1.12, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 540, top: y, width: 800, height: 210, borderRadius: 40,
      transform: `translate(-50%,-50%) translateX(${(1 - pIn) * (y > 900 ? 900 : -900)}px) scale(${pop})`,
      background: 'rgba(11,35,66,.42)', border: '2px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', padding: '0 50px', gap: 36}}>
      <div style={{width: 120, height: 120, borderRadius: 999, display: 'grid', placeItems: 'center',
        background: on > 0.5 ? C.glow : 'rgba(255,255,255,.15)', boxShadow: on > 0.5 ? `0 0 40px ${C.glow}` : 'none'}}>{icon(on > 0.5 ? C.navy : '#fff')}</div>
      <div style={{flex: 1, fontFamily: FONT, fontWeight: 800, fontSize: 58, color: '#fff'}}>{label}</div>
      <div style={{width: 150, height: 84, borderRadius: 999, background: on > 0.5 ? C.glow : 'rgba(255,255,255,.25)', position: 'relative'}}>
        <div style={{position: 'absolute', top: 8, left: 8 + on * 66, width: 68, height: 68, borderRadius: 999, background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)'}} />
      </div>
    </div>
  );
};
const Scene2 = () => (
  <AbsoluteFill>
    <Bg color={C.verdeOsc} />
    <StepChip n={2} label="Conexiones" />
    <Toggle y={760} label="Bluetooth" t={f(wordAt(2, 'bluetooth'))} icon={(c) => <BtIcon size={74} color={c} />} />
    <Toggle y={1010} label="Wi-Fi" t={f(wordAt(2, 'wi-fi'))} icon={(c) => <WifiIcon size={78} color={c} />} />
  </AbsoluteFill>
);

// 3 · En el anterior aparece la opción para configurar el nuevo
const Scene3 = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const tSheet = f(wordAt(3, 'aparece')), tTap = f(wordAt(3, 'configurar'));
  const pIn = sp(frame, fps, {damping: 14});
  const sheet = sp(frame - tSheet, fps, {damping: 15, stiffness: 150});
  const tap = interpolate(frame - tTap, [0, 5, 12], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Bg color={C.azul} />
      <StepChip n={3} label="Configurar" />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${0.85 + 0.15 * pIn})`, opacity: pIn}}>
        <Phone x={540} y={880} w={380} label="ANTERIOR">
          <AppGrid w={380} />
          <div style={{position: 'absolute', left: 14, right: 14, bottom: 14, height: '52%', borderRadius: 40, background: '#f4f7f9',
            transform: `translateY(${(1 - sheet) * 110}%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 34, gap: 16}}>
            <div style={{width: 92, height: 150, borderRadius: 20, border: `5px solid ${C.navy}`, position: 'relative'}}>
              <div style={{position: 'absolute', inset: 10, borderRadius: 10, background: `linear-gradient(160deg, ${C.azul}, ${C.verde})`}} />
            </div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 27, color: C.navy, textAlign: 'center', lineHeight: 1.15}}>Configurar<br />nuevo iPhone</div>
            <div style={{marginTop: 6, padding: '12px 46px', borderRadius: 999, background: C.verde, fontFamily: FONT, fontWeight: 800, fontSize: 24,
              color: C.navy, transform: `scale(${1 - tap * 0.1})`, boxShadow: `0 0 ${30 * tap}px ${C.glow}`}}>Continuar</div>
          </div>
        </Phone>
        {frame >= tTap - 6 && <div style={{position: 'absolute', left: 560, top: 1160 + interpolate(frame - tTap, [-6, 0], [80, 0], clamp),
          width: 90, height: 90, borderRadius: 999, background: 'rgba(255,255,255,.45)', border: '4px solid #fff',
          transform: `translate(-50%,-50%) scale(${1 - tap * 0.25})`}} />}
      </div>
    </AbsoluteFill>
  );
};

// 4 · Seguí las instrucciones en pantalla
const Scene4 = ({s}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const dur = f(s.end) - f(s.start);
  const items = ['Acercá los equipos', 'Escaneá la animación', 'Ingresá el código'];
  return (
    <AbsoluteFill>
      <Bg color={C.navy} />
      <StepChip n={4} label="Instrucciones" />
      {items.map((t, i) => {
        const st = 4 + i * Math.round((dur - 12) / 3);
        const p = sp(frame - st, fps, {damping: 13});
        const ck = interpolate(frame - st - 6, [0, 8], [0, 1], clamp);
        return (
          <div key={i} style={{position: 'absolute', left: 540, top: 690 + i * 190, width: 820, height: 150, borderRadius: 34,
            transform: `translate(-50%,-50%) translateX(${(1 - p) * (i % 2 ? 900 : -900)}px)`, background: 'rgba(255,255,255,.08)',
            border: `2px solid ${ck > 0.9 ? C.glow : 'rgba(255,255,255,.22)'}`, display: 'flex', alignItems: 'center', gap: 34, padding: '0 40px'}}>
            <div style={{width: 84, height: 84, borderRadius: 999, background: ck > 0 ? C.glow : 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center',
              boxShadow: ck > 0.9 ? `0 0 26px ${C.glow}` : 'none'}}><Check size={56} p={ck} /></div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 46, color: '#fff'}}>{t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 5 · Transferí tus datos, equipos cerca y con batería hasta terminar
const Battery = ({x, y, p}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center'}}>
    <div style={{width: 120, height: 60, borderRadius: 14, border: '5px solid #fff', padding: 5}}>
      <div style={{width: `${p * 100}%`, height: '100%', borderRadius: 6, background: C.glow, boxShadow: `0 0 16px ${C.glow}`}} />
    </div>
    <div style={{width: 10, height: 24, borderRadius: 4, background: '#fff', marginLeft: 4}} />
  </div>
);
const DataIcon = ({k}) => (
  <div style={{width: 74, height: 74, borderRadius: 20, background: '#fff', display: 'grid', placeItems: 'center', boxShadow: `0 0 22px ${C.glow}`}}>
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {k === 0 && <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>}
      {k === 1 && <><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></>}
      {k === 2 && <path d="M4 5h16v11H9l-5 4z" />}
    </svg>
  </div>
);
const Scene5 = ({s}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const dur = f(s.end) - f(s.start);
  const tData = f(wordAt(5, 'transferir')), tNear = f(wordAt(5, 'cerca')), tBat = f(wordAt(5, 'batería')), tEnd = f(wordAt(5, 'terminar'));
  const pIn = sp(frame, fps, {damping: 14});
  const near = sp(frame - tNear, fps, {damping: 14, stiffness: 120});
  const gap = interpolate(near, [0, 1], [215, 150]);
  const prog = interpolate(frame, [tData, tEnd + 10], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const bat = interpolate(frame, [tBat, tBat + 16], [0.35, 1], clamp);
  const done = sp(frame - tEnd - 8, fps, {damping: 10});
  return (
    <AbsoluteFill>
      <Bg color={C.verdeOsc} />
      <StepChip n={5} label="Transferencia" />
      <div style={{position: 'absolute', inset: 0, opacity: pIn, transform: `translateY(${(1 - pIn) * 100}px)`}}>
        <Phone x={540 - gap} y={840} w={270} label="ANTERIOR"><AppGrid w={270} /></Phone>
        <Phone x={540 + gap} y={840} w={270} label="NUEVO" glow={done}>
          <div style={{position: 'absolute', top: '44%', left: '12%', right: '12%', height: 14, borderRadius: 999, background: 'rgba(255,255,255,.25)'}}>
            <div style={{width: `${prog * 100}%`, height: '100%', borderRadius: 999, background: '#fff'}} />
          </div>
          <div style={{position: 'absolute', top: '52%', width: '100%', textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 34, color: '#fff'}}>
            {Math.round(prog * 100)}%</div>
        </Phone>
        {frame > tData && frame < tEnd + 6 && Array.from({length: 7}).map((_, k) => {
          const q = ((frame - tData) / 22 + k / 7) % 1;
          return <div key={k} style={{position: 'absolute', left: 540 - gap + 60 + q * (2 * gap - 120), top: 770 + Math.sin(q * Math.PI) * -170,
            opacity: Math.sin(q * Math.PI), transform: 'translate(-50%,-50%)'}}><DataIcon k={k % 3} /></div>;
        })}
        {frame > tBat - 4 && <><Battery x={540 - gap} y={1250} p={bat} /><Battery x={540 + gap} y={1250} p={bat} /></>}
        {done > 0.01 && <div style={{position: 'absolute', left: 540 + gap, top: 840, width: 150, height: 150, borderRadius: 999, background: C.glow,
          display: 'grid', placeItems: 'center', transform: `translate(-50%,-50%) scale(${done})`, boxShadow: `0 0 50px ${C.glow}`}}><Check size={100} /></div>}
      </div>
    </AbsoluteFill>
  );
};

const SCENES = {1: Scene1, 2: Scene2, 3: Scene3, 4: Scene4, 5: Scene5};

/* ---------------- Subtítulos dinámicos ---------------- */
const fitSize = (text, base, perChar) => Math.min(base, Math.floor(900 / (text.length * perChar)));
const Word = ({w, dur}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const text = clean(w.text);
  const vo = w.kind === 'vo';
  const p = sp(frame, fps, w.key ? {damping: 9, stiffness: 210, mass: 0.7} : {damping: 13, stiffness: 260, mass: 0.5});
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const D = 140;
  const off = {left: [-D, 0], right: [D, 0], up: [0, -D * 0.7], down: [0, D * 0.7], zoom: [0, 0]}[w.entry];
  const sIn = w.entry === 'zoom' ? interpolate(p, [0, 1], [0.3, 1]) : interpolate(p, [0, 1], [0.7, 1]);
  const floatY = Math.sin((frame + w.start * 30) / 6) * 7; const floatX = Math.cos((frame + w.start * 17) / 9) * 5;
  const size = w.key ? fitSize(text, vo ? 176 : 146, 0.6) : fitSize(text, vo ? 112 : 94, 0.56);
  // centro x limitado para que la palabra no se salga de cuadro
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
          <div style={{margin: '14px auto 0', height: 10, borderRadius: 999, width: `${bar * 46}%`,
            background: `linear-gradient(90deg, ${C.verde}, ${C.glow})`, boxShadow: `0 0 18px ${C.verde}`}} />
        </>
      ) : (
        <div style={{...base, color: C.blanco, textShadow: '0 3px 8px rgba(11,35,66,.55), 0 8px 28px rgba(11,35,66,.45)'}}>{text}</div>
      )}
    </div>
  );
};

/* ---------------- Gancho y cierre ---------------- */
const Hook = ({h}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const dur = f(h.end);
  const p = sp(frame, fps, {damping: 13, stiffness: 170});
  const out = interpolate(frame, [dur - 5, dur], [1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 540, top: 282, opacity: p * out,
      transform: `translate(-50%,-50%) translateY(${(1 - p) * -30}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      display: 'flex', alignItems: 'center', gap: 16, padding: '18px 32px', borderRadius: 999,
      background: 'rgba(11,35,66,.86)', border: `2px solid ${C.verde}`, boxShadow: '0 0 28px rgba(44,165,141,.55)', fontFamily: FONT, whiteSpace: 'nowrap'}}>
      <div style={{width: 16, height: 16, borderRadius: 999, background: C.glow, opacity: 0.6 + 0.4 * Math.sin(frame / 3), boxShadow: `0 0 14px ${C.glow}`}} />
      <span style={{fontWeight: 800, fontSize: 32, letterSpacing: '0.16em', color: C.glow}}>{h.tag}</span>
      <span style={{fontWeight: 500, fontSize: 32, color: C.blanco}}>· {h.text}</span>
    </div>
  );
};

const Outro = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const bg = interpolate(frame, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const iso = sp(frame - 3, fps, {damping: 11, stiffness: 150});
  const logo = sp(frame - 8, fps, {damping: 14, stiffness: 140});
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
  const segs = data.segs;
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      <style>{fontFaces}</style>
      {segs.map((s, k) => {
        const from = f(s.start);
        const next = k + 1 < segs.length ? f(segs[k + 1].start) : f(data.outroAt) + 8;
        const Scene = SCENES[s.i];
        return (
          <Sequence key={k} from={from} durationInFrames={next - from}>
            {s.kind === 'pri' ? <PriClip s={s} /> : <Wipe><Scene s={s} /></Wipe>}
          </Sequence>
        );
      })}
      {/* degradé suave detrás de los subtítulos cuando está Pri */}
      {segs.filter((s) => s.kind === 'pri').map((s, k) => (
        <Sequence key={'g' + k} from={f(s.start)} durationInFrames={f(s.end + 0.06) - f(s.start)}>
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(11,35,66,0) 50%, rgba(11,35,66,.32) 70%, rgba(11,35,66,.45) 100%)'}} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={f(data.hook.end)}><Hook h={data.hook} /></Sequence>
      {data.words.map((w, i) => {
        const from = f(w.start);
        const dur = Math.max(4, f(w.end) - from);
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

const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={f(data.duration)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
