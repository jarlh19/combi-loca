// Pruebas de POST /api/puntajes con una D1 falsa que anota cada sentencia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/puntajes.js';
import { crearFicha } from '../lib/ranking.js';
import { sha256 } from '../lib/util.js';

const SECRETO = 'secreto-de-prueba-0123456789';
const IP = '181.65.12.34';

function d1Falsa({ recientes = 0 } = {}) {
  const anotadas = [];
  const sentencia = (sql) => ({
    sql, args: [],
    bind(...args) { this.args = args; return this; },
    async first() { anotadas.push(this); return { n: recientes }; },
    async run() { anotadas.push(this); return { meta: { changes: 1 } }; },
  });
  return { anotadas, prepare: (sql) => sentencia(sql), async batch(lista) { anotadas.push(...lista); return []; } };
}

async function pedido(secreto = SECRETO) {
  const ficha = await crearFicha(secreto, Date.now() - 92_000);
  return new Request('https://combi-loca.pages.dev/api/puntajes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': IP },
    body: JSON.stringify({ ficha, nombre: 'Jorge', puntaje: 12340, pasajeros: 40, duracionMs: 90_000 }),
  });
}

const insercion = (db) => db.anotadas.find((s) => s.sql.trim().startsWith('INSERT INTO puntajes'));

test('la IP se guarda con el secreto, no con el hash que se puede revertir', async () => {
  const db = d1Falsa();
  const r = await onRequestPost({ request: await pedido(), env: { DB: db, RUN_SECRET: SECRETO } });
  assert.equal(r.status, 200);
  const guardada = insercion(db).args[6];
  assert.notEqual(guardada, await sha256('combi:' + IP));
  assert.match(guardada, /^[0-9a-f]{64}$/);
});

test('con otro secreto la misma IP da otra huella', async () => {
  const a = d1Falsa(), b = d1Falsa();
  await onRequestPost({ request: await pedido('uno-uno-uno-uno'), env: { DB: a, RUN_SECRET: 'uno-uno-uno-uno' } });
  await onRequestPost({ request: await pedido('dos-dos-dos-dos'), env: { DB: b, RUN_SECRET: 'dos-dos-dos-dos' } });
  assert.notEqual(insercion(a).args[6], insercion(b).args[6]);
});

test('borra las huellas de más de un minuto, que ya no sirven para el límite', async () => {
  const db = d1Falsa();
  const antes = Date.now();
  await onRequestPost({ request: await pedido(), env: { DB: db, RUN_SECRET: SECRETO } });
  const limpieza = db.anotadas.find((s) => /^UPDATE puntajes SET ip = ''/.test(s.sql));
  assert.ok(limpieza, 'falta la limpieza de huellas viejas');
  const corte = limpieza.args[0];
  assert.ok(corte <= antes - 60_000 + 1000 && corte >= antes - 60_000 - 1000);
});

test('el límite de 6 puntajes por minuto sigue igual', async () => {
  const db = d1Falsa({ recientes: 6 });
  const r = await onRequestPost({ request: await pedido(), env: { DB: db, RUN_SECRET: SECRETO } });
  assert.equal(r.status, 429);
  assert.equal(insercion(db), undefined);
});
