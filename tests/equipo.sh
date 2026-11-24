#!/bin/bash
# Prueba el acceso del equipo con una config temporal (no toca ~/.editor-ia): modo red sin equipo, login,
# rutas protegidas, límite de gasto, roles, desactivar y frenado de intentos. uso: bash tests/equipo.sh
set -u
cd "$(dirname "$0")/.."
export EDITOR_CONFIG=$(mktemp -d)
PUERTO=4399; H=http://127.0.0.1:$PUERTO; LOG=$EDITOR_CONFIG/vite.log; MAL=0
parar() { pkill -f "vite --host 0.0.0.0 --port $PUERTO" 2>/dev/null; }
parar; trap 'parar; rm -rf "$EDITOR_CONFIG"' EXIT
chk() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "MAL  $1: esperaba $3, dio $2"; MAL=1; fi; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { curl -s -X POST -H 'Content-Type: application/json' "$@"; }

(cd app && timeout 20 npx vite --host 0.0.0.0 --port $PUERTO > "$LOG" 2>&1); chk "modo red sin equipo no arranca" "$(grep -c 'primero creá el equipo' "$LOG")" 1
EDITOR_CLAVE=clave-admin node scripts/equipo.mjs agregar "Admin Prueba" --usuario admin > /dev/null
EDITOR_CLAVE=clave-editor node scripts/equipo.mjs agregar "Editor Prueba" --usuario edi --limite 0 > /dev/null
(cd app && exec npx vite --host 0.0.0.0 --port $PUERTO > "$LOG" 2>&1) &
for i in $(seq 30); do curl -s -o /dev/null $H/ && break; sleep 1; done

R=$(pwd)
chk "API sin sesión" "$(codigo $H/api/proyectos)" 401
chk "videos sin sesión" "$(codigo $H/media/x/a.mp4)" 401
chk "archivos de proyectos por /@fs sin sesión" "$(codigo "$H/@fs$R/proyectos/x/proyecto.json")" 401
chk "salirse de la plantilla con ../" "$(codigo --path-as-is "$H/@fs$R/template/reel/src/../../../proyectos/x/proyecto.json")" 401
chk "la composición sí (para mostrar el login)" "$(codigo "$H/@fs$R/template/reel/src/Reel.jsx")" 200
chk "clave mala" "$(json -d '{"usuario":"admin","clave":"x"}' $H/api/sesion | grep -c incorrectos)" 1
J=$EDITOR_CONFIG/admin.txt; E=$EDITOR_CONFIG/edi.txt
json -c $J -d '{"usuario":"admin","clave":"clave-admin"}' $H/api/sesion > /dev/null
json -c $E -d '{"usuario":"edi","clave":"clave-editor"}' $H/api/sesion > /dev/null
chk "API con sesión" "$(codigo -b $J $H/api/proyectos)" 200
chk "editor no administra el equipo" "$(codigo -b $E $H/api/equipo)" 403
chk "límite mensual frena a Claude" "$(json -b $E -d '{"modo":"pedido","texto":"x"}' $H/api/claude/iniciar | grep -c 'límite del mes')" 1
json -b $J -d '{"activo":false}' $H/api/equipo/edi > /dev/null
chk "desactivado pierde la sesión" "$(codigo -b $E $H/api/proyectos)" 401
chk "no se puede quedar sin admin" "$(json -b $J -d '{"rol":"editor"}' $H/api/equipo/admin | grep -c 'al menos un admin')" 1
for i in 1 2 3 4 5; do json -d '{"usuario":"admin","clave":"x"}' $H/api/sesion > /dev/null; done
chk "frena tras 5 intentos" "$(json -d '{"usuario":"admin","clave":"clave-admin"}' $H/api/sesion | grep -c 'Demasiados')" 1
chk "registro sin claves" "$(grep -c 'clave-' "$EDITOR_CONFIG/registro.jsonl" "$EDITOR_CONFIG/equipo.json" | awk -F: '{s+=$2} END {print s}')" 0
[ $MAL = 0 ] && echo "OK: acceso del equipo" || { echo "FALLÓ"; exit 1; }
