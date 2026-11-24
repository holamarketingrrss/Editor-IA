#!/bin/bash
# Instala el kit de edición (común a Mac, Linux/WSL y la nube): FFmpeg, yt-dlp, Pillow, whisper.cpp + modelo small,
# Remotion (+ su navegador) y la app. Para una compu del equipo usá instalar/mac.sh o instalar/linux.sh, que además
# instalan Node, Claude Code y el lanzador, y terminan con scripts/verificar.sh.
set -e
cd "$(dirname "$0")/.."
SO=$(uname -s)
nucleos() { getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4; }
sudo_si() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }

if ! command -v ffmpeg >/dev/null; then
  if [ "$SO" = Darwin ]; then brew install ffmpeg; else sudo_si apt-get update -qq && sudo_si apt-get install -y -qq ffmpeg; fi
fi
if [ "$SO" = Darwin ]; then
  command -v yt-dlp >/dev/null || brew install yt-dlp
  python3 -c "import PIL" 2>/dev/null || brew install pillow
else
  pip install -q -U yt-dlp pillow 2>/dev/null || pip install -q -U --break-system-packages yt-dlp pillow 2>/dev/null \
    || sudo_si apt-get install -y -qq yt-dlp python3-pil
fi

mkdir -p tools
if [ ! -x tools/whisper.cpp/build/bin/whisper-cli ]; then
  [ -d tools/whisper.cpp ] || git clone -q --depth 1 https://github.com/ggerganov/whisper.cpp tools/whisper.cpp
  (cd tools/whisper.cpp && cmake -B build -DCMAKE_BUILD_TYPE=Release >/dev/null && cmake --build build -j"$(nucleos)" --config Release >/dev/null)
fi
[ -f tools/whisper.cpp/models/ggml-small.bin ] || sh tools/whisper.cpp/models/download-ggml-model.sh small

(cd template/reel && npm install --silent)   # dependencias de Remotion para los proyectos nuevos
(cd template/reel && npx remotion browser ensure >/dev/null 2>&1) || echo "AVISO: no se pudo bajar el navegador de Remotion (se baja solo en el primer render)"
(cd app && npm install --silent)            # app del editor: cd app && npm run editor
npx -y hyperframes@0.9.56 --version >/dev/null 2>&1 || echo "AVISO: HyperFrames no se instaló (opcional)"
echo "Listo."
