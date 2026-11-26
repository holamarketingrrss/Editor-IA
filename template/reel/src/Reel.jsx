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
    .map((f) => `@font-face{font-family:'${f.familia}';font-weight:${f.peso ?? 400};src:url(${asset('fonts/' + f.archivo)}) format('${{ttf: 'truetype', otf: 'opentype', woff: 'woff'}[f.archivo.split('.').pop().toLowerCase()] ?? 'woff2'}');}`)
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
        return {background: SUB.colorCaja ? col(SUB.colorCaja) : (NEGRO ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.78)'), padding: '0.06em 0.22em', borderRadius: SUB.colorCaja ? '0.5em' : '0.14em'};
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


  // ---------- Escenas de motion graphics (proyecto.json "escenas"): reemplazan una toma o arman un video sin material.
  // Toman colores, fuentes y logo de la marca. Todo el texto queda dentro de la zona segura (y 260 a 1460, x 90 a 990).
  // Texto con *palabra* = destacada (color de acento). Tipos: titulo · lista · numero · imagen · frase.
  const hex = (v) => { const c = String(col(v) || '').trim(); return /^#[0-9a-f]{6}$/i.test(c) ? c : /^#[0-9a-f]{3}$/i.test(c) ? '#' + c.slice(1).split('').map((x) => x + x).join('') : null; };
  const lum = (v) => {
    const h = hex(v); if (!h) return 0;
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(parseInt(h.slice(1, 3), 16)) + 0.7152 * f(parseInt(h.slice(3, 5), 16)) + 0.0722 * f(parseInt(h.slice(5, 7), 16));
  };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const PALETA = Object.keys(C);
  const OSCURO = PALETA.filter((k) => hex(k)).sort((a, b) => lum(a) - lum(b))[0] ?? '#111111';
  // color de texto legible sobre el fondo: el pedido, o blanco / el más oscuro de la marca
  const textoSobre = (fondo, pedido) => pedido ? col(pedido) : (contraste('#FFFFFF', fondo) >= contraste(OSCURO, fondo) ? '#FFFFFF' : col(OSCURO));
  // acento para destacar: el primero de la marca que se lea sobre el fondo y no sea el fondo
  const acentoSobre = (fondo, texto) => {
    const cand = [...(brand.acentos ?? []), ...PALETA].map(col).filter((c) => hex(c) && hex(c) !== hex(fondo));
    return cand.find((c) => contraste(c, fondo) >= 2.2) ?? texto;
  };
  const FG = FONT.G ?? FONT[Object.keys(FONT)[0]], FB = FONT.B ?? FG;
  const ANCHO_G = brand.fuentes.G?.ancho ?? 0.56, ANCHO_B = brand.fuentes.B?.ancho ?? 0.55;
  const marcas = (t) => String(t ?? '').split(/(\*[^*]+\*)/).filter(Boolean).map((x) => (x.startsWith('*') ? {t: x.slice(1, -1), d: true} : {t: x, d: false}));
  // reparte el texto en renglones y elige el tamaño más grande que entra en el ancho y el alto
  const acomodar = (texto, {max = 170, min = 64, ancho = 880, alto = 640, prop = ANCHO_G, inter = 1.05} = {}) => {
    // una destacada de varias palabras no se corta entre renglones (espacio duro adentro de *...*)
    const partes = String(texto ?? '').replace(/\*[^*]+\*/g, (m) => m.replace(/ /g, '\u00a0')).split('\n');
    for (let size = max; size >= min; size -= 6) {
      const porRenglon = Math.max(4, Math.floor(ancho / (size * prop)));
      const lineas = [];
      for (const p of partes) {
        let l = '';
        for (const w of p.split(/ +/).filter(Boolean)) {
          const largo = (l ? l + ' ' + w : w).replace(/\*/g, '').length;
          if (l && largo > porRenglon) { lineas.push(l); l = w; } else l = l ? l + ' ' + w : w;
        }
        lineas.push(l);
      }
      if (lineas.length * size * inter <= alto || size - 6 < min) return {size, lineas};
    }
    return {size: min, lineas: partes};
  };

  const Fondo = ({e, dur}) => {
    const frame = useCurrentFrame();
    const f = e.fondo ?? brand.outro?.fondo ?? brand.acentos?.[0] ?? OSCURO;
    const bg = Array.isArray(f) ? `linear-gradient(160deg, ${col(f[0])}, ${col(f[1] ?? f[0])})` : col(f);
    const base = Array.isArray(f) ? f[0] : f;
    const deco = e.decor ?? 'formas';
    const otros = [...(brand.acentos ?? []), ...PALETA].map(col).filter((c) => hex(c) && hex(c) !== hex(base) && c !== '#FFFFFF');
    const a1 = otros[0] ?? '#FFFFFF', a2 = otros[1] ?? a1;
    const t = frame / Math.max(1, dur);
    const en = spring({frame, fps: FPS, config: {damping: 16, stiffness: 90}});
    return (
      <AbsoluteFill style={{background: bg, overflow: 'hidden'}}>
        {deco === 'formas' && <>
          <div style={{position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: a1, opacity: 0.9,
            left: 520 + t * 60, top: -380 - t * 40, transform: `scale(${en})`}} />
          <div style={{position: 'absolute', width: 520, height: 520, borderRadius: '50%', border: `46px solid ${a2}`, opacity: 0.85,
            left: -260 - t * 50, top: 1480 + t * 30, transform: `scale(${en}) rotate(${t * 40}deg)`}} />
          <div style={{position: 'absolute', width: 70, height: 70, borderRadius: '50%', background: a2, left: 120, top: 300 - t * 60, transform: `scale(${en})`}} />
        </>}
        {deco === 'lineas' && Array.from({length: 7}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: -200, right: -200, top: 140 + i * 280, height: 18, background: a1, opacity: 0.18,
            transform: `translateX(${((i % 2 ? 1 : -1) * (1 - en) * 100) + (i % 2 ? t : -t) * 80}px) rotate(-8deg)`}} />
        ))}
        {deco === 'puntos' && <AbsoluteFill style={{backgroundImage: `radial-gradient(${a1} 5px, transparent 6px)`, backgroundSize: '64px 64px',
          opacity: 0.22 * en, transform: `translateY(${-t * 64}px)`}} />}
      </AbsoluteFill>
    );
  };

  // texto con destacadas; "barrido" pinta una franja de acento detrás de la destacada
  const Marcado = ({texto, acento, sobre, desde = 0, barrido = true}) => {
    const frame = useCurrentFrame();
    return marcas(texto).map((p, i) => (p.d
      ? <span key={i} style={{position: 'relative', color: barrido ? sobre : acento, whiteSpace: 'nowrap', zIndex: 0}}>
          {barrido && <span style={{position: 'absolute', left: '-0.08em', right: '-0.08em', top: '0.12em', bottom: '0.02em', background: acento, zIndex: -1,
            borderRadius: '0.08em', transformOrigin: 'left', transform: `scaleX(${interpolate(frame - desde, [0, 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)})})`}} />}
          {p.t}
        </span>
      : <span key={i}>{p.t}</span>));
  };

  const Escena = ({e, dur}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const f = e.fondo ?? brand.outro?.fondo ?? brand.acentos?.[0] ?? OSCURO;
    const base = Array.isArray(f) ? f[0] : f;
    const tc = textoSobre(base, e.color);
    const acc = e.acento ? col(e.acento) : acentoSobre(base, tc);
    // con barrido, la destacada va con el color de texto que se lea sobre el acento
    const tcAcc = contraste('#FFFFFF', acc) >= contraste(col(OSCURO), acc) ? '#FFFFFF' : col(OSCURO);
    const salida = interpolate(frame, [dur - 7, dur], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
    const izq = e.alineacion === 'izquierda';
    const caja = {position: 'absolute', left: 90, right: 90, top: 260, bottom: 460, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: izq ? 'flex-start' : 'center', textAlign: izq ? 'left' : 'center', gap: 34, color: tc,
      transform: `translateY(${-salida * 60}px)`, opacity: 1 - salida};
    const sube = (desde) => { const p = spring({frame: frame - desde, fps, config: {damping: 15, stiffness: 160}}); return {opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 50}px)`}; };
    const Sub = ({desde}) => e.sub ? <div style={{...FB, fontSize: 54, lineHeight: 1.2, opacity: 0.9, maxWidth: 860, ...sube(desde)}}>{e.sub}</div> : null;
    const tipo = e.tipo ?? 'titulo';

    let cuerpo = null;
    if (tipo === 'titulo') {
      const {size, lineas} = acomodar(e.texto, {alto: e.sub ? 520 : 700});
      cuerpo = <>
        <div style={{...FG, fontSize: size, lineHeight: 1.05}}>
          {lineas.map((l, i) => {
            const p = interpolate(frame - i * 4, [0, 10], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
            return <div key={i} style={{overflow: 'hidden', paddingBottom: '0.08em'}}>
              <div style={{transform: `translateY(${(1 - p) * 110}%)`}}><Marcado texto={l} acento={acc} sobre={tcAcc} desde={8 + i * 4} /></div>
            </div>;
          })}
        </div>
        <Sub desde={6 + lineas.length * 4} />
      </>;
    }
    if (tipo === 'lista') {
      const items = e.items ?? [];
      const ventana = Math.max(1, dur * 0.6 - 10);
      const {size} = acomodar(items.reduce((a, b) => (a.length > b.length ? a : b), ''), {max: 78, min: 44, ancho: 720, alto: 9999, prop: ANCHO_B});
      cuerpo = <>
        {e.texto && <div style={{...FG, fontSize: acomodar(e.texto, {max: 110, alto: 260}).size, lineHeight: 1.05, ...sube(0)}}><Marcado texto={e.texto} acento={acc} sobre={tcAcc} desde={8} /></div>}
        <div style={{display: 'flex', flexDirection: 'column', gap: 26, alignSelf: 'stretch'}}>
          {items.map((it, i) => {
            const desde = 8 + Math.round((i * ventana) / Math.max(1, items.length));
            const p = spring({frame: frame - desde, fps, config: {damping: 14, stiffness: 170}});
            return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * -80}px)`,
              textAlign: 'left'}}>
              <span style={{...FG, flex: 'none', width: size * 1.35, height: size * 1.35, borderRadius: '50%', background: acc, color: tcAcc,
                display: 'grid', placeItems: 'center', fontSize: size * 0.7, transform: `scale(${p})`}}>{e.numerada === false ? '✓' : i + 1}</span>
              <span style={{...FB, fontSize: size, lineHeight: 1.15}}><Marcado texto={it} acento={acc} barrido={false} /></span>
            </div>;
          })}
        </div>
      </>;
    }
    if (tipo === 'numero') {
      const hasta = +e.numero || 0, desdeN = +e.desde || 0;
      const p = interpolate(frame, [4, Math.max(5, dur * 0.55)], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
      const dec = String(e.numero).includes('.') ? String(e.numero).split('.')[1].length : 0;
      const n = (desdeN + (hasta - desdeN) * p).toLocaleString('es-AR', {minimumFractionDigits: dec, maximumFractionDigits: dec});
      const txt = `${e.prefijo ?? ''}${(desdeN + (hasta - desdeN)).toLocaleString('es-AR', {minimumFractionDigits: dec, maximumFractionDigits: dec})}${e.sufijo ?? ''}`;
      const {size} = acomodar(txt, {max: 330, min: 120, alto: 400, inter: 1});
      const latido = frame > dur * 0.55 ? 1 + 0.04 * Math.sin((frame - dur * 0.55) / 3) * Math.exp(-(frame - dur * 0.55) / 12) : 1;
      cuerpo = <>
        <div style={{...FG, fontSize: size, lineHeight: 1, color: acc, fontVariantNumeric: 'tabular-nums', transform: `scale(${latido})`, ...sube(0)}}>
          {e.prefijo}{n}{e.sufijo}</div>
        {e.texto && <div style={{...FG, fontSize: acomodar(e.texto, {max: 96, alto: 300}).size, lineHeight: 1.08, ...sube(8)}}><Marcado texto={e.texto} acento={acc} sobre={tcAcc} desde={16} /></div>}
        <Sub desde={14} />
      </>;
    }
    if (tipo === 'imagen') {
      const p = spring({frame: frame - 2, fps, config: {damping: 14, stiffness: 120}});
      const zoom = interpolate(frame, [0, dur], [1, 1.08]);
      const alto = e.texto ? 760 : 1060;
      cuerpo = <>
        {e.img && <div style={{width: e.ajuste === 'contain' ? 'auto' : 820, height: alto, borderRadius: 36, overflow: 'hidden', alignSelf: 'center',
          boxShadow: '0 40px 80px rgba(0,0,0,.35)', transform: `scale(${0.8 + 0.2 * p}) rotate(${(1 - p) * -6 + (e.rot ?? 0)}deg)`, opacity: Math.min(1, p * 1.5),
          background: e.ajuste === 'contain' ? 'transparent' : 'rgba(0,0,0,.15)'}}>
          <Img src={asset(e.img)} style={{width: '100%', height: '100%', objectFit: e.ajuste ?? 'cover', transform: `scale(${zoom})`}} />
        </div>}
        {e.texto && <div style={{...FG, fontSize: acomodar(e.texto, {max: 110, alto: 300}).size, lineHeight: 1.05, ...sube(10)}}><Marcado texto={e.texto} acento={acc} sobre={tcAcc} desde={18} /></div>}
      </>;
    }
    if (tipo === 'frase') {
      const {size, lineas} = acomodar(e.texto, {max: 110, min: 56, alto: 600, prop: ANCHO_B, inter: 1.2});
      const palabras = lineas.join('\n').split(/( +|\n)/);
      let k = 0;
      cuerpo = <>
        <div style={{...FG, fontSize: 280, lineHeight: 0.6, color: acc, height: 120, ...sube(0)}}>“</div>
        <div style={{...FB, fontSize: size, lineHeight: 1.2, whiteSpace: 'pre-wrap'}}>
          {palabras.map((w, i) => {
            if (!w.trim()) return w;
            const o = interpolate(frame - 6 - (k++) * 1.6, [0, 6], [0, 1], clamp);
            return <span key={i} style={{opacity: o}}><Marcado texto={w} acento={acc} barrido={false} /></span>;
          })}
        </div>
        {e.autor && <div style={{...FB, fontSize: 46, opacity: 0.85, ...sube(10 + k * 1.6)}}>— {e.autor}</div>}
      </>;
    }
    return (
      <AbsoluteFill>
        <Fondo e={e} dur={dur} />
        {e.logo && <Img src={asset(`brand/${brand.logo}`)} style={{position: 'absolute', top: 250, left: '50%', width: 220, transform: 'translateX(-50%)', ...sube(0)}} />}
        <div style={caja}>{cuerpo}</div>
      </AbsoluteFill>
    );
  };

  const Clip = ({clip, idx}) => {
    const frame = useCurrentFrame();
    const durationInFrames = Math.round((clip.end - clip.start) * FPS);
    let scale = 1;
    if (E.camara === 'pushin') scale = interpolate(frame, [0, durationInFrames], [1.06, 1.14], {extrapolateRight: 'clamp'});
    if (E.camara === 'punchin') {
      const t = clip.start + frame / FPS;
      scale = DESTACADAS.some(([a, b]) => t >= a && t < b) ? 1.16 : 1.04;
    }
    let opacity = 1, ty = 0, zoomT = 1;
    if (SOLAPA && idx > 0) {
      const p = interpolate(frame, [0, T_FR], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
      if (E.transicion.tipo === 'fundido') opacity = p;
      if (E.transicion.tipo === 'zoom') { opacity = p; zoomT = interpolate(p, [0, 1], [1.3, 1]); scale *= zoomT; }
      if (E.transicion.tipo === 'deslizar') ty = (1 - p) * 100;
    }
    if (clip.tipo === 'escena') {
      return (
        <AbsoluteFill style={{overflow: 'hidden', opacity, transform: `translateY(${ty}%) scale(${zoomT})`}}>
          <Escena e={clip.escena} dur={durationInFrames} />
        </AbsoluteFill>
      );
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
    const completo = w.frase ?? w.text;   // frase destacada: se muestra entera en su primera palabra
    const text = SUB.animacion === 'maquina'
      ? completo.slice(0, Math.max(1, Math.ceil(completo.length * interpolate(frame, [0, Math.max(4, Math.min(dur * 0.6, 10))], [0, 1], clamp))))
      : completo;
    // destacado "brillo": resplandor del color de la palabra que se enciende y late suave, con un rebote extra al entrar
    let brillo = {}, extra = 1;
    if (w.destacado && SUB.efectoDestacado === 'brillo') {
      const prende = interpolate(frame, [0, 6, 12], [0, 1.25, 1], clamp) * (1 + 0.12 * Math.sin(frame / 3.5));
      const r = Math.round(w.size * 0.09 * prende), r2 = Math.round(w.size * 0.22 * prende);
      brillo = {textShadow: `0 0 ${r}px ${color}, 0 0 ${r2}px ${color}, 0 4px 14px rgba(0,0,0,.55)`};
      extra = 1 + 0.06 * spring({frame: frame - 2, fps, config: {damping: 7, stiffness: 260, mass: 0.5}}) * Math.max(0, 1 - frame / 18);
    }
    // destacado "neon": resplandor intenso del color y un subrayado que se dibuja debajo
    let subrayado = null;
    if (w.destacado && SUB.efectoDestacado === 'neon') {
      const prende = interpolate(frame, [0, 5, 10], [0, 1.25, 1], clamp) * (1 + 0.06 * Math.sin(frame / 4));
      // la letra queda nítida: sombra oscura pegada + halo del color alrededor
      const r = Math.round(w.size * 0.12 * prende), r2 = Math.round(w.size * 0.3 * prende);
      brillo = {textShadow: `0 2px 4px rgba(0,0,0,.55), 0 0 ${r}px ${color}AA, 0 0 ${r2}px ${color}66`};
      extra = 1 + 0.05 * spring({frame: frame - 1, fps, config: {damping: 8, stiffness: 260, mass: 0.5}}) * Math.max(0, 1 - frame / 16);
      const linea = interpolate(frame, [3, 11], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
      subrayado = <span style={{position: 'absolute', left: '22%', right: '22%', bottom: '-0.1em', height: Math.max(4, Math.round(w.size * 0.05)),
        borderRadius: 99, background: color, boxShadow: `0 0 ${r}px ${color}`, transform: `scaleX(${linea})`, transformOrigin: 'center'}} />;
    }
    return (
      <div style={{
        position: 'absolute', left: w.x, top: w.y, transform: `translate(-50%,-50%) translateY(${a.y}px) rotate(${a.r}deg) scale(${a.s * extra})`,
        opacity: a.o * out, color, fontSize: w.size, whiteSpace: 'nowrap', ...FONT[w.font], ...legible(color, w.size), ...brillo,
      }}>{text}{subrayado}</div>
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

  // Stickers: "pop" (rebote) o "trazo" (el garabato aparece como pintado, de un lado al otro). Por sticker: s.anim
  const Sticker = ({s}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const anim = s.anim ?? E.animacionStickers ?? 'pop';
    const wiggle = Math.sin(frame / 4) * 3;
    let scale = spring({frame, fps, config: {damping: 9, stiffness: 160}}), clip = 'none';
    if (anim === 'trazo') {
      const p = interpolate(frame, [0, 14], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
      scale = interpolate(p, [0, 1], [0.92, 1]);
      clip = `inset(0 ${(1 - p) * 100}% 0 0 round 6%)`;   // se revela de izquierda a derecha
    }
    return (
      <Img src={asset(`brand/${s.img}`)} style={{
        position: 'absolute', left: s.x, top: s.y, width: s.w, clipPath: clip,
        transform: `translate(-50%,-50%) scale(${scale}) rotate(${s.rot + wiggle}deg)`,
        filter: s.white ? 'brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,.5))' : 'drop-shadow(0 6px 16px rgba(0,0,0,.5))',
      }} />
    );
  };

  // Gráficos animados (proyecto.json "graficos"): flechas dibujadas a mano que se trazan solas, y emojis con rebote.
  //   {"tipo": "flecha", "start": 2, "end": 3.5, "x": 700, "y": 900, "w": 260, "rot": 20, "forma": "curva"|"recta", "color": "amarillo"}
  //   {"tipo": "emoji", "emoji": "🔥", "start": 1, "end": 2.5, "x": 300, "y": 700, "size": 160, "rot": -8}
  const FLECHAS = {
    curva: {cuerpo: 'M 30 250 C 60 120, 150 60, 250 70', punta: 'M 205 35 L 255 70 L 210 112'},
    recta: {cuerpo: 'M 40 260 L 250 60', punta: 'M 185 55 L 252 58 L 248 125'},
  };
  const Grafico = ({g}) => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    if (g.tipo === 'emoji') {
      const pop = spring({frame, fps, config: {damping: 8, stiffness: 170}});
      const flota = Math.sin(frame / 7) * 8;
      return <div style={{position: 'absolute', left: g.x, top: g.y, fontSize: g.size ?? 150, lineHeight: 1,
        transform: `translate(-50%,-50%) translateY(${flota}px) scale(${pop}) rotate(${(g.rot ?? 0) + Math.sin(frame / 9) * 4}deg)`,
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.4))'}}>{g.emoji}</div>;
    }
    const f = FLECHAS[g.forma] ?? FLECHAS.curva;
    const cuerpo = interpolate(frame, [0, 12], [1, 0], {...clamp, easing: Easing.out(Easing.cubic)});
    const punta = interpolate(frame, [10, 16], [1, 0], clamp);
    const w = g.w ?? 260, color = col(g.color ?? 'texto');
    const trazo = {fill: 'none', stroke: color, strokeWidth: 16, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, strokeDasharray: 1};
    return (
      <svg viewBox="0 0 300 300" width={w} height={w} style={{position: 'absolute', left: g.x, top: g.y, overflow: 'visible',
        transform: `translate(-50%,-50%) rotate(${g.rot ?? 0}deg)`, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.45))'}}>
        <path d={f.cuerpo} {...trazo} strokeDashoffset={cuerpo} />
        <path d={f.punta} {...trazo} strokeDashoffset={punta} />
      </svg>
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
    if (tipo === 'anillo') {   // fondo lleno, anillo que se abre alrededor del logo (isotipo arriba si la marca lo tiene) y @handle en pastilla
      const acc = col(SUB.colorDestacado ?? brand.acentos?.[0] ?? 'texto');
      const anillo = spring({frame: frame - 2, fps: FPS, config: {damping: 18, stiffness: 70}});
      const iso = spring({frame: frame - 3, fps: FPS, config: {damping: 12, stiffness: 160}});
      return (
        <AbsoluteFill style={{backgroundColor: fondo, opacity: bg}}>
          <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,.07), rgba(0,0,0,.28) 72%)'}} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 70, paddingBottom: 60}}>
            <div style={{position: 'relative', width: 600, height: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 46}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${acc}55`, boxShadow: `0 0 70px ${acc}1F inset`,
                transform: `scale(${0.6 + 0.4 * anillo})`, opacity: anillo}} />
              {o.isotipo && <Img src={asset(`brand/${o.isotipo}`)} style={{width: 150, opacity: Math.min(1, iso * 1.4), transform: `scale(${0.5 + 0.5 * iso})`}} />}
              <Logo w={o.isotipo ? 340 : 420} demora={o.isotipo ? 8 : 4} />
            </div>
            <div style={{opacity: interpolate(frame, [14, 22], [0, 1], clamp), transform: `translateY(${interpolate(frame, [14, 24], [24, 0], clamp)}px)`,
              border: `2px solid ${acc}88`, borderRadius: 999, padding: '10px 30px', background: 'rgba(0,0,0,.18)'}}>
              <Handle demora={14} size={40} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    const cta = tipo === 'cta' && E.cierre?.texto;
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{backgroundColor: fondo, opacity: bg}} />
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

  // Rótulo arriba (tema o paso): "BLACK FRIDAY · No comprés por impulso" -> la primera parte en mayúsculas y color
  const Etiqueta = ({e, dur}) => {
    const frame = useCurrentFrame();
    const t = interpolate(frame, [0, 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    const fuera = interpolate(frame, [dur - 6, dur], [1, 0], clamp);
    const [cabeza, ...resto] = String(e.texto).split(' · ');
    const acc = col(SUB.colorDestacado ?? brand.acentos?.[0] ?? 'texto');
    const fondo = col(brand.outro?.fondo ?? '#000000');
    return (
      <div style={{position: 'absolute', top: 250, left: e.centrado ? '50%' : 70, transform: `${e.centrado ? 'translateX(-50%) ' : ''}translateY(${(1 - t) * -30}px)`,
        opacity: t * fuera, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px 12px 20px', borderRadius: 999, maxWidth: 940,
        background: /^#[0-9a-f]{6}$/i.test(fondo) ? fondo + 'D9' : 'rgba(0,0,0,.7)', border: `2px solid ${acc}66`, boxShadow: '0 6px 20px rgba(0,0,0,.3)',
        ...(FONT.B ?? {}), textTransform: 'none', fontSize: 30, lineHeight: 1.1, color: col('texto'), whiteSpace: 'nowrap'}}>
        <span style={{width: 12, height: 12, borderRadius: 99, background: acc, boxShadow: `0 0 12px ${acc}`, flex: 'none'}} />
        <b style={{color: acc, textTransform: 'uppercase', letterSpacing: 2}}>{cabeza}</b>
        {resto.length > 0 && <span style={{opacity: 0.9}}>· {resto.join(' · ')}</span>}
      </div>
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

  // las escenas traen su propio texto: los subtítulos de la voz no se muestran encima (salvo escena "subtitulos": true)
  const enEscena = (fr) => data.clips.some((c) => c.tipo === 'escena' && !c.escena?.subtitulos && fr >= c.start * FPS && fr < c.end * FPS);

  const Reel = () => {
    const outroStart = Math.round(data.outroAt * FPS);
    const sfx = E.sfx ?? {};
    const cortes = data.clips.slice(1).map((c) => Math.round(c.start * FPS));
    const tapa = ['fundido-color', 'cortina'].includes(E.transicion?.tipo);
    const introDur = E.entrada?.tipo === 'logo' ? 15 : E.entrada?.tipo === 'titulo' ? 36 : 0;
    const textos = SUB.modo === 'no' ? [] : SUB.modo === 'palabra'
      ? data.words.filter((w) => !w.oculta).map((w) => {
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
        {E.vineta !== false && data.clips.filter((c) => c.tipo !== 'escena').map((c, i) => (
          <Sequence key={'v' + i} from={Math.round(c.start * FPS)} durationInFrames={Math.max(1, Math.round((c.end - c.start) * FPS))}>
            <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,.35) 100%)'}} />
          </Sequence>
        ))}
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
        {(data.graficos ?? []).map((g, i) => (
          <Sequence key={'g' + i} from={Math.round(g.start * FPS)} durationInFrames={Math.max(1, Math.round((g.end - g.start) * FPS))}>
            <Grafico g={g} />
          </Sequence>
        ))}
        {E.etiqueta?.texto && (
          <Sequence from={Math.round((E.etiqueta.start ?? 0) * FPS)} durationInFrames={Math.max(1, Math.round(((E.etiqueta.end ?? 3) - (E.etiqueta.start ?? 0)) * FPS))}>
            <Etiqueta e={E.etiqueta} dur={Math.max(1, Math.round(((E.etiqueta.end ?? 3) - (E.etiqueta.start ?? 0)) * FPS))} />
          </Sequence>
        )}
        {E.zocalo?.texto && (
          <Sequence from={Math.round(E.zocalo.start * FPS)} durationInFrames={Math.round((E.zocalo.end - E.zocalo.start) * FPS)}>
            <Zocalo z={E.zocalo} />
          </Sequence>
        )}
        {textos.filter((x) => x.from + x.dur > introDur && !enEscena(x.from)).map((x, i) => (
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
        {sfx.pop && textos.filter((x) => !enEscena(x.from)).map((x, i) => (
          <Sequence key={'pp' + i} from={x.from} durationInFrames={8}><Audio src={asset('sfx/pop.wav')} volume={0.4} /></Sequence>
        ))}
      </AbsoluteFill>
    );
  };
  return Reel;
}
