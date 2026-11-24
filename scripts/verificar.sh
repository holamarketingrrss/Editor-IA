#!/bin/bash
# Chequea que la compu tenga todo para usar el editor y la app. No gasta uso de Claude.
# uso: bash scripts/verificar.sh            (sale con 1 si falta algo obligatorio)
cd "$(dirname "$0")/.." || exit 1
FALTA=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
mal()  { printf '  \033[31m✗\033[0m %s\n      → %s\n' "$1" "$2"; FALTA=1; }
ojo()  { printf '  \033[33m!\033[0m %s\n      → %s\n' "$1" "$2"; }

echo "Editor IA · verificación"
V=$(node -v 2>/dev/null | sed 's/v//;s/\..*//')
if [ -n "$V" ] && [ "$V" -ge 20 ]; then ok "Node $(node -v)"; else mal "Node 20 o más nuevo" "instalalo (instalar/mac.sh o instalar/linux.sh lo hacen)"; fi
command -v ffmpeg >/dev/null && ok "FFmpeg" || mal "FFmpeg" "Mac: brew install ffmpeg · Linux/WSL: sudo apt install ffmpeg"
command -v python3 >/dev/null && ok "Python 3" || mal "Python 3" "Mac: brew install python · Linux/WSL: sudo apt install python3"
python3 -c "import PIL" 2>/dev/null && ok "Pillow" || ojo "Pillow (solo para hojas de miniaturas)" "pip install pillow"
[ -x tools/whisper.cpp/build/bin/whisper-cli ] && ok "whisper.cpp" || mal "whisper.cpp" "bash scripts/instalar.sh"
[ -f tools/whisper.cpp/models/ggml-small.bin ] && ok "modelo de whisper (small)" || mal "modelo de whisper (small)" "bash scripts/instalar.sh"
[ -d template/reel/node_modules/remotion ] && ok "Remotion (template/reel)" || mal "Remotion (template/reel)" "cd template/reel && npm install"
[ -d app/node_modules/@remotion/player ] && ok "App (app/)" || mal "dependencias de la app" "cd app && npm install"

export PATH="$HOME/.local/bin:$PATH"
CL=$(command -v claude || true)
if [ -n "$CL" ] && [ "${CL#/mnt/}" != "$CL" ]; then
  mal "Claude Code de Windows ($CL)" "instalá el de Ubuntu: curl -fsSL https://claude.ai/install.sh | bash  y después  ~/.local/bin/claude auth login"
elif [ -n "$CL" ]; then
  ok "Claude Code $(claude --version 2>/dev/null | cut -d' ' -f1)"
  ESTADO=$(claude auth status --json 2>/dev/null)
  if echo "$ESTADO" | grep -q '"loggedIn": *true'; then
    if echo "$ESTADO" | grep -qi '"authMethod": *"[^"]*api'; then
      ojo "Claude Code logueado con API key" "los conectores (Notion, Drive, ElevenLabs) solo cargan con el login de claude.ai: claude auth logout y claude auth login"
    else ok "Claude Code logueado"; fi
  else mal "Claude Code sin login" "corré: claude auth login (con la cuenta de la agencia)"; fi
  [ -n "$ANTHROPIC_API_KEY" ] && ojo "ANTHROPIC_API_KEY está definida" "con API key no cargan los conectores de claude.ai: sacala del entorno para usar la app"
else
  mal "Claude Code" "instalar/mac.sh o instalar/linux.sh lo instalan (o: curl -fsSL https://claude.ai/install.sh | bash)"
fi
MARCAS=""; for f in presets/*/preset.json; do [ -f "$f" ] && MARCAS="$MARCAS $(basename "$(dirname "$f")")"; done
if [ -n "$MARCAS" ]; then ok "presets de marca:$MARCAS"; else ojo "sin presets de marca" "presets/README.md"; fi

echo
if [ "$FALTA" = 0 ]; then
  echo "Todo listo. Abrí la app con doble clic en «Editor IA» en el Escritorio (o: cd app && npm run editor → http://127.0.0.1:4321)"
else
  echo "Falta algo (✗). Arreglalo y volvé a correr: bash scripts/verificar.sh"
fi
exit $FALTA
