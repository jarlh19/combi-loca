// Un chofer automático: mira dos filas adelante y cambia de carril de a uno, solo si el carril vecino
// está despejado. Sirve para probar que la pista siempre deja salida a alguien que juega bien.
import { COMBI, CARRILES, mover } from '../public/js/motor.js';

const RECOGIBLES = new Set(['moneda', 'turbo', 'emoliente']);

function filasAdelante(e, frente) {
  const filas = new Map();
  for (const o of e.objetos) {
    if (o.fuera || RECOGIBLES.has(o.tipo) || o.y + o.h / 2 > frente) continue;
    const clave = Math.round(o.y);
    const fila = filas.get(clave) || { y: o.y, bloque: new Set() };
    fila.bloque.add(o.carril);
    filas.set(clave, fila);
  }
  return [...filas.values()].sort((a, b) => b.y - a.y);
}

export function conducir(e, { buscaParaderos = true } = {}) {
  const margen = e.velocidad * 0.12;
  const frente = e.yCombi - COMBI.h / 2 - margen;
  const fondo = e.yCombi + COMBI.h / 2 + 4;
  const ocupado = (c) => e.objetos.some((o) =>
    !o.fuera && !RECOGIBLES.has(o.tipo) && o.carril === c && o.y + o.h / 2 > frente && o.y - o.h / 2 < fondo);

  const [f1, f2] = filasAdelante(e, frente);
  const libre = (f, c) => !f || !f.bloque.has(c);
  const libres2 = [...Array(CARRILES).keys()].filter((c) => libre(f2, c));
  const paradero = buscaParaderos && e.paraderos.some((p) => p.estado === 'espera' && p.y < e.yCombi && p.y > e.yCombi - 500);
  const puntaje = (c) => {
    const cerca = libres2.length ? Math.min(...libres2.map((l) => Math.abs(l - c))) : 0;
    return 10 - 4 * cerca - Math.abs(c - e.carril) * 0.5 + (paradero && c === 2 && libre(f2, 2) ? 3 : 0);
  };
  const candidatos = [...Array(CARRILES).keys()].filter((c) => libre(f1, c));
  let meta = candidatos.sort((a, b) => puntaje(b) - puntaje(a))[0] ?? e.carril;
  if (ocupado(e.carril)) meta = [e.carril - 1, e.carril + 1].find((c) => c >= 0 && c < CARRILES && !ocupado(c)) ?? meta;

  const paso = Math.sign(meta - e.carril);
  if (paso && !ocupado(e.carril + paso)) mover(e, paso);
  return meta;
}
