# App de escritorio (Windows y Mac)

Ícono **Editor IA** en el escritorio. Al abrirla guía cada paso y después muestra el editor en su propia ventana:

1. **Cuenta de GitHub**: la primera vez abre github.com en el navegador con un código para autorizar. Cada vez que se
   abre (y cada 30 min) chequea que la persona siga siendo **colaboradora** del repo `holamarketingrrss/Editor-IA`.
   Sin conexión vale el último chequeo bueno por 7 días.
2. **Windows**: prepara WSL con Ubuntu (una vez, con permiso de administrador y un reinicio).
3. **Editor**: lo baja la primera vez y se actualiza solo en cada apertura.
4. **Herramientas**: la primera vez abre una terminal con el instalador (`instalar/mac.sh` o `instalar/linux.sh`).
5. **Claude**: chequea la sesión de Claude Code con la cuenta de la agencia; si falta, abre el login.
6. **Editor** en http://127.0.0.1:4321, adentro de la ventana.

## Dar y quitar acceso
- **Dar**: GitHub › repo `Editor-IA` › Settings › Collaborators › *Add people* (rol **Read** alcanza). La persona necesita
  una cuenta de GitHub (gratis).
- **Quitar**: en el mismo lugar, *Remove*. La próxima vez que abra la app (o en menos de 30 min si la tiene abierta) queda
  bloqueada y deja de recibir actualizaciones. Además: sacarle Drive y Notion, y cambiar la clave de Claude si la conocía.

## Instaladores
Se arman en GitHub (gratis): pestaña **Actions** › **App de escritorio** › **Run workflow** (con una versión, p. ej.
`1.0.0`, quedan publicados en **Releases** para pasar el link al equipo). Salen `Editor-IA-Instalador-x.y.z.exe` (Windows)
y `Editor-IA-x.y.z-arm64.dmg` / `-x64.dmg` (Mac con chip Apple o Intel).

No están firmados (firmar cuesta: Apple US$ 99/año, Windows un certificado aparte), así que la primera vez:
- **Windows**: si aparece "Windows protegió su PC", *Más información* › *Ejecutar de todas formas*.
- **Mac**: arrastrá Editor IA a Aplicaciones; la primera vez, clic derecho › *Abrir* › *Abrir*. Si dice que "está dañado",
  en Terminal: `xattr -cr "/Applications/Editor IA.app"` y volvé a abrirla.

## Desarrollo
`acceso.js` (login y chequeo, se prueba sin GitHub con fetch simulado), `main.js` (pasos, terminales, servidor del editor),
`inicio.html` (pantalla de pasos), `build/icon.png` (ícono; electron-builder arma .ico e .icns). Probar: `npm install` y
`npm run app`. La OAuth App "Editor IA" (Client ID en `acceso.js`, no es secreto) tiene *Device Flow* activado.
