#!/bin/bash
# Crea proyectos/<cliente>-<tema>/ desde template/.
# uso: scripts/nuevo_proyecto.sh <cliente> <tema> [--preset marca | --tokens tokens.json --handle @marca [--logo logo.png]
#        [--fondo-outro color] [--acentos a,b,c] [--assets DIR]]
#   --preset: marca de presets/<marca> (brand.json, fuentes, logos, stickers y estilo de edición por defecto). Recomendado.
#   --tokens: arma brand.json desde el design system del cliente (requiere --handle).
#   --assets: carpeta con fonts/*.woff2 y brand/* (logo, stickers) para copiar a reel/public/.
set -e
cd "$(dirname "$0")/.."
[ $# -ge 2 ] || { sed -n '2,6p' "$0"; exit 1; }
slug() { echo "$1" | tr -d "'’" | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]\+/-/g;s/^-//;s/-$//'; }
P="proyectos/$(slug "$1")-$(slug "$2")"; shift 2
TOKENS=""; ASSETS=""; PRESET=""; BRAND_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --tokens) TOKENS="$2"; shift 2;;
    --assets) ASSETS="$2"; shift 2;;
    --preset) PRESET="$2"; shift 2;;
    --handle|--logo|--fondo-outro|--acentos|--nombre) BRAND_ARGS+=("$1" "$2"); shift 2;;
    *) echo "opción desconocida: $1"; exit 1;;
  esac
done
[ ! -e "$P" ] || { echo "ya existe $P"; exit 1; }
if [ -n "$PRESET" ] && [ ! -f "presets/$PRESET/preset.json" ]; then
  echo "no existe el preset $PRESET (hay: $(ls presets | tr '\n' ' '))"; exit 1
fi
mkdir -p "$P"/{raw,audio,thumbs} "$P"/reel/public/{clips,brand,fonts}
cp -r template/reel/package.json template/reel/package-lock.json template/reel/src "$P/reel/"
cp -r template/reel/public/sfx "$P/reel/public/"
cp template/proyecto.json template/guion.json "$P/"
: > "$P/edl.tsv"; : > "$P/inventario.tsv"
if [ -n "$PRESET" ]; then
  cp "presets/$PRESET/brand.json" "presets/$PRESET/preset.json" "$P/reel/src/"
  cp -r "presets/$PRESET/public/." "$P/reel/public/"
  python3 -c "import json,sys;p=sys.argv[1];d=json.load(open(p));d['preset']=sys.argv[2];json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)" "$P/proyecto.json" "$PRESET"
  if [ ${#BRAND_ARGS[@]} -gt 0 ]; then echo "AVISO: con --preset se ignoran ${BRAND_ARGS[*]} (editá brand.json del proyecto si hace falta)"; fi
elif [ -n "$TOKENS" ]; then
  python3 scripts/brand_desde_tokens.py "$TOKENS" --out "$P/reel/src/brand.json" "${BRAND_ARGS[@]}"
else
  cp template/brand.base.json "$P/reel/src/brand.json"
  echo "AVISO: sin --tokens, brand.json es el genérico: completá colores, fuentes, logo y handle."
fi
if [ -n "$ASSETS" ]; then
  [ -d "$ASSETS/fonts" ] && cp "$ASSETS"/fonts/* "$P/reel/public/fonts/"
  [ -d "$ASSETS/brand" ] && cp "$ASSETS"/brand/* "$P/reel/public/brand/"
fi
echo "Proyecto creado: $P"
echo "Siguiente: inventario.tsv -> miniaturas -> edl.tsv -> python3 scripts/make_clips.py $P -> python3 scripts/make_words.py $P -> (cd $P/reel && npm install && npm run studio)"
