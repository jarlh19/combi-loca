// Combi Loca: las reglas de la pista. Aquí no se dibuja nada, así las pruebas pueden jugar solas.
//
// Coordenadas lógicas: 360 de ancho, el alto depende de la pantalla. La pista avanza hacia abajo;
// todo lo que está en la pista (autos, huecos, monedas, paraderos) se mueve a la misma velocidad,
// así una fila nunca alcanza a otra y la separación entre filas es la que decide la dificultad.

export const ANCHO = 360;
export const VEREDA_IZQ = 34;
export const VEREDA_DER = 62;
export const CARRILES = 3;
export const ANCHO_CARRIL = (ANCHO - VEREDA_IZQ - VEREDA_DER) / CARRILES;
export const centroCarril = (c) => VEREDA_IZQ + ANCHO_CARRIL * (c + 0.5);

export const COMBI = { w: 44, h: 84 };
export const VIDAS = 3;
export const V0 = 250;
export const ACEL = 6;
export const VMAX = 680;
export const TURBO_S = 4;
export const TURBO_X = 1.45;
export const INVULNERABLE_S = 1.4;
export const COMBO_MAX = 3;
export const TARIFA = { escolar: 50, universitario: 100, adulto: 150 };
export const Y_NACE = -150;

export const TIPOS = {
  auto: { w: 40, h: 70 },
  bus: { w: 50, h: 128 },
  mototaxi: { w: 34, h: 48 },
  hueco: { w: 52, h: 34 },
  conos: { w: 60, h: 26 },
  moneda: { w: 24, h: 24, recoge: true },
  turbo: { w: 34, h: 34, recoge: true },
  emoliente: { w: 28, h: 34, recoge: true },
};
const OBSTACULOS = ['auto', 'auto', 'bus', 'mototaxi', 'mototaxi', 'hueco', 'conos'];

export function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const elegir = (azar, lista) => lista[Math.floor(azar() * lista.length)];

export function nuevaPartida(alto) {
  return {
    alto,
    yCombi: alto - 130,
    t: 0,
    velocidad: V0,
    distancia: 0,
    carril: 1,
    x: centroCarril(1),
    vidas: VIDAS,
    invulnerable: 0,
    turbo: 0,
    recaudado: 0,
    pasajeros: 0,
    racha: 0,
    combo: 1,
    objetos: [],
    paraderos: [],
    porRecorrer: 260,
    filasHastaParadero: 1,
    alcanzables: [0, 1, 2],
    filas: [],
    terminado: false,
  };
}

export function mover(e, dir) {
  if (e.terminado) return;
  e.carril = Math.max(0, Math.min(CARRILES - 1, e.carril + dir));
}

export const dificultad = (t) => Math.min(1, t / 90);

// ---------- filas ----------

function subconjuntos(n) {
  const out = [];
  if (n === 0) return [[]];
  for (let a = 0; a < CARRILES; a++) {
    if (n === 1) out.push([a]);
    else for (let b = a + 1; b < CARRILES; b++) out.push([a, b]);
  }
  return out;
}

// Carriles a los que alguien pudo llegar moviéndose de a uno entre fila y fila.
// Cada fila nueva deja libre por lo menos uno de esos o un vecino, así nunca hace falta saltar dos.
const vecinos = (libres, alcanzables) => libres.filter((c) => alcanzables.some((a) => Math.abs(a - c) <= 1));

export function planearFila(e, azar) {
  const d = dificultad(e.t);
  const conParadero = e.filasHastaParadero <= 0;
  let bloqueados = e.t < 5 ? 1 : azar() < 0.2 + 0.5 * d ? 2 : 1;
  let opciones = [];
  while (bloqueados >= 0) {
    opciones = subconjuntos(bloqueados).filter((b) => {
      const libres = [0, 1, 2].filter((c) => !b.includes(c));
      if (conParadero && b.includes(2)) return false;
      return vecinos(libres, e.alcanzables).length > 0;
    });
    if (opciones.length) break;
    bloqueados -= 1;
  }
  const bloque = elegir(azar, opciones);
  const libres = [0, 1, 2].filter((c) => !bloque.includes(c));
  return { bloque, libres, conParadero };
}

// Distancia hasta la próxima fila: la de la dificultad, pero nunca menos de lo que deja
// 0.3 s entre el fin de esta fila y el comienzo de la siguiente para cambiar de carril.
export const REACCION_S = 0.3;
export function separacion(e, altoFila) {
  const base = 430 - 200 * dificultad(e.t);
  const holgura = (altoFila + TIPOS.bus.h) / 2 + COMBI.h + e.velocidad * REACCION_S;
  return Math.max(base, holgura);
}

function nacer(e, tipo, carril, y) {
  e.objetos.push({ tipo, carril, x: centroCarril(carril), y, ...TIPOS[tipo], fuera: false, color: e.objetos.length % 5 });
}

