#!/bin/bash
# Instala el kit de edición: FFmpeg, yt-dlp, whisper.cpp, Remotion, HyperFrames
set -e
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || (apt-get update && apt-get install -y ffmpeg)
pip install -q -U yt-dlp
mkdir -p tools
if [ ! -x tools/whisper.cpp/build/bin/whisper-cli ]; then
  [ -d tools/whisper.cpp ] || git clone -q --depth 1 https://github.com/ggerganov/whisper.cpp tools/whisper.cpp
  (cd tools/whisper.cpp && cmake -B build -DCMAKE_BUILD_TYPE=Release >/dev/null && cmake --build build -j"$(nproc)" --config Release >/dev/null)
fi
[ -f tools/whisper.cpp/models/ggml-base.bin ] || sh tools/whisper.cpp/models/download-ggml-model.sh base
(cd tests/remotion-test && npm install --silent)
npx -y hyperframes@0.9.56 --version
echo "Listo."
