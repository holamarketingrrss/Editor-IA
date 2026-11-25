import React from 'react';
import {
  AbsoluteFill, Composition, Easing, interpolate, registerRoot,
  staticFile, useCurrentFrame, continueRender, delayRender,
} from 'remotion';

const BG = '#500f20';
const CREAM = '#fff4e0';
const W = 1440, H = 2560, K = W / 1080; // se diseña en 1080x1920 y se escala
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const FONT = 'HelvLight';

// ---- fuentes (Inter como reemplazo de Helvetica Light) ----
const fontHandle = typeof window !== 'undefined' ? delayRender('fonts') : null;
if (typeof window !== 'undefined') {
  const faces = [
    ['Inter-ExtraLight.otf', '200', 'normal'],
    ['Inter-Light.otf', '300', 'normal'],
    ['Inter-LightItalic.otf', '300', 'italic'],
    ['Inter-Regular.otf', '400', 'normal'],
  ].map(([f, w, s]) => new FontFace(FONT, `url(${staticFile(f)})`, {weight: w, style: s}));
  Promise.all(faces.map((f) => f.load())).then((fs) => {
    fs.forEach((f) => document.fonts.add(f));
    continueRender(fontHandle);
  });
}

const ease = (f, a, b, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// aparición suave: opacidad + sube un poco + desenfoque que se aclara
const reveal = (f, cue, len = 16, rise = 18) => {
  const p = ease(f, cue, cue + len);
  return {opacity: p, transform: `translateY(${(1 - p) * rise}px)`, filter: `blur(${(1 - p) * 6}px)`};
};

const Stage = ({children}) => (
  <AbsoluteFill style={{backgroundColor: BG}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920,
      transform: `scale(${K})`, transformOrigin: '0 0', color: CREAM, fontFamily: FONT, fontWeight: 300}}>
      {children}
    </div>
  </AbsoluteFill>
);

// palabra resaltada: más peso + subrayado fino que se dibuja
const Hi = ({f, cue, children, size, under = true, w = 400}) => (
  <span style={{position: 'relative', display: 'inline-block', fontWeight: w, fontSize: size}}>
    {children}
    {under && (
      <span style={{position: 'absolute', left: 0, right: 0, bottom: '-0.12em', height: 2,
        background: CREAM, transformOrigin: '0 50%', transform: `scaleX(${ease(f, cue + 8, cue + 30)})`,
        opacity: 0.85}} />
    )}
  </span>
);

const Eyebrow = ({f, cue = 0, children, y}) => (
  <div style={{position: 'absolute', top: y, width: 1080, textAlign: 'center', fontSize: 28,
    letterSpacing: '0.42em', fontWeight: 200, textTransform: 'uppercase', paddingLeft: '0.42em',
    ...reveal(f, cue, 20, 10)}}>{children}</div>
);

