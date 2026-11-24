# Instalar el Editor IA en una compu del equipo

Una vez por compu, unos 15 minutos (casi todo es descarga). Hace falta acceso al repo de GitHub
`holamarketingrrss/Editor-IA` y la cuenta de Claude de la agencia.

## Mac

1. Abrí la app **Terminal**.
2. Si no tenés Homebrew, instalalo (te pide la contraseña de la Mac):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Bajá el repo (GitHub pide usuario y un token como contraseña):
   ```bash
   git clone https://github.com/holamarketingrrss/Editor-IA.git ~/Editor-IA
   ```
4. Instalá todo:
   ```bash
   bash ~/Editor-IA/instalar/mac.sh
   ```
   Instala Node, FFmpeg, Python, whisper, Remotion, la app y Claude Code, deja **Editor IA** en el Escritorio y
   termina con una verificación (todo en ✓).

## Windows

Se usa WSL: un Ubuntu dentro de Windows, para correr exactamente lo mismo que en Mac.

1. Abrí **PowerShell como administrador** (clic derecho → Ejecutar como administrador).
2. Bajá el instalador y corrélo:
   ```powershell
   curl.exe -L -o "$env:TEMP\editor-ia.ps1" https://raw.githubusercontent.com/holamarketingrrss/Editor-IA/HEAD/instalar/windows.ps1
   ```
   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:TEMP\editor-ia.ps1"
   ```
   Como el repo es privado, si el primer comando no baja nada, copiá `instalar/windows.ps1` desde GitHub a mano.
3. La primera vez instala WSL y pide **reiniciar**. Después abrí **Ubuntu** desde el menú Inicio, creá tu usuario y
   contraseña de Linux, y volvé a correr el paso 2. Clona el repo dentro de Ubuntu (`~/Editor-IA`), instala todo y deja
   **Editor IA** en el Escritorio.

## Primer uso (Mac y Windows)

1. Logueate en Claude Code con la **cuenta de la agencia** (en Windows, dentro de la ventana de Ubuntu):
   ```bash
   claude auth login
   ```
   Tiene que ser el login de claude.ai, no una API key: así Claude usa los conectores de la cuenta (Notion, Google
   Drive, ElevenLabs) y el plan de la agencia.
2. Abrí `claude` una vez dentro de la carpeta del repo, aceptá el aviso de confianza y salí con `/exit`:
   ```bash
   cd ~/Editor-IA && claude
   ```
3. Doble clic en **Editor IA** en el Escritorio: abre la app en http://127.0.0.1:4321. Para apagarla, cerrá la ventana
   de la terminal.

El lanzador trae los cambios del repo cada vez que abre la app (`git pull`).

## Si algo falla

- `bash scripts/verificar.sh` (en la carpeta del repo) dice qué falta y cómo arreglarlo, sin gastar uso de Claude.
- **"Sin conectores de claude.ai"** en la pestaña Claude: Claude Code está logueado con API key o con otra cuenta.
  Corré `claude auth logout` y `claude auth login`, y revisá en claude.ai › Configuración › Conectores que estén
  Notion, Google Drive y ElevenLabs.
- **Windows, la app no abre en el navegador:** esperá unos segundos y recargá http://127.0.0.1:4321 (la primera vez tarda).
- **Windows, todo muy lento:** el repo tiene que estar dentro de Ubuntu (`~/Editor-IA`), no en `C:\`.
- Los instaladores se pueden correr de nuevo cuando quieras: instalan solo lo que falta.

Licencia: Remotion es gratis hasta 3 personas en la empresa; con más, hace falta su licencia de empresa (remotion.pro).
