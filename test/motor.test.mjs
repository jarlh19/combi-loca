import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nuevaPartida, avanzar, mover, aleatorio, centroCarril, TARIFA, COMBO_MAX, VIDAS, COMBI, REACCION_S,
  TIPOS, INVULNERABLE_S,
} from '../public/js/motor.js';
import { MAX_TASA } from '../lib/ranking.js';
import { conducir } from './bot.mjs';

const DT = 1 / 60;

function jugar(semilla, segundos, { bot = true, vidas = VIDAS } = {}) {
  const azar = aleatorio(semilla);
  const e = nuevaPartida(700);
  e.vidas = vidas;
  const eventos = [];
  for (let i = 0; i < segundos * 60 && !e.terminado; i++) {
    if (bot) conducir(e);
    for (const ev of avanzar(e, DT, azar)) eventos.push({ ...ev, t: e.t });
  }
  return { e, eventos };
}

test('ninguna fila tapa los tres carriles y siempre hay un camino de un carril por fila', () => {
  for (let s = 1; s <= 30; s++) {
    const { e } = jugar(s, 240, { bot: false, vidas: Infinity });
    let posibles = new Set([0, 1, 2]);
    for (const f of e.filas) {
      assert.ok(f.libres.length >= 1, `semilla ${s}: fila sin salida`);
      if (f.conParadero) assert.ok(f.libres.includes(2), `semilla ${s}: paradero con el carril derecho tapado`);
      posibles = new Set(f.libres.filter((c) => [...posibles].some((p) => Math.abs(p - c) <= 1)));
      assert.ok(posibles.size > 0, `semilla ${s}: no se puede llegar a ningún carril libre`);
    }
  }
});

test('entre dos filas siempre quedan al menos 0.3 s para cambiar de carril', () => {
  for (let s = 1; s <= 30; s++) {
    const { e } = jugar(s, 240, { bot: false, vidas: Infinity });
    for (let i = 1; i < e.filas.length; i++) {
      const a = e.filas[i - 1];
      const b = e.filas[i];
      if (a.turbo || b.turbo) continue; // con turbo no se choca
      const hueco = a.separacion - (a.alto + b.alto) / 2 - COMBI.h;
      assert.ok(hueco / b.velocidad >= REACCION_S - 0.02, `semilla ${s}, fila ${i}: ${(hueco / b.velocidad).toFixed(2)} s`);
    }
  }
});

test('un chofer atento llega a 3 minutos sin chocar', () => {
  for (let s = 1; s <= 20; s++) {
    const { eventos } = jugar(s, 180, { vidas: Infinity });
    const choques = eventos.filter((ev) => ev.tipo === 'choque');
    assert.equal(choques.length, 0, `semilla ${s}: chocó a los ${choques[0]?.t.toFixed(1)} s`);
  }
});

test('lo que gana un chofer muy bueno queda lejos del tope del ranking', () => {
  for (let s = 1; s <= 20; s++) {
    const { e } = jugar(s, 180, { vidas: Infinity });
    assert.ok(e.recaudado / e.t < MAX_TASA / 2, `semilla ${s}: ${(e.recaudado / e.t).toFixed(0)} céntimos por segundo`);
    assert.ok(e.recaudado >= e.pasajeros * 50);
  }
});

test('todo lo que se cobra es múltiplo de 10 céntimos', () => {
  for (let s = 1; s <= 10; s++) {
    const { e, eventos } = jugar(s, 120, { vidas: Infinity });
    assert.equal(e.recaudado % 10, 0);
    for (const ev of eventos) if (ev.monto !== undefined) assert.equal(ev.monto % 10, 0, JSON.stringify(ev));
  }
});

test('subir pasajeros cobra la tarifa de cada uno por el combo, y el combo tiene tope', () => {
  const e = nuevaPartida(700);
  e.porRecorrer = 1e9;
  e.carril = 2;
  e.x = centroCarril(2);
  const azar = aleatorio(1);
  const montos = [];
  for (let i = 0; i < 5; i++) {
    e.paraderos.push({ y: e.yCombi - 8, gente: ['adulto', 'escolar'], estado: 'espera' });
    const ev = avanzar(e, DT, azar).find((x) => x.tipo === 'sube');
    montos.push(ev.monto);
  }
  const una = TARIFA.adulto + TARIFA.escolar;
  assert.deepEqual(montos, [una, una * 2, una * 3, una * COMBO_MAX, una * COMBO_MAX]);
  assert.equal(e.pasajeros, 10);
});

test('dejar un paradero o chocar corta el combo', () => {
  const e = nuevaPartida(700);
  e.porRecorrer = 1e9;
  const azar = aleatorio(2);
  e.racha = 3;
  e.combo = 3;
  e.carril = 0;
  e.x = centroCarril(0);
  e.paraderos.push({ y: e.yCombi - 5, gente: ['adulto'], estado: 'espera' });
  assert.ok(avanzar(e, DT, azar).some((x) => x.tipo === 'dejado'));
  assert.equal(e.combo, 1);

  e.racha = 2;
  e.combo = 2;
  e.objetos.push({ tipo: 'auto', carril: 0, x: centroCarril(0), y: e.yCombi - 10, ...TIPOS.auto, fuera: false });
  const ev = avanzar(e, DT, azar).find((x) => x.tipo === 'choque');
  assert.ok(ev);
  assert.equal(e.combo, 1);
  assert.equal(e.vidas, VIDAS - 1);
  assert.ok(e.invulnerable > INVULNERABLE_S - 0.1);
});

test('con turbo los obstáculos salen volando y no quitan vidas', () => {
  const e = nuevaPartida(700);
  e.porRecorrer = 1e9;
  e.turbo = 2;
  e.objetos.push({ tipo: 'bus', carril: 1, x: centroCarril(1), y: e.yCombi - 10, ...TIPOS.bus, fuera: false });
  const ev = avanzar(e, DT, aleatorio(3));
  assert.ok(ev.some((x) => x.tipo === 'atropello'));
  assert.equal(e.vidas, VIDAS);
});

test('sin vidas se acaba la partida y ya no avanza', () => {
  const { e, eventos } = jugar(7, 600, { bot: false });
  assert.ok(e.terminado);
  assert.equal(eventos.filter((x) => x.tipo === 'fin').length, 1);
  const t = e.t;
  avanzar(e, DT, aleatorio(1));
  assert.equal(e.t, t);
  mover(e, 1);
});

test('el carril no se sale de la pista', () => {
  const e = nuevaPartida(700);
  for (let i = 0; i < 5; i++) mover(e, -1);
  assert.equal(e.carril, 0);
  for (let i = 0; i < 5; i++) mover(e, 1);
  assert.equal(e.carril, 2);
});