// ================= LÍNEA DE TIEMPO =================
const Timeline = ({label, nums, cues, stage, stageCue, prev}) => {
  const f = useCurrentFrame();
  const x0 = 170, x1 = 910, y = 930;
  const n = nums.length;
  const xs = nums.map((_, i) => (n === 1 ? 540 : x0 + 60 + (i * (x1 - x0 - 120)) / (n - 1)));
  const draw = ease(f, 0, 22);
  // punto que viaja: sigue los cues
  const dotX = interpolate(f, cues, xs, {easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dotO = ease(f, cues[0] - 4, cues[0] + 6);
  return (
    <Stage>
      <Eyebrow f={f} y={700}>{label}</Eyebrow>
      {/* línea */}
      <div style={{position: 'absolute', left: x0, top: y, width: x1 - x0, height: 2, background: CREAM,
        opacity: 0.55, transformOrigin: '0 50%', transform: `scaleX(${draw})`}} />
      {/* extremos con fade (sugiere continuidad) */}
      {prev && <div style={{position: 'absolute', left: x0 - 70, top: y, width: 60, height: 2,
        background: `linear-gradient(90deg, transparent, ${CREAM})`, opacity: 0.35 * draw}} />}
      <div style={{position: 'absolute', left: x1 + 10, top: y, width: 60, height: 2,
        background: `linear-gradient(90deg, ${CREAM}, transparent)`, opacity: 0.35 * ease(f, 14, 26)}} />
      {xs.map((x, i) => {
        const appear = ease(f, (x - x0) / (x1 - x0) * 18, (x - x0) / (x1 - x0) * 18 + 10);
        const lit = ease(f, cues[i] - 2, cues[i] + 10);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x - 9, top: y - 8, width: 18, height: 18, borderRadius: 9,
              border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', background: BG, opacity: appear}} />
            <div style={{position: 'absolute', left: x - 100, width: 200, top: y + 46, textAlign: 'center',
              fontSize: 84, fontWeight: 200, lineHeight: 1,
              opacity: appear * (0.28 + 0.72 * lit),
              transform: `translateY(${(1 - lit) * 10}px)`}}>{nums[i]}</div>
          </React.Fragment>
        );
      })}
      {/* punto que avanza */}
      <div style={{position: 'absolute', left: dotX - 7, top: y - 6, width: 14, height: 14, borderRadius: 7,
        background: CREAM, opacity: dotO, boxShadow: `0 0 18px rgba(255,244,224,0.45)`}} />
      {/* tramo recorrido más marcado */}
      <div style={{position: 'absolute', left: xs[0], top: y - 0.5, height: 3, width: Math.max(0, dotX - xs[0]),
        background: CREAM, opacity: dotO}} />
      {/* etapa */}
      <div style={{position: 'absolute', top: 1150, width: 1080, textAlign: 'center', fontSize: 58,
        lineHeight: 1.25, ...reveal(f, stageCue, 18, 16)}}>
        <span style={{fontStyle: 'italic', fontWeight: 300, opacity: 0.8}}>the </span>
        <Hi f={f} cue={stageCue + 4}>{stage}</Hi>
        <span style={{fontStyle: 'italic', fontWeight: 300, opacity: 0.8}}> stage</span>
      </div>
    </Stage>
  );
};

// ================= RECORDATORIOS (sol y cuidados) =================
const Sun = ({f, cue}) => {
  const c = ease(f, cue, cue + 34);
  const r = 46, L = 2 * Math.PI * r;
  return (
    <svg width={260} height={260} viewBox="0 0 260 260" style={{position: 'absolute', left: 410, top: 520,
      opacity: ease(f, cue, cue + 8), transform: `rotate(${f * 0.12}deg)`}}>
      <circle cx={130} cy={130} r={r} fill="none" stroke={CREAM} strokeWidth={2}
        strokeDasharray={L} strokeDashoffset={L * (1 - c)} strokeLinecap="round" transform="rotate(-90 130 130)" />
      {Array.from({length: 12}).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const p = ease(f, cue + 10 + i * 1.5, cue + 26 + i * 1.5);
        const r1 = 70, r2 = 70 + 26 * p;
        return <line key={i} x1={130 + Math.cos(a) * r1} y1={130 + Math.sin(a) * r1}
          x2={130 + Math.cos(a) * r2} y2={130 + Math.sin(a) * r2}
          stroke={CREAM} strokeWidth={2} strokeLinecap="round" opacity={p} />;
      })}
    </svg>
  );
};

const Drop = ({f, cue}) => {
  const c = ease(f, cue, cue + 30);
  const d = 'M130 40 C 130 40, 70 120, 70 160 A 60 60 0 0 0 190 160 C 190 120, 130 40, 130 40 Z';
  return (
    <svg width={260} height={260} viewBox="0 0 260 260" style={{position: 'absolute', left: 410, top: 520,
      opacity: ease(f, cue, cue + 8)}}>
      <path d={d} fill="none" stroke={CREAM} strokeWidth={2} pathLength={1}
        strokeDasharray={1} strokeDashoffset={1 - c} strokeLinejoin="round" />
      <line x1={60} y1={220} x2={200} y2={40} stroke={CREAM} strokeWidth={2} strokeLinecap="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(f, cue + 18, cue + 36)} />
    </svg>
  );
};