function generarFila(e, azar, y) {
  const plan = planearFila(e, azar);
  let altoFila = 0;
  for (const c of plan.bloque) {
    const tipo = elegir(azar, OBSTACULOS);
    nacer(e, tipo, c, y);
    altoFila = Math.max(altoFila, TIPOS[tipo].h);
  }

  const premio = azar();
  const carrilPremio = elegir(azar, plan.libres);
  if (premio < 0.05) nacer(e, 'turbo', carrilPremio, y);
  else if (premio < 0.08 && e.vidas < VIDAS) nacer(e, 'emoliente', carrilPremio, y);
  else if (premio < 0.6) for (let i = 0; i < 3; i++) nacer(e, 'moneda', carrilPremio, y - i * 40);

  if (plan.conParadero) {
    const gente = Array.from({ length: 1 + Math.floor(azar() * 4) }, () => {
      const r = azar();
      return r < 0.5 ? 'adulto' : r < 0.8 ? 'universitario' : 'escolar';
    });
    e.paraderos.push({ y, gente, estado: 'espera' });
    e.filasHastaParadero = 2 + Math.floor(azar() * 3);
  } else {
    e.filasHastaParadero -= 1;
  }
  e.alcanzables = vecinos(plan.libres, e.alcanzables);
  const sep = separacion(e, altoFila);
  // Historial corto de filas, para las pruebas de que siempre hay salida.
  e.filas.push({
    libres: plan.libres, conParadero: plan.conParadero, alto: altoFila, separacion: sep,
    velocidad: e.velocidad, turbo: e.turbo > 0,
  });
  if (e.filas.length > 400) e.filas.shift();
  return sep;
}

// ---------- un paso del juego ----------

const choca = (a, b, margen) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w - margen * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h - margen * 2;

export const enCarrilDerecho = (e) => Math.abs(e.x - centroCarril(2)) < ANCHO_CARRIL / 2;

// Devuelve lo que pasó en este paso, para el dibujo y el sonido.
export function avanzar(e, dt, azar) {
  const eventos = [];
  if (e.terminado) return eventos;
  e.t += dt;
  e.turbo = Math.max(0, e.turbo - dt);
  e.invulnerable = Math.max(0, e.invulnerable - dt);
  e.velocidad = Math.min(VMAX, V0 + ACEL * e.t) * (e.turbo > 0 ? TURBO_X : 1);
  const dy = e.velocidad * dt;
  e.distancia += dy;
  e.x += (centroCarril(e.carril) - e.x) * Math.min(1, dt * 16);

  for (const o of e.objetos) o.y += dy;
  for (const p of e.paraderos) p.y += dy;

  e.porRecorrer -= dy;
  while (e.porRecorrer <= 0) {
    e.porRecorrer += generarFila(e, azar, Y_NACE - e.porRecorrer);
  }

  const combi = { x: e.x, y: e.yCombi, w: COMBI.w, h: COMBI.h };
  for (const o of e.objetos) {
    if (o.fuera || !choca(combi, o, 5)) continue;
    o.fuera = true;
    if (o.tipo === 'moneda') {
      const monto = e.t > 45 ? 20 : 10;
      e.recaudado += monto;
      eventos.push({ tipo: 'moneda', monto, x: o.x, y: o.y });
    } else if (o.tipo === 'turbo') {
      e.turbo = TURBO_S;
      eventos.push({ tipo: 'turbo', x: o.x, y: o.y });
    } else if (o.tipo === 'emoliente') {
      if (e.vidas < VIDAS) e.vidas += 1;
      else e.recaudado += 100;
      eventos.push({ tipo: 'emoliente', x: o.x, y: o.y });
    } else if (e.turbo > 0) {
      e.recaudado += 50;
      o.volando = true;
      eventos.push({ tipo: 'atropello', monto: 50, x: o.x, y: o.y });
    } else if (e.invulnerable > 0) {
      o.fuera = false;
    } else {
      o.golpeado = true;
      e.vidas -= 1;
      e.invulnerable = INVULNERABLE_S;
      e.racha = 0;
      e.combo = 1;
      eventos.push({ tipo: 'choque', x: (o.x + e.x) / 2, y: o.y + o.h / 2, vidas: e.vidas });
    }
  }

  for (const p of e.paraderos) {
    if (p.estado !== 'espera' || p.y < e.yCombi - 10) continue;
    if (enCarrilDerecho(e)) {
      e.racha += 1;
      e.combo = Math.min(COMBO_MAX, e.racha);
      const monto = p.gente.reduce((s, g) => s + TARIFA[g], 0) * e.combo;
      e.recaudado += monto;
      e.pasajeros += p.gente.length;
      p.estado = 'subio';
      eventos.push({ tipo: 'sube', n: p.gente.length, monto, combo: e.combo, x: e.x, y: e.yCombi });
    } else {
      p.estado = 'dejado';
      e.racha = 0;
      e.combo = 1;
      eventos.push({ tipo: 'dejado', n: p.gente.length, y: p.y });
    }
  }

  e.objetos = e.objetos.filter((o) => o.y - o.h < e.alto + 60);
  e.paraderos = e.paraderos.filter((p) => p.y < e.alto + 120);

  if (e.vidas <= 0) {
    e.terminado = true;
    eventos.push({ tipo: 'fin' });
  }
  return eventos;
}

export const soles = (centimos) => `S/ ${(centimos / 100).toFixed(2)}`;
