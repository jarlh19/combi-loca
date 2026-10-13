import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFicha, leerFicha, nombreLimpio, revisarPuntaje, MAX_TASA, HOLGURA_MS } from '../lib/ranking.js';

const SECRETO = 'secreto-de-prueba-0123456789';

test('una ficha firmada se lee; una alterada o de otro secreto, no', async () => {
  const ficha = await crearFicha(SECRETO, 1_760_000_000_000, '0f8fad5b-d9cb-469f-a165-70867728950e');
  assert.deepEqual(await leerFicha(SECRETO, ficha), { id: '0f8fad5b-d9cb-469f-a165-70867728950e', inicio: 1_760_000_000_000 });
  assert.equal(await leerFicha('otro-secreto', ficha), null);
  const [id, , firma] = ficha.split('.');
  assert.equal(await leerFicha(SECRETO, `${id}.1700000000000.${firma}`), null);
  assert.equal(await leerFicha(SECRETO, 'basura'), null);
  assert.equal(await leerFicha(SECRETO, undefined), null);
});

test('nombres: se limpian, se aceptan los normales y se rechazan las groserías', () => {
  assert.equal(nombreLimpio('  Jorge   L.  '), 'Jorge L.');
  assert.equal(nombreLimpio('Ñaña_99'), 'Ñaña_99');
  assert.equal(nombreLimpio('María Vergara'), 'María Vergara');
  assert.equal(nombreLimpio('Nazira'), 'Nazira');
  assert.equal(nombreLimpio('x'), null);
  assert.equal(nombreLimpio('un nombre demasiado largo'), null);
  assert.equal(nombreLimpio('<script>'), null);
  assert.equal(nombreLimpio('P U T A'), null);
  assert.equal(nombreLimpio('mi3rd4'), null);
  assert.equal(nombreLimpio('el huevón'), null);
});

const inicio = 1_760_000_000_000;

test('un puntaje normal pasa', () => {
  assert.equal(revisarPuntaje({ puntaje: 12340, pasajeros: 40, duracionMs: 90_000 }, inicio, inicio + 92_000), null);
});

test('se rechazan los puntajes imposibles o mal formados', () => {
  const ok = { puntaje: 12340, pasajeros: 40, duracionMs: 90_000 };
  const a = (cambio, ahora = inicio + 92_000) => revisarPuntaje({ ...ok, ...cambio }, inicio, ahora);
  assert.equal(a({ puntaje: 12345 }), 'formato');
  assert.equal(a({ puntaje: -10 }), 'formato');
  assert.equal(a({ puntaje: '12340' }), 'formato');
  assert.equal(a({ duracionMs: 2_000 }), 'duracion');
  assert.equal(a({}, inicio + 90_000 - HOLGURA_MS - 1), 'reloj');
  assert.equal(a({ puntaje: MAX_TASA * 90 + 10 }), 'imposible');
  assert.equal(a({ pasajeros: 300 }), 'imposible');
  assert.equal(a({ puntaje: 100, pasajeros: 40 }), 'imposible');
  assert.equal(a({}, inicio + 2 * 3_600_000), 'vencida');
});