const Waves = ({f, cue}) => (
  <svg width={300} height={200} viewBox="0 0 300 200" style={{position: 'absolute', left: 390, top: 560}}>
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M20 ${60 + i * 40} q 32.5 -22 65 0 t 65 0 t 65 0 t 65 0`} fill="none"
        stroke={CREAM} strokeWidth={2} strokeLinecap="round" pathLength={1} strokeDasharray={1}
        strokeDashoffset={1 - ease(f, cue + i * 4, cue + 26 + i * 4)}
        opacity={0.5 + 0.25 * i} transform={`translate(${Math.sin((f + i * 10) / 14) * 6} 0)`} />
    ))}
  </svg>
);

// escena con entrada/salida suave
const Scene = ({f, from, to, children}) => {
  if (f < from - 1 || f > to + 1) return null;
  const out = to >= 9999 ? 1 : 1 - ease(f, to - 10, to);
  const p = out;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: p,
      filter: `blur(${(1 - p) * 8}px)`, transform: `translateY(${(1 - p) * -14}px)`}}>{children}</div>
  );
};

const Center = ({top, children, style}) => (
  <div style={{position: 'absolute', top, width: 1080, textAlign: 'center', ...style}}>{children}</div>
);

const Small = ({f, cue, children, top, size = 50, italic = true, o = 0.82}) => (
  <Center top={top} style={{fontSize: size, fontStyle: italic ? 'italic' : 'normal', fontWeight: 300,
    ...reveal(f, cue)}}><span style={{opacity: o}}>{children}</span></Center>
);

const Big = ({f, cue, children, top, size = 112}) => (
  <Center top={top} style={{fontSize: size, lineHeight: 1.05, letterSpacing: '-0.01em', ...reveal(f, cue, 18, 22)}}>
    <Hi f={f} cue={cue} w={300}>{children}</Hi>
  </Center>
);

const Reminders = () => {
  const f = useCurrentFrame();
  const scenes = [[0, 42], [42, 84], [84, 121], [121, 188], [188, 304], [304, 9999]];
  const idx = scenes.findIndex(([a, b]) => f >= a && f < b);
  return (
    <Stage>
      {/* encabezado fijo */}
      <Eyebrow f={f} y={330}>healing reminders</Eyebrow>
      <div style={{position: 'absolute', top: 395, left: 540 - 60, width: 120, height: 1.5, background: CREAM,
        opacity: 0.5, transformOrigin: '50% 50%', transform: `scaleX(${ease(f, 4, 26)})`}} />
      {/* contador discreto */}
      <div style={{position: 'absolute', top: 1500, width: 1080, textAlign: 'center', fontSize: 26,
        letterSpacing: '0.3em', fontWeight: 200, opacity: 0.6 * ease(f, 6, 24)}}>
        {scenes.map((_, i) => (
          <span key={i} style={{display: 'inline-block', width: 26, height: 2, margin: '0 7px', verticalAlign: 'middle',
            background: CREAM, opacity: i === idx ? 1 : 0.3, transition: 'none'}} />
        ))}
      </div>

      <Scene f={f} from={0} to={42}>
        <Sun f={f} cue={0} />
        <Small f={f} cue={3} top={860}>avoid</Small>
        <Big f={f} cue={9} top={940}>direct sun</Big>
        <Small f={f} cue={22} top={1090} italic={false} size={46} o={0.7}>exposure</Small>
      </Scene>

      <Scene f={f} from={42} to={84}>
        <Drop f={f} cue={42} />
        <Small f={f} cue={44} top={860}>don’t</Small>
        <Big f={f} cue={52} top={940} size={100}>over-moisturize</Big>
      </Scene>

      <Scene f={f} from={84} to={121}>
        <Waves f={f} cue={84} />
        <Small f={f} cue={85} top={860}>be mindful of</Small>
        <Big f={f} cue={100} top={940}>friction</Big>
      </Scene>

      <Scene f={f} from={121} to={188}>
        <Small f={f} cue={123} top={700}>if your tattoo is near your</Small>
        <Big f={f} cue={162} top={830}>wrist</Big>
        <Small f={f} cue={168} top={975} size={46} o={0.6}>or</Small>
        <Big f={f} cue={171} top={1060}>forearm</Big>
      </Scene>

      <Scene f={f} from={188} to={304}>
        <Small f={f} cue={188} top={600}>avoid wearing</Small>
        {[['bracelets', 205], ['watches', 221], ['jewelry', 244]].map(([w, c], i) => (
          <React.Fragment key={w}>
            <Big f={f} cue={c} top={720 + i * 170} size={96}>{w}</Big>
          </React.Fragment>
        ))}
        <Small f={f} cue={254} top={1250} size={40} o={0.65}>that may rub against healing skin</Small>
      </Scene>

      <Scene f={f} from={304} to={9999}>
        <Small f={f} cue={306} top={640}>repeated</Small>
        <Big f={f} cue={320} top={720}>friction</Big>
        {/* flecha fina que baja */}
        <svg width={40} height={170} viewBox="0 0 40 170" style={{position: 'absolute', left: 520, top: 890}}>
          <line x1={20} y1={0} x2={20} y2={160} stroke={CREAM} strokeWidth={2} strokeLinecap="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(f, 332, 352)} />
          <polyline points="8,146 20,160 32,146" fill="none" stroke={CREAM} strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" opacity={ease(f, 348, 356)} />
        </svg>
        <Big f={f} cue={346} top={1080}>irritation</Big>
        <Small f={f} cue={363} top={1230} size={42} o={0.65}>& slower healing</Small>
      </Scene>
    </Stage>
  );
};

const segs = [
  {id: 'T1', dur: 60, el: () => <Timeline label="Days" nums={[1, 2, 3]} cues={[7, 14, 20]} stage="fresh tattoo" stageCue={30} />},
  {id: 'T2', dur: 65, el: () => <Timeline label="Days" nums={[4, 5, 6, 7]} cues={[6, 12, 18, 23]} stage="peeling" stageCue={33} prev />},
  {id: 'T3', dur: 50, el: () => <Timeline label="Weeks" nums={[2, 3]} cues={[7, 15]} stage="settling" stageCue={23} prev />},
  {id: 'SOL', dur: 405, el: () => <Reminders />},
];

const Root = () => (
  <>
    {segs.map((s) => (
      <Composition key={s.id} id={s.id} component={s.el} durationInFrames={s.dur} fps={30} width={W} height={H} />
    ))}
  </>
);

registerRoot(Root);
