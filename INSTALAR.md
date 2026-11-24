# Instalar el Editor IA

Una vez por compu, unos 15 minutos. Necesitás: acceso al repo en GitHub y la cuenta de Claude de la agencia.

Durante la instalación se abre el navegador **dos veces**: una para autorizar GitHub y otra para entrar a Claude.
Cuando la terminal pida una contraseña, es la de la compu (o la de Ubuntu en Windows): **no se ve mientras la escribís**, es normal.

## Mac

1. Abrí **Terminal** (⌘ + Espacio, escribí "Terminal", Enter).
2. Copiá este comando, pegalo en la Terminal y apretá Enter:

```bash
command -v brew >/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"; brew install gh && (gh auth status >/dev/null 2>&1 || gh auth login --web -h github.com -p https) && ([ -d ~/Editor-IA ] || gh repo clone holamarketingrrss/Editor-IA ~/Editor-IA) && bash ~/Editor-IA/instalar/mac.sh
```

3. Seguí lo que pida la pantalla (contraseña de la Mac, autorizar GitHub, entrar a Claude).
4. Al final aparece **Editor IA** en el Escritorio: doble clic y se abre la app.

## Windows

1. Tocá Inicio, escribí **PowerShell**, clic derecho → **Ejecutar como administrador**, y pegá:

```powershell
wsl --install
```

2. **Reiniciá** la compu.
3. Abrí **Ubuntu** desde el menú Inicio. La primera vez pide crear un usuario y una contraseña (los de Linux, pueden ser
   cualquiera; anotá la contraseña).
4. En esa ventana de Ubuntu pegá este comando y apretá Enter:

```bash
sudo apt-get update && sudo apt-get install -y gh git && (gh auth status >/dev/null 2>&1 || gh auth login --web -h github.com -p https) && ([ -d ~/Editor-IA ] || gh repo clone holamarketingrrss/Editor-IA ~/Editor-IA) && bash ~/Editor-IA/instalar/linux.sh
```

5. Seguí lo que pida la pantalla. Si no se abre el navegador solo, copiá el link y el código que aparecen y abrilos vos.
6. Al final aparece **Editor IA** en el Escritorio de Windows: doble clic y se abre la app.

## Usar la app

- Abrir: doble clic en **Editor IA** del Escritorio. Se abre el navegador en http://127.0.0.1:4321 (en Windows tarda
  unos segundos: si ves un error, recargá).
- Cerrar: cerrá la ventana negra de la terminal.
- Se actualiza sola: cada vez que la abrís trae los últimos cambios.

## Si algo no anda

Abrí Terminal (Mac) o Ubuntu (Windows) y pegá:

```bash
bash ~/Editor-IA/scripts/verificar.sh
```

Muestra ✓ lo que está bien y ✗ lo que falta, con cómo arreglarlo. Volver a pegar el comando de instalación también
sirve: instala solo lo que falta.

- **La pestaña Claude dice "Sin conectores"**: en claude.ai › Configuración › Conectores tienen que estar Notion,
  Google Drive y ElevenLabs. Si están, salí y volvé a entrar a Claude: `claude auth logout` y `claude auth login`.
- **GitHub dice que no tenés acceso al repo**: pedile a quien administra `holamarketingrrss` que te agregue.

---

Notas técnicas: los instaladores son `instalar/mac.sh` (Homebrew) e `instalar/linux.sh` (Ubuntu/Debian y WSL); el repo
queda en `~/Editor-IA`. Remotion es gratis hasta 3 personas en la empresa; con más hace falta su licencia (remotion.pro).
