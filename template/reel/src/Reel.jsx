// Composición del reel. Recibe los datos por props para que la use tanto Remotion (index.jsx) como la app del editor.
//   data:  reel/src/data.json del proyecto (tomas, palabras, estilo resuelto)
//   brand: reel/src/brand.json (colores, fuentes, logo, handle)
//   base:  prefijo de los archivos de public/ (la app los sirve en /media/<proyecto>/); vacío = staticFile de Remotion
import React, {useMemo} from 'react';
import {
  AbsoluteFill, Sequence, OffthreadVideo, Audio, Img, Freeze,
  staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion';

export const FPS = 30;
export const duracionEnFrames = (data) => Math.max(1, Math.round(data.duration * FPS));

export const Reel = ({data, brand, base = ''}) => {
  const R = useMemo(() => armar(data, brand, base), [data, brand, base]);
  return <R />;
};

function armar(data, brand, base) {
  const asset = (p) => (base ? base + p : staticFile(p));
  // El estilo viene resuelto en data.estilo (scripts/estilo.py: defaults <- preset de la marca <- proyecto.json).
  // Proyectos viejos sin "estilo": se dibujan como antes.
  const DEF = {
    subtitulos: {modo: 'palabra', posicion: 'dinamica', legibilidad: 'sombra', animacion: 'pop', color: 'blanco'},
    camara: 'pushin', transicion: {tipo: 'corte', dur: 0.3}, entrada: {tipo: 'gancho'}, cierre: {tipo: 'logo'},
    animacionLogo: 'pop', look: 'original', vineta: true, grano: false, audioOriginal: 'mute', sfx: {},
    zocalo: null, logoEsquina: false,
    layout: {ancho: 900, yAbajo: 1440, yMedio: 960},
  };
  const E = {...DEF, ...(data.estilo ?? {})};
  const SUB = {...DEF.subtitulos, ...(E.subtitulos ?? {})};
  const LAY = {...DEF.layout, ...(E.layout ?? {})};

  const C = brand.colores;
  // un color puede ser el nombre de la paleta de la marca ('amarillo') o un hex ('#FFFFFF')
  const col = (v) => C[v] ?? v;
  const ACENTO = col(brand.acentos?.[0] ?? 'texto');
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

  // Tipografías de la marca: brand.fuentes tiene 4 casilleros (G, B, S, K). "archivo" es el woff2 en public/fonts.
  const fontFaces = Object.values(brand.fuentes)
    .filter((f) => f.archivo)
    .map((f) => `@font-face{font-family:'${f.familia}';font-weight:${f.peso ?? 400};src:url(${asset('fonts/' + f.archivo)}) format('woff2');}`)
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
  const NEGRO = SUB.color === 'negro';

  // Legibilidad del texto: sombra sin caja · contorno · caja por palabra · barra (la barra la pone el bloque)
  const legible = (color, size) => {
    const esTexto = color.toLowerCase() === col('texto').toLowerCase();
    switch (SUB.legibilidad) {
      case 'contorno':
        return {WebkitTextStroke: `${Math.max(4, Math.round(size * 0.07))}px ${NEGRO ? '#FFFFFF' : '#000000'}`, paintOrder: 'stroke fill',
          textShadow: '0 4px 12px rgba(0,0,0,.35)'};
      case 'caja':
        return {background: NEGRO ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.78)', padding: '0.06em 0.22em', borderRadius: '0.14em'};
      case 'barra':
        return SUB.modo === 'palabra' ? {background: NEGRO ? 'rgba(255,255,255,.88)' : 'rgba(0,0,0,.62)', padding: '0.06em 0.4em', borderRadius: '0.1em'} : {};
      default:
        return {textShadow: NEGRO ? '0 2px 10px rgba(255,255,255,.5)' : (esTexto ? SHADOW : SHADOW_COLOR)};
    }
  };

  // Entrada de un texto (palabra o bloque) según estilo.subtitulos.animacion
  const entrada = (frame, fps, rot = 0) => {
    switch (SUB.animacion) {
      case 'fade': return {o: interpolate(frame, [0, 5], [0, 1], clamp), s: 1, r: rot, y: 0};
      case 'deslizar': {
        const t = interpolate(frame, [0, 7], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return {o: t, s: 1, r: rot, y: (1 - t) * 70};
      }
      case 'maquina': case 'no': return {o: 1, s: 1, r: rot, y: 0};
      default: {
        const pop = spring({frame, fps, config: {damping: 11, stiffness: 220, mass: 0.6}});
        return {o: Math.min(pop * 1.6, 1), s: interpolate(pop, [0, 1], [0.4, 1]), r: interpolate(pop, [0, 1], [rot * 2.5, rot]), y: interpolate(pop, [0, 1], [40, 0])};
      }
    }
  };

  // Look de color: filtros sobre las tomas (y capas para cine)
  const FILTRO = {
    original: 'none', calido: 'sepia(0.15) saturate(1.2) brightness(1.03) hue-rotate(-6deg)', vibrante: 'saturate(1.4) contrast(1.08)',
    bn: 'grayscale(1) contrast(1.15)', vintage: 'sepia(0.4) saturate(0.8) contrast(0.9) brightness(1.06)', cine: 'contrast(1.1) saturate(1.1)',
  };

  const T_FR = Math.round(Math.min(0.4, E.transicion?.dur ?? 0.3) * FPS);   // las tomas traen 0,4 s de cola: alcanza para solapar
  const SOLAPA = ['fundido', 'zoom', 'deslizar'].includes(E.transicion?.tipo);
  const DESTACADAS = data.words.filter((w) => w.destacado).map((w) => [w.start + data.voiceOffset, Math.min(w.end, w.start + 0.6) + data.voiceOffset]);

  const Clip = ({clip, idx}) => {
    const frame = useCurrentFrame();
    const durationInFrames = Math.round((clip.end - clip.start) * FPS);
    let scale = 1;
    if (E.camara === 'pushin') scale = interpolate(frame, [0, durationInFrames], [1.06, 1.14], {extrapolateRight: 'clamp'});
    if (E.camara === 'punchin') {
      const t = clip.start + frame / FPS;
      scale = DESTACADAS.some(([a, b]) => t >= a && t < b) ? 1.16 : 1.04;
    }
    let opacity = 1, ty = 0;
    if (SOLAPA && idx > 0) {
      const p = interpolate(frame, [0, T_FR], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
      if (E.transicion.tipo === 'fundido') opacity = p;
      if (E.transicion.tipo === 'zoom') { opacity = p; scale *= interpolate(p, [0, 1], [1.3, 1]); }
      if (E.transicion.tipo === 'deslizar') ty = (1 - p) * 100;
    }
    const vol = E.audioOriginal === 'alto' ? 1 : E.audioOriginal === 'bajo' ? 0.15 : 0;
    return (
      <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000', opacity, transform: `translateY(${ty}%)`}}>
        <OffthreadVideo
          src={asset(`clips/${clip.file}`)}
          muted={vol === 0} volume={vol}
          style={{width: '100%', height: '100%', objectFit: 'cover', filter: FILTRO[E.look] ?? 'none',
            objectPosition: clip.pos || '50% 50%', transform: `scale(${scale})`}}
        />
      </AbsoluteFill>
    );
  };

  // Transiciones que tapan el corte: fundido a color y cortina con el color de marca
  const Tapa = ({dur}) => {
    const frame = useCurrentFrame();
    const color = col(E.transicion?.color ?? brand.acentos?.[0] ?? 'texto');
    if (E.transicion.tipo === 'cortina') {
      const x = interpolate(frame, [0, dur], [-100, 100], {...clamp, easing: Easing.inOut(Easing.cubic)});
      return <AbsoluteFill style={{backgroundColor: color, transform: `translateX(${x}%)`}} />;
    }
    return <AbsoluteFill style={{backgroundColor: color, opacity: interpolate(frame, [0, dur / 2, dur], [0, 1, 0], clamp)}} />;
  };

  const Grano = () => {
    const frame = useCurrentFrame();
    return (
      <AbsoluteFill style={{opacity: 0.16, mixBlendMode: 'overlay'}}>
        <svg width="1080" height="1920">
          <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} /></filter>
          <rect width="100%" height="100%" filter="url(#g)" />
        </svg>
      </AbsoluteFill>
    );
  };

  // Modo "palabra": una palabra a la vez, en su x/y
  const Word = ({w, dur}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const a = entrada(frame, fps, w.rot);
    const out = w.hold ? 1 : interpolate(frame, [dur - 3, dur], [1, 0], clamp);
    const color = col(w.color);
    const text = SUB.animacion === 'maquina'
      ? w.text.slice(0, Math.max(1, Math.ceil(w.text.length * interpolate(frame, [0, Math.max(4, Math.min(dur * 0.6, 10))], [0, 1], clamp))))
      : w.text;
    return (
      <div style={{
        position: 'absolute', left: w.x, top: w.y, transform: `translate(-50%,-50%) translateY(${a.y}px) rotate(${a.r}deg) scale(${a.s})`,
        opacity: a.o * out, color, fontSize: w.size, whiteSpace: 'nowrap', ...FONT[w.font], ...legible(color, w.size),
      }}>{text}</div>
    );
  };

  // Modos "grupo", "frase" y "karaoke": un bloque centrado con varias palabras
  const Bloque = ({ws, desde, dur}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const a = entrada(frame, fps);
    const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
    const t = desde + frame / FPS;   // tiempo absoluto del reel
    const pos = SUB.posicion === 'medio' ? {top: LAY.yMedio, transform: `translate(-50%,-50%) translateY(${a.y}px) scale(${a.s})`}
      : {top: LAY.yAbajo, transform: `translate(-50%,-100%) translateY(${a.y}px) scale(${a.s})`};
    const barra = SUB.legibilidad === 'barra' ? {background: NEGRO ? 'rgba(255,255,255,.88)' : 'rgba(0,0,0,.6)', padding: '22px 30px', borderRadius: 18} : {};
    return (
      <div style={{position: 'absolute', left: 540, width: LAY.ancho, display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        columnGap: '0.34em', rowGap: '0.12em', fontSize: ws[0].size, opacity: a.o * out, boxSizing: 'border-box', ...pos, ...barra}}>
        {ws.map((w, i) => {
          const ini = w.start + data.voiceOffset;
          const dicha = t >= ini;
          const actual = dicha && t < w.end + data.voiceOffset;
          let color = col(w.color), extra = {};
          if (SUB.modo === 'karaoke') {
            // la palabra que suena va en el acento (o en el color de texto si el modo ya pinta todo con el acento)
            const resalte = SUB.color === 'marca' ? col('texto') : ACENTO;
            color = actual ? resalte : col(NEGRO ? '#111111' : SUB.color === 'marca' ? brand.acentos[0] : 'texto');
            extra = {opacity: dicha ? 1 : 0.55, transform: actual ? 'scale(1.04)' : 'none', margin: '0 0.04em', display: 'inline-block'};
          }
          if (SUB.animacion === 'maquina' && !dicha) extra = {...extra, visibility: 'hidden'};
          return <span key={i} style={{color, ...FONT[w.font], fontSize: w.size, ...legible(color, w.size), ...extra}}>{w.text}</span>;
        })}
      </div>
    );
  };

  const Sticker = ({s}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const pop = spring({frame, fps, config: {damping: 9, stiffness: 160}});
    const wiggle = Math.sin(frame / 4) * 3;
    return (
      <Img src={asset(`brand/${s.img}`)} style={{
        position: 'absolute', left: s.x, top: s.y, width: s.w,
        transform: `translate(-50%,-50%) scale(${pop}) rotate(${s.rot + wiggle}deg)`,
        filter: s.white ? 'brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,.5))' : 'drop-shadow(0 6px 16px rgba(0,0,0,.5))',
      }} />
    );
  };

  // Animación del logo (cierre y entrada): pop · fade · deslizar · sello · estático
  const animLogo = (frame, fps) => {
    switch (E.animacionLogo) {
      case 'fade': return {opacity: interpolate(frame, [0, 10], [0, 1], clamp)};
      case 'deslizar': {
        const t = interpolate(frame, [0, 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return {opacity: t, transform: `translateY(${(1 - t) * 220}px)`};
      }
      case 'sello': {
        const t = interpolate(frame, [0, 7], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
        const temblor = frame >= 7 && frame < 13 ? Math.sin(frame * 2.4) * 3 : 0;
        return {opacity: Math.min(1, t * 2), transform: `scale(${interpolate(t, [0, 1], [2.6, 1])}) rotate(${-6 + temblor}deg)`};
      }
      case 'estatico': return {};
      default: {
        const s = spring({frame, fps, config: {damping: 10, stiffness: 150}});
        return {transform: `scale(${s}) rotate(${(1 - s) * -20}deg)`};
      }
    }
  };

  const Logo = ({w, demora = 0}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    return <Img src={asset(`brand/${brand.logo}`)} style={{width: w, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.35))', ...animLogo(frame - demora, fps)}} />;
  };

  const Handle = ({demora = 14, size = 64}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const o = brand.outro ?? {};
    const h = spring({frame: frame - demora, fps, config: {damping: 14}});
    return <div style={{...FONT[o.fuenteHandle ?? 'S'], fontSize: size, color: col(o.colorHandle ?? 'texto'), letterSpacing: 4, opacity: h,
      transform: `translateY(${(1 - h) * 40}px)`, textShadow: '0 4px 14px rgba(0,0,0,.35)'}}>{brand.handle}</div>;
  };

  // Cierre: logo + @handle sobre color de marca · CTA en pantalla · última toma congelada · loop con el inicio
  const Outro = ({dur}) => {
    const frame = useCurrentFrame();
    const o = brand.outro ?? {};
    const tipo = E.cierre?.tipo ?? 'logo';
    const bg = interpolate(frame, [0, 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    const fondo = col(o.fondo ?? brand.acentos?.[0] ?? 'texto');
    if (tipo === 'loop') {   // vuelve a la primera toma para que el final empalme con el inicio
      return (
        <AbsoluteFill style={{opacity: interpolate(frame, [0, dur], [0, 1], clamp)}}>
          <Clip clip={data.clips[0]} idx={0} />
        </AbsoluteFill>
      );
    }
    if (tipo === 'congelada') {
      const ult = data.clips[data.clips.length - 1];
      return (
        <AbsoluteFill>
          <Freeze frame={Math.max(0, Math.round((data.outroAt - ult.start) * FPS) - 1)}><Clip clip={ult} idx={-1} /></Freeze>
          <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,0) 55%)', opacity: bg}} />
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'column', gap: 36, paddingBottom: 480}}>
            <Logo w={380} demora={4} /><Handle size={56} />
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    const cta = tipo === 'cta' && E.cierre?.texto;
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{backgroundColor: fondo, opacity: bg * 0.92}} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: cta ? 44 : 60}}>
          {cta && <CTA texto={E.cierre.texto} />}
          <Logo w={cta ? 380 : 620} demora={cta ? 10 : 4} />
          <Handle demora={cta ? 18 : 14} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

  const CTA = ({texto}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const s = spring({frame, fps, config: {damping: 12, stiffness: 180}});
    return <div style={{...FONT.G ?? FONT[Object.keys(FONT)[0]], fontSize: 120, color: col('texto'), textAlign: 'center', maxWidth: 900,
      transform: `scale(${s})`, textShadow: SHADOW}}>{texto}</div>;
  };

  // Entrada: logo de 0,5 s o cartel con título, antes del gancho
  const Intro = ({dur}) => {
    const frame = useCurrentFrame();
    const fuera = interpolate(frame, [dur - 5, dur], [1, 0], clamp);
    if (E.entrada.tipo === 'logo') {
      return (
        <AbsoluteFill style={{backgroundColor: col(brand.outro?.fondo ?? brand.acentos?.[0] ?? 'texto'), opacity: fuera, justifyContent: 'center', alignItems: 'center'}}>
          <Logo w={560} />
        </AbsoluteFill>
      );
    }
    const {fps} = useVideoConfig();
    const s = spring({frame, fps, config: {damping: 12, stiffness: 170}});
    return (
      <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${0.45 * fuera})`, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{...(FONT.G ?? FONT[Object.keys(FONT)[0]]), fontSize: 150, color: col('texto'), textAlign: 'center', maxWidth: 900,
          opacity: fuera, transform: `scale(${s})`, textShadow: SHADOW}}>{E.entrada.texto}</div>
      </AbsoluteFill>
    );
  };

  const Zocalo = ({z}) => {
    const frame = useCurrentFrame();
    const t = interpolate(frame, [0, 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return (
      <div style={{position: 'absolute', left: 70, top: SUB.posicion === 'abajo' && SUB.modo !== 'no' ? 1180 : LAY.yAbajo, transform: `translate(${(t - 1) * 110}%, -100%)`, maxWidth: 860,
        background: ACENTO, color: col('texto'), padding: '14px 28px', borderRadius: 10, fontSize: 54, ...(FONT.S ?? {}), opacity: t}}>{z.texto}</div>
    );
  };

  // Agrupa las palabras por bloque (campo "g" que pone make_words.py)
  const BLOQUES = [];
  if (['grupo', 'frase', 'karaoke'].includes(SUB.modo)) {
    data.words.forEach((w) => {
      const b = BLOQUES[BLOQUES.length - 1];
      if (b && b.g === w.g) b.ws.push(w); else BLOQUES.push({g: w.g, ws: [w]});
    });
  }

  const Reel = () => {
    const outroStart = Math.round(data.outroAt * FPS);
    const sfx = E.sfx ?? {};
    const cortes = data.clips.slice(1).map((c) => Math.round(c.start * FPS));
    const tapa = ['fundido-color', 'cortina'].includes(E.transicion?.tipo);
    const introDur = E.entrada?.tipo === 'logo' ? 15 : E.entrada?.tipo === 'titulo' ? 36 : 0;
    const textos = SUB.modo === 'no' ? [] : SUB.modo === 'palabra'
      ? data.words.map((w) => {
        const from = Math.round((w.start + data.voiceOffset) * FPS);
        return {from, dur: Math.max(5, Math.round((w.end + data.voiceOffset) * FPS) - from), w};
      })
      : BLOQUES.map((b) => {
        const from = Math.round((b.ws[0].start + data.voiceOffset) * FPS);
        return {from, dur: Math.max(8, Math.round((b.ws[b.ws.length - 1].end + data.voiceOffset) * FPS) - from), b};
      });
    return (
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        <style>{fontFaces}</style>
        {data.clips.map((c, i) => {
          const ultimo = i === data.clips.length - 1;
          return (
            <Sequence key={i} from={Math.round(c.start * FPS)} durationInFrames={Math.round((c.end - c.start) * FPS) + (SOLAPA && !ultimo ? T_FR : 0)}>
              <Clip clip={c} idx={i} />
            </Sequence>
          );
        })}
        {tapa && cortes.map((f, i) => (
          <Sequence key={'t' + i} from={Math.max(0, f - Math.round(T_FR / 2))} durationInFrames={T_FR}><Tapa dur={T_FR} /></Sequence>
        ))}
        {E.look === 'cine' && <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,110,125,.55), rgba(255,140,40,.45))', mixBlendMode: 'soft-light'}} />}
        {/* viñeta suave para que se lean las palabras, sin fondo por palabra */}
        {E.vineta !== false && <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,.35) 100%)'}} />}
        {E.grano && <Grano />}
        {E.logoEsquina && (
          <Sequence durationInFrames={outroStart}>
            <Img src={asset(`brand/${brand.logo}`)} style={{position: 'absolute', top: 250, right: 70, width: 150, opacity: 0.92,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.4))'}} />
          </Sequence>
        )}
        {data.stickers.map((s, i) => (
          <Sequence key={'s' + i} from={Math.round(s.start * FPS)} durationInFrames={Math.round((s.end - s.start) * FPS)}>
            <Sticker s={s} />
          </Sequence>
        ))}
        {E.zocalo?.texto && (
          <Sequence from={Math.round(E.zocalo.start * FPS)} durationInFrames={Math.round((E.zocalo.end - E.zocalo.start) * FPS)}>
            <Zocalo z={E.zocalo} />
          </Sequence>
        )}
        {textos.filter((x) => x.from + x.dur > introDur).map((x, i) => (
          <Sequence key={'w' + i} from={Math.max(x.from, introDur)} durationInFrames={x.dur - Math.max(0, introDur - x.from)}>
            {x.w ? <Word w={x.w} dur={x.dur} /> : <Bloque ws={x.b.ws} desde={x.from / FPS} dur={x.dur} />}
          </Sequence>
        ))}
        {introDur > 0 && <Sequence durationInFrames={introDur}><Intro dur={introDur} /></Sequence>}
        {data.clips.length > 0 && (
          <Sequence from={outroStart}>
            <Outro dur={Math.max(1, Math.round(data.duration * FPS) - outroStart)} />
          </Sequence>
        )}
        {data.voz !== false && (
          <Sequence from={Math.round(data.voiceOffset * FPS)}>
            <Audio src={asset('voz.mp3')} volume={data.vozVolume ?? 1} />
          </Sequence>
        )}
        {data.music && <Audio src={asset(data.music)} volume={data.musicVolume ?? 0.18} />}
        {sfx.whoosh && cortes.map((f, i) => (
          <Sequence key={'wh' + i} from={Math.max(0, f - 6)} durationInFrames={20}><Audio src={asset('sfx/whoosh.wav')} volume={0.55} /></Sequence>
        ))}
        {sfx.pop && textos.map((x, i) => (
          <Sequence key={'pp' + i} from={x.from} durationInFrames={8}><Audio src={asset('sfx/pop.wav')} volume={0.4} /></Sequence>
        ))}
      </AbsoluteFill>
    );
  };
  return Reel;
}
