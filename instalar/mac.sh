#!/bin/bash
# Instalador del Editor IA para Mac. Desde la carpeta del repo:  bash instalar/mac.sh
# Instala con Homebrew: Node 22, FFmpeg, Python, CMake, yt-dlp; después Claude Code, el kit (scripts/instalar.sh),
# un lanzador "Editor IA" en el Escritorio, y verifica todo. Se puede correr de nuevo sin problema.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
[ "$(uname -s)" = Darwin ] || { echo "Esto es para Mac. En Linux o Windows (WSL) usá instalar/linux.sh"; exit 1; }

if ! command -v brew >/dev/null; then
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do [ -x "$b" ] && eval "$("$b" shellenv)"; done
fi
if ! command -v brew >/dev/null; then
  echo "Falta Homebrew. Instalalo con este comando (te pide la contraseña de la Mac) y después volvé a correr este instalador:"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  exit 1
fi
xcode-select -p >/dev/null 2>&1 || { echo "Faltan las herramientas de línea de comandos de Apple: se abre el instalador. Al terminar, volvé a correr esto."; xcode-select --install; exit 1; }

echo "== Paquetes (Homebrew)"
brew install node@22 ffmpeg python cmake git yt-dlp pillow
NODE_BIN="$(brew --prefix node@22)/bin"
case ":$PATH:" in *":$NODE_BIN:"*) ;; *) export PATH="$NODE_BIN:$PATH"
  grep -q 'node@22/bin' ~/.zshrc 2>/dev/null || echo "export PATH=\"$NODE_BIN:\$PATH\"" >> ~/.zshrc ;; esac

echo "== Claude Code"
if ! command -v claude >/dev/null; then
  curl -fsSL https://claude.ai/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "== Kit de edición (whisper, Remotion, app) — puede tardar unos minutos"
bash scripts/instalar.sh

echo "== Lanzador en el Escritorio"
L="$HOME/Desktop/Editor IA.command"
cat > "$L" <<EOF
#!/bin/bash
# Abre la app del Editor IA (cerrá esta ventana para apagarla)
export PATH="$NODE_BIN:\$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:\$PATH"
cd "$REPO" && git pull -q --ff-only 2>/dev/null; cd "$REPO/app" && npm run editor
EOF
chmod +x "$L"
echo "  $L (doble clic para abrir la app)"

echo
bash scripts/verificar.sh || true
command -v claude >/dev/null && ! claude auth status --json 2>/dev/null | grep -q '"loggedIn": *true' \
  && echo && echo "Último paso: logueate en Claude Code con la cuenta de la agencia:  claude auth login"
exit 0
