# Acceso del equipo

El editor se puede usar de dos maneras, y las dos se combinan:

| | **En cada compu** (`npm run editor`) | **Compu del equipo** (`npm run equipo`) |
|---|---|---|
| Dónde corre | En la compu de cada persona | En una sola compu prendida (oficina o servidor) |
| Cómo se entra | `localhost:4321` en esa compu | Desde el navegador de cualquier compu, con usuario y clave |
| Sin internet | Sí: textos, tomas, audio, estilo y exportar andan sin conexión. Claude, Drive y Notion necesitan internet. | No, hay que llegar a esa compu |
| Material y proyectos | Quedan en esa compu | Quedan todos juntos en la compu del equipo |
| Claude | El de quien esté logueado en esa compu | El de la compu del equipo, para todos |

## Quién entra: usuarios, roles y límites

Mientras no haya equipo configurado, la app no pide login, como hasta ahora. Cuando agregás a la primera persona,
la app empieza a pedir usuario y clave en todas las compus que la abran.

```bash
node scripts/equipo.mjs agregar "Nombre Apellido" --admin      # la primera vez (pide la clave)
```

Después se administra desde la app: botón de personas (arriba a la derecha) › **Equipo**. También se puede con
`node scripts/equipo.mjs` (`lista`, `agregar`, `clave`, `desactivar`, `activar`, `quitar`, `limite`, `motor`, `uso`).

- **Roles:** *editor* hace pedidos, cambios, retoques y exporta. *Admin* además administra el equipo y ve el uso de todos.
- **Desactivar** saca a la persona en el momento: se le cierra la sesión y no puede volver a entrar. Su historial queda.
- **Límite por mes (US$):** cuando alguien llega a su límite, Claude no le toma más pedidos ese mes (los retoques a mano
  siguen andando). Sin límite, el campo queda vacío.
- **Registro:** quién entró (y los intentos con clave mala), quién pidió qué, en qué proyecto, cuánto costó y quién
  exportó. Se ve en la pantalla Equipo (últimos 30 días); el registro completo queda en `~/.editor-ia/registro.jsonl`.
- **Claves:** se guardan cifradas (scrypt) en `~/.editor-ia/equipo.json`, fuera del repo: no se suben a GitHub.
  Después de 5 intentos fallidos, la app frena un minuto. La sesión dura 12 horas.

## Con qué paga Claude: el motor

Se elige en Equipo › *Motor de Claude*:

- **Cuenta de Claude de esta compu** (como hasta ahora): usa el login de claude.ai de la compu y sus conectores
  (Notion, Drive, ElevenLabs). No se cobra aparte, pero consume el límite del plan de esa cuenta. El "costo" que muestra
  la app es lo que habría costado en la API y sirve para repartir el plan.
- **Clave de API de la agencia:** cada pedido se cobra por uso y el límite mensual de la app corta el gasto de verdad.
  La clave va en `~/.editor-ia/anthropic.key` (o en la variable `ANTHROPIC_API_KEY`), nunca en el repo.
  **Ojo:** con clave de API no cargan los conectores de claude.ai. Para usarla en pedidos completos, Notion, Drive y
  ElevenLabs tienen que conectarse aparte, con sus propias claves. Sin eso, el motor API sirve para *cambios* sobre
  proyectos que ya tienen su material bajado.

Referencia medida: un pedido completo con Sonnet costó entre US$ 0,11 y 0,21; con Opus, alrededor de US$ 1,60–1,80.

## Usarla desde afuera de la oficina

No abras el puerto del router a internet. Lo recomendado es **Tailscale**: arma una red privada entre las compus del
equipo, y solo entran las que vos agregás.

1. Instalá Tailscale en la compu del equipo y en las de cada persona, con la misma cuenta de la agencia.
2. En la compu del equipo, corré `cd app && npm run equipo`.
3. Desde cualquier otra compu, entrá a `http://<nombre-de-la-compu>.<tu-red>.ts.net:4321`, o a su IP de Tailscale
   con el puerto 4321.

Para entrar con otro nombre de host, sumalo en la variable `EDITOR_HOSTS` (separados por coma). Las IP y
`*.ts.net` ya están permitidos.

## Límites a tener en cuenta

- **Claude trabaja en un pedido a la vez por compu.** Si alguien pide algo mientras Claude trabaja, la app le avisa para
  quién está trabajando. A 20 reels por semana alcanza; si se queda corto, se puede poner otra compu del equipo.
- **Dos personas en el mismo proyecto:** gana lo último que se aplicó. Repartan los proyectos por persona.
- **Remotion** (el motor de render) es gratis para equipos de hasta 3 personas. Con más gente usando el editor,
  necesita licencia de empresa (remotion.pro).
- **Planes de claude.ai:** son personales. Si varias personas van a usar el motor *cuenta* de una misma compu del
  equipo, revisen que el plan lo permita. Si no, usen el motor API o una cuenta por persona en su propia compu.
