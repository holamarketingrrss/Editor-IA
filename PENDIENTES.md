# Pendientes del editor

1. **Plantilla reutilizable:** `brand.json` generado desde `tokens.json` del design system, carpeta `template/` genérica y `scripts/nuevo_proyecto.sh <cliente> <tema>`.
2. **Render y entrega:** `scripts/render.sh` con Remotion, `loudnorm` a -14 LUFS / -1,5 dBTP, H.264 a 30 fps y nombre `MARCA_Tema_Formato_vN.mp4`.
3. **Chequeo de calidad:** `scripts/stills.sh` para ver frames de palabras clave, más un chequeo de zona segura 9:16 (220 px arriba, 420 px abajo).
4. **Voz y audio:** unir guion → ElevenLabs → `words.json` en un solo comando, y verificar que el conector esté autorizado en la cuenta nueva.
5. **Entrega a Drive:** decidir qué hacer con el límite de ~3 MB (hoy el video sale por el chat y se sube a mano).
6. **Higiene del repo:** aclarar cuál es el vigente entre `catalogo.tsv` y `catalogo_v1.tsv`, limpiar `tests/`, crear `.claude/settings.json` con permisos y escribir un `README` con un pedido de ejemplo.
7. **Validación real:** probar el flujo completo con un segundo cliente de otra marca.
8. **App local:** convertir el editor en una app que corra en `localhost`, para editar rápido con presets y cambios pequeños (ediciones básicas).

## Notas sobre el punto 8

- Depende de los puntos 1 a 3: la app sería una interfaz sobre `brand.json` (presets de marca), `render.sh` (exportar) y `stills.sh` (previsualizar).
- Base probable: Remotion Studio (ya corre en localhost, con vista previa en vivo), con controles para recortar, cambiar texto y subtítulos, colores, reemplazar un clip, ajustar volumen y exportar con un clic.
- A definir: qué ediciones entran en "básicas" y si la usa solo el equipo o también los clientes.
