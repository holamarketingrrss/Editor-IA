#!/bin/bash
# Pone al día la composición de un proyecto (reel/src/index.jsx y los SFX) con la de template/.
# uso: scripts/sync_reel.sh <proyecto>      (lo llaman stills.sh y render.sh; no toca proyectos con reel/src/.propia)
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"
[ -f "$P/reel/src/.propia" ] && exit 0
if ! cmp -s template/reel/src/index.jsx "$P/reel/src/index.jsx"; then
  cp template/reel/src/index.jsx "$P/reel/src/index.jsx"; echo "(composición actualizada desde template/)"
fi
mkdir -p "$P/reel/public/sfx"; cp -n template/reel/public/sfx/* "$P/reel/public/sfx/" 2>/dev/null || true
