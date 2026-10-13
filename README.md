# Combi Loca

**¿Cuánto recaudas antes de chocar?** Manejas una combi por Lima: esquivas buses, mototaxis, huecos y conos, te cierras en los paraderos para subir pasajeros y juntas sencillo. Cada vez va más rápido. Tres papeletas y al depósito.

Hecho para el reto *Vibecodea un juego* de [Hack the Andes](https://hacktheandes.com/game) (Lima, octubre de 2026).

## Cómo se juega

- Toca el lado izquierdo o derecho de la pantalla para cambiar de carril (en la compu, las flechas o A y D).
- En los paraderos, la franja amarilla marca el carril derecho: si pasas por ahí, suben todos y cada uno paga. Si no fallas ninguno, el combo sube hasta x3.
- El **corredor** (flecha verde) te da unos segundos de turbo: lo que choques sale volando. El **emoliente** te devuelve una vida.
- Al final puedes entrar al **ranking** con tu nombre y compartir tu resultado.

## Una pista que siempre deja salida

La pista se arma sola, pero con dos reglas que las pruebas revisan en miles de filas:

1. Nunca se tapan los tres carriles, y siempre hay un camino moviéndose de a un carril por fila.
2. Entre una fila y la siguiente quedan al menos 0.3 s para cambiar de carril, también a velocidad máxima.

Además, un chofer automático juega 20 partidas de 3 minutos sin chocar.

## El ranking

Corre en Cloudflare Pages Functions con D1. Al arrancar, el juego pide una ficha firmada (HMAC) y la manda con el puntaje. El servidor rechaza fichas falsas o repetidas, partidas que dicen durar más de lo que pasó de verdad, puntajes que el juego no puede dar y nombres con groserías. También limita los envíos por IP, que se guarda solo como hash. Lo que no puede frenar es a alguien que juegue con un bot: para un ranking de evento es suficiente.

## Correrlo en local

```bash
npm install
npm run db:local
```

Crea `.dev.vars` con una línea `RUN_SECRET=<texto largo al azar>` y luego:

```bash
npm run dev
```

Se abre en http://127.0.0.1:5197.

## Pruebas

```bash
npm test
```

## Publicarlo

```bash
npx wrangler d1 create combi-loca
```

Copia el `database_id` en `wrangler.toml` y sigue con:

```bash
npm run db:remoto
npx wrangler pages project create combi-loca --production-branch main
npx wrangler pages secret put RUN_SECRET --project-name combi-loca
npm run deploy
```

## Estructura

- `public/js/motor.js`: las reglas de la pista. No dibuja nada, por eso las pruebas pueden jugar solas.
- `public/js/dibujo.js`: el canvas y los efectos.
- `public/js/sonido.js`: sonidos y la radio (tecno, reggaetón, cumbia, salsa y rock), sintetizados con Web Audio. La música es original: sin samples ni melodías de canciones existentes.
- `public/js/juego.js`: pantallas, control y ranking.
- `functions/api/`: `partida` (ficha) y `puntajes` (ranking).
- `lib/ranking.js`: fichas firmadas y reglas para aceptar un puntaje.
- `schema.sql`: la tabla del ranking.
- `assets/og.svg`: fuente de la imagen para redes (`public/og.png`).

## Licencia

MIT. Hecho por Jorge Laban.
