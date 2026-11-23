#!/bin/bash
# Pone al día la composición de un proyecto (reel/src/*.jsx y los SFX) con la de template/.
# uso: scripts/sync_reel.sh <proyecto>      (lo llaman stills.sh y render.sh; no toca proyectos con reel/src/.propia)
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"
[ -f "$P/reel/src/.propia" ] && exit 0
for f in template/reel/src/*.jsx; do
  if ! cmp -s "$f" "$P/reel/src/$(basename "$f")"; then
    cp "$f" "$P/reel/src/"; echo "(composición actualizada desde template/: $(basename "$f"))"
  fi
done
# preset de la marca: el estilo por defecto se toma siempre del de presets/ (lo propio de la pieza va en proyecto.json)
PRESET=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('preset',''))" "$P/proyecto.json" 2>/dev/null || true)
if [ -n "$PRESET" ] && [ -f "presets/$PRESET/preset.json" ] && ! cmp -s "presets/$PRESET/preset.json" "$P/reel/src/preset.json"; then
  cp "presets/$PRESET/preset.json" "$P/reel/src/preset.json"; echo "(preset $PRESET actualizado)"
fi
mkdir -p "$P/reel/public/sfx"; cp -n template/reel/public/sfx/* "$P/reel/public/sfx/" 2>/dev/null || true
