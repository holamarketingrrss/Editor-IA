#!/bin/bash
# Instalador del Editor IA para Linux (Ubuntu/Debian) y para Windows dentro de WSL (Ubuntu).
# Desde la carpeta del repo:  bash instalar/linux.sh
# Instala: FFmpeg, Python, CMake, compiladores, Node 22 (NodeSource), Claude Code, el kit (scripts/instalar.sh)
# y verifica todo. En WSL además deja "Editor IA.bat" en el Escritorio de Windows. Se puede correr de nuevo.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
command -v apt-get >/dev/null || { echo "Este instalador es para Ubuntu/Debian (o WSL con Ubuntu)."; exit 1; }
sudo_si() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }
if grep -qi microsoft /proc/version 2>/dev/null; then WSL=1; else WSL=0; fi
case "$REPO" in /mnt/*) echo "AVISO: el repo está en el disco de Windows ($REPO): va muy lento. Clonalo dentro de Ubuntu (ej. ~/Editor-IA).";; esac

echo "== Paquetes del sistema"
sudo_si apt-get update -qq
sudo_si apt-get install -y -qq ffmpeg python3 python3-pip python3-pil cmake build-essential git curl ca-certificates

V=$(node -v 2>/dev/null | sed 's/v//;s/\..*//')
if [ -z "$V" ] || [ "$V" -lt 20 ]; then
  echo "== Node 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo_si bash - >/dev/null
  sudo_si apt-get install -y -qq nodejs
fi
# las librerías que necesita el navegador de Remotion para renderizar
sudo_si apt-get install -y -qq libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 2>/dev/null \
  || sudo_si apt-get install -y -qq libnss3 libgbm1 libasound2 2>/dev/null || true

echo "== Claude Code"
if ! command -v claude >/dev/null; then
  curl -fsSL https://claude.ai/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
  grep -q '.local/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
fi

echo "== Kit de edición (whisper, Remotion, app) — puede tardar unos minutos"
bash scripts/instalar.sh

if [ "$WSL" = 1 ] && command -v cmd.exe >/dev/null; then
  echo "== Lanzador en el Escritorio de Windows"
  ESC=$(wslpath "$(cmd.exe /c 'echo %USERPROFILE%\Desktop' 2>/dev/null | tr -d '\r')" 2>/dev/null || true)
  DISTRO=${WSL_DISTRO_NAME:-Ubuntu}
  if [ -n "$ESC" ] && [ -d "$ESC" ]; then
    printf '@echo off\r\nrem Abre la app del Editor IA. Para apagarla, cerrá la ventana negra "Editor IA".\r\nstart "Editor IA" wsl -d %s -- bash -lc "cd %s && git pull -q --ff-only; cd app && npm run dev"\r\ntimeout /t 8 /nobreak >nul\r\nstart "" http://127.0.0.1:4321\r\n' "$DISTRO" "$REPO" > "$ESC/Editor IA.bat"
    echo "  Escritorio\\Editor IA.bat (doble clic para abrir la app)"
  else
    echo "  No encontré el Escritorio de Windows: abrí la app con  cd $REPO/app && npm run dev  y entrá a http://127.0.0.1:4321"
  fi
fi

echo
bash scripts/verificar.sh || true
command -v claude >/dev/null && ! claude auth status --json 2>/dev/null | grep -q '"loggedIn": *true' \
  && echo && echo "Último paso: logueate en Claude Code con la cuenta de la agencia:  claude auth login"
exit 0
