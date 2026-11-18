Material: un solo archivo de 37 min (4K vertical, 17 GB) en Drive. Para no bajarlo entero:
1. `parse.py moov.bin` lee el índice del MP4 (moov, al principio del archivo) y arma `audio_index.json`.
2. `fetch_audio.py` baja solo los fragmentos de audio por rango (≈71 MB); `adts.py` los junta en un AAC → whisper.
3. `vindex.py` + `seg_get.sh t0 t1 raw/src.mp4` bajan solo los bytes de video de cada tramo elegido dentro de un
   archivo disperso del tamaño original (moov + rangos), que FFmpeg lee como si fuera el archivo completo.
Pregunta "Mariett's in five years": 18:46 (1126 s); respuesta hasta ~26:12 (1572 s). Corren desde una carpeta de trabajo.
