// Ranking de Combi Loca: una ficha firmada por partida y las reglas para aceptar un puntaje.
//
// Lo que esto frena: inventar puntajes con curl, reusar una partida, reclamar más tiempo del que
// pasó de verdad y puntajes que el juego no puede dar. Lo que no frena: alguien que juegue con un
// bot o que mande un puntaje alto pero posible. Para un ranking de evento es suficiente.

// Céntimos por segundo. Un chofer automático perfecto saca unos 300 por segundo; esto deja margen.
export const MAX_TASA = 1500;
export const MAX_PASAJEROS_S = 3;
export const DURACION_MIN = 5_000;
export const DURACION_MAX = 30 * 60_000;
export const HOLGURA_MS = 5_000;

const cod = new TextEncoder();

function base64url(buffer) {
  let s = '';
  for (const b of new Uint8Array(buffer)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function firmar(secreto, texto) {
  const clave = await crypto.subtle.importKey('raw', cod.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', clave, cod.encode(texto)));
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function crearFicha(secreto, ahora = Date.now(), id = crypto.randomUUID()) {
  const cuerpo = `${id}.${ahora}`;
  return `${cuerpo}.${await firmar(secreto, cuerpo)}`;
}

// { id, inicio } si la ficha es nuestra, null si no.
export async function leerFicha(secreto, ficha) {
  const m = /^([0-9a-f-]{36})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(String(ficha ?? ''));
  if (!m) return null;
  if (!iguales(await firmar(secreto, `${m[1]}.${m[2]}`), m[3])) return null;
  return { id: m[1], inicio: Number(m[2]) };
}

// ---------- nombres ----------

const PERMITIDO = /^[\p{L}\p{N} ._-]+$/u;
// Se comparan sin tildes y con 0→o, 1→i, 3→e, 4→a, 5→s. Las cortas solo como palabra completa,
// porque viven dentro de apellidos y nombres (Vergara, Nazira, Diputado); las largas, en cualquier parte.
const PALABRAS = ['puta', 'puto', 'verga', 'pinga', 'nazi', 'ctm', 'chucha'];
const RAICES = [
  'mierda', 'conchatumadre', 'conchasumadre', 'maricon', 'cojudo', 'huevon', 'cabron', 'hitler',
  'fuck', 'shit', 'bitch', 'nigg', 'faggot',
];

export function nombreLimpio(texto) {
  const n = String(texto ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if ([...n].length < 2 || [...n].length > 16 || !PERMITIDO.test(n)) return null;
  const plano = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
  const palabras = plano.split(/[^a-z]+/).filter(Boolean);
  const junto = palabras.join('');
  if (palabras.some((p) => PALABRAS.includes(p)) || PALABRAS.includes(junto)) return null;
  if (RAICES.some((r) => junto.includes(r))) return null;
  return n;
}

// ---------- puntajes ----------

// null si el puntaje se acepta; si no, el motivo.
export function revisarPuntaje({ puntaje, pasajeros, duracionMs }, inicio, ahora) {
  if (![puntaje, pasajeros, duracionMs].every(Number.isInteger)) return 'formato';
  if (puntaje < 0 || pasajeros < 0 || puntaje % 10 !== 0) return 'formato';
  if (duracionMs < DURACION_MIN || duracionMs > DURACION_MAX) return 'duracion';
  if (ahora - inicio + HOLGURA_MS < duracionMs) return 'reloj';
  if (ahora - inicio > DURACION_MAX + 10 * 60_000) return 'vencida';
  const s = duracionMs / 1000;
  if (puntaje > MAX_TASA * s || pasajeros > MAX_PASAJEROS_S * s) return 'imposible';
  // Cada pasajero paga por lo menos medio pasaje escolar.
  if (puntaje < pasajeros * 50) return 'imposible';
  return null;
}
