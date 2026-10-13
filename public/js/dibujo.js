// Combi Loca: el dibujo. Lee el estado del motor y lo pinta; los efectos (partículas, textos,
// temblor) viven aquí porque no cambian el juego.
import { ANCHO, VEREDA_IZQ, VEREDA_DER, ANCHO_CARRIL, COMBI, centroCarril, soles } from './motor.js';

const C = {
  asfalto: '#2a2238',
  asfaltoClaro: '#332a45',
  linea: 'rgba(240, 232, 255, .55)',
  borde: '#ffd60a',
  vereda: '#4a4062',
  veredaBorde: '#6b5f8a',
  amarillo: '#ffd60a',
  rosado: '#ff3d9a',
  verde: '#29e39b',
  celeste: '#3cc9ff',
  naranja: '#ff8a1f',
  rojo: '#ff5468',
  oscuro: '#140f1f',
  piel: '#c98a5a',
  blanco: '#fff6e0',
};
const AUTOS = ['#3cc9ff', '#ff8a1f', '#e8e4f2', '#ff5468', '#8b6cff'];
const ROPA = ['#ff3d9a', '#3cc9ff', '#29e39b', '#ff8a1f', '#fff6e0', '#8b6cff'];
const TIENDAS = ['#ff3d9a', '#3cc9ff', '#29e39b', '#ff8a1f', '#ffd60a', '#8b6cff'];
const FUENTE = "'Bungee', 'Arial Black', Impact, sans-serif";

export function crearEfectos() {
  return { particulas: [], textos: [], temblor: 0, reloj: 0 };
}

const rnd = (a, b) => a + Math.random() * (b - a);

// Convierte lo que pasó en el motor en efectos visibles.
export function registrar(fx, eventos) {
  for (const ev of eventos) {
    if (ev.tipo === 'moneda') {
      chispas(fx, ev.x, ev.y, C.amarillo, 6);
      texto(fx, `+${ev.monto}`, ev.x, ev.y, C.amarillo, 14);
    } else if (ev.tipo === 'sube') {
      chispas(fx, ev.x + 30, ev.y, C.verde, 10 + ev.n * 3);
      texto(fx, `+${soles(ev.monto)}`, ev.x, ev.y - 70, C.verde, 20);
      texto(fx, ev.combo > 1 ? `¡SUBE! x${ev.combo}` : '¡SUBE, SUBE!', ev.x, ev.y - 100, C.blanco, 16);
    } else if (ev.tipo === 'choque') {
      chispas(fx, ev.x, ev.y, C.naranja, 18);
      chispas(fx, ev.x, ev.y, '#9a92b0', 10);
      texto(fx, ev.vidas > 0 ? '¡PAPELETA!' : '¡AL DEPÓSITO!', ev.x, ev.y - 40, C.rojo, 22);
      fx.temblor = 0.35;
    } else if (ev.tipo === 'dejado') {
      texto(fx, ev.n > 1 ? `¡TE DEJARON ${ev.n}!` : '¡TE DEJARON!', ANCHO - 90, ev.y - 30, C.rojo, 14);
    } else if (ev.tipo === 'turbo') {
      chispas(fx, ev.x, ev.y, C.verde, 16);
      texto(fx, '¡CORREDOR!', ev.x, ev.y - 40, C.verde, 22);
    } else if (ev.tipo === 'emoliente') {
      chispas(fx, ev.x, ev.y, C.celeste, 12);
      texto(fx, '¡EMOLIENTE! +1', ev.x, ev.y - 40, C.celeste, 18);
    } else if (ev.tipo === 'atropello') {
      chispas(fx, ev.x, ev.y, C.verde, 8);
      texto(fx, '+50', ev.x, ev.y, C.verde, 14);
    }
  }
}

function chispas(fx, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const v = rnd(60, 260);
    fx.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, vida: rnd(0.35, 0.7), max: 0.7, color, r: rnd(2, 4) });
  }
}

function texto(fx, t, x, y, color, tam) {
  fx.textos.push({ t, x: Math.max(60, Math.min(ANCHO - 60, x)), y, color, tam, vida: 1.1 });
}

export function avanzarEfectos(fx, dt) {
  fx.reloj += dt;
  fx.temblor = Math.max(0, fx.temblor - dt);
  for (const p of fx.particulas) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
    p.vida -= dt;
  }
  fx.particulas = fx.particulas.filter((p) => p.vida > 0);
  for (const t of fx.textos) {
    t.y -= 50 * dt;
    t.vida -= dt;
  }
  fx.textos = fx.textos.filter((t) => t.vida > 0);
}

// ---------- la escena ----------

export function dibujar(ctx, e, fx, { conCombi = true } = {}) {
  ctx.save();
  if (fx.temblor > 0) ctx.translate(rnd(-1, 1) * fx.temblor * 18, rnd(-1, 1) * fx.temblor * 18);
  pista(ctx, e);
  for (const p of e.paraderos) zonaParadero(ctx, p, fx.reloj);
  for (const p of e.paraderos) paradero(ctx, p, e, fx.reloj);
  for (const o of e.objetos) objeto(ctx, o, fx.reloj);
  if (conCombi) combi(ctx, e, fx.reloj);
  if (conCombi && e.t < 4) ayuda(ctx, e);
  for (const p of fx.particulas) {
    ctx.globalAlpha = Math.max(0, p.vida / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of fx.textos) {
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.font = `${t.tam}px ${FUENTE}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.oscuro;
    ctx.strokeText(t.t, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.t, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function pista(ctx, e) {
  const H = e.alto;
  const d = e.distancia;
  ctx.fillStyle = C.asfalto;
  ctx.fillRect(VEREDA_IZQ, 0, ANCHO - VEREDA_IZQ - VEREDA_DER, H);

  // parches de asfalto que pasan, para que se sienta la velocidad
  ctx.fillStyle = C.asfaltoClaro;
  for (let i = -1; i < H / 160 + 1; i++) {
    const y = ((d * 1) % 160) + i * 160;
    ctx.fillRect(VEREDA_IZQ + ((i * 97) % 200 + 200) % 200, y, 40, 3);
  }

  // líneas de carril
  ctx.fillStyle = C.linea;
  for (let c = 1; c < 3; c++) {
    const x = VEREDA_IZQ + ANCHO_CARRIL * c - 2;
    for (let y = (d % 64) - 64; y < H; y += 64) ctx.fillRect(x, y, 4, 34);
  }
  ctx.fillStyle = C.borde;
  ctx.fillRect(VEREDA_IZQ + 2, 0, 3, H);
  ctx.fillRect(ANCHO - VEREDA_DER - 5, 0, 3, H);

  // vereda izquierda: tiendas
  ctx.fillStyle = C.vereda;
  ctx.fillRect(0, 0, VEREDA_IZQ, H);
  for (let i = -1; i < H / 90 + 1; i++) {
    const n = Math.floor((d * 0.999) / 90) - i;
    const y = (d % 90) + i * 90;
    ctx.fillStyle = TIENDAS[((n % TIENDAS.length) + TIENDAS.length) % TIENDAS.length];
    ctx.fillRect(0, y + 6, 22, 78);
    ctx.fillStyle = C.oscuro;
    ctx.fillRect(4, y + 20, 14, 18);
    ctx.fillRect(4, y + 50, 14, 18);
  }

  // vereda derecha: donde esperan los pasajeros
  ctx.fillStyle = C.vereda;
  ctx.fillRect(ANCHO - VEREDA_DER, 0, VEREDA_DER, H);
  ctx.fillStyle = C.veredaBorde;
  ctx.fillRect(ANCHO - VEREDA_DER, 0, 4, H);
  for (let y = (d % 40) - 40; y < H; y += 40) ctx.fillRect(ANCHO - VEREDA_DER + 4, y, VEREDA_DER - 4, 2);

  // líneas de velocidad en las veredas
  if (e.velocidad > 450) {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = 0; i < 6; i++) {
      const y = ((d * 1.7 + i * 137) % (H + 80)) - 40;
      ctx.fillRect(i % 2 ? 26 : ANCHO - 12, y, 2, 30 + (e.velocidad - 450) / 6);
    }
  }
}

// La franja amarilla en el carril derecho: ahí hay que estar cuando pasa el paradero.
function zonaParadero(ctx, p, reloj) {
  if (p.estado === 'subio') return;
  const x = centroCarril(2) - ANCHO_CARRIL / 2 + 6;
  const w = ANCHO_CARRIL - 12;
  ctx.globalAlpha = p.estado === 'espera' ? 0.22 + Math.sin(reloj * 6) * 0.08 : 0.1;
  ctx.fillStyle = p.estado === 'espera' ? C.amarillo : C.rojo;
  ctx.fillRect(x, p.y - 44, w, 88);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = p.estado === 'espera' ? C.amarillo : C.rojo;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(x, p.y - 44, w, 88);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  if (p.estado === 'espera') {
    ctx.fillStyle = C.amarillo;
    ctx.font = `22px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText('P', centroCarril(2), p.y + 8);
  }
}

// Los primeros segundos: dónde tocar.
function ayuda(ctx, e) {
  ctx.globalAlpha = Math.min(1, (4 - e.t) / 1.2) * 0.85;
  ctx.textAlign = 'center';
  for (const [x, flecha] of [[ANCHO * 0.25, '◀'], [ANCHO * 0.75, '▶']]) {
    ctx.fillStyle = 'rgba(20, 15, 31, .7)';
    ctx.beginPath();
    ctx.roundRect(x - 60, e.alto - 300, 120, 92, 18);
    ctx.fill();
    ctx.fillStyle = C.amarillo;
    ctx.font = `34px ${FUENTE}`;
    ctx.fillText(flecha, x, e.alto - 254);
    ctx.fillStyle = C.blanco;
    ctx.font = `13px ${FUENTE}`;
    ctx.fillText('TOCA AQUÍ', x, e.alto - 226);
  }
  ctx.globalAlpha = 1;
}

function paradero(ctx, p, e, reloj) {
  const x = ANCHO - VEREDA_DER + 8;
  const y = p.y;
  // letrero
  ctx.fillStyle = C.oscuro;
  ctx.fillRect(x + 40, y - 46, 3, 50);
  ctx.fillStyle = C.amarillo;
  ctx.fillRect(x + 30, y - 58, 24, 18);
  ctx.fillStyle = C.oscuro;
  ctx.font = `13px ${FUENTE}`;
  ctx.textAlign = 'center';
  ctx.fillText('P', x + 42, y - 44);
  if (p.estado === 'subio') return;
  // gente
  p.gente.forEach((g, i) => {
    const gy = y - 30 + i * 18;
    const gx = x + 10 + (i % 2) * 14;
    const brinco = p.estado === 'espera' ? Math.abs(Math.sin(reloj * 8 + i)) * 3 : 0;
    ctx.fillStyle = ROPA[(i + p.gente.length) % ROPA.length];
    ctx.beginPath();
    ctx.arc(gx, gy - brinco, g === 'escolar' ? 6 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.piel;
    ctx.beginPath();
    ctx.arc(gx, gy - brinco - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.estado === 'espera') {
      // brazo levantado: "¡baja!"
      ctx.strokeStyle = C.piel;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx - 5, gy - brinco);
      ctx.lineTo(gx - 13, gy - brinco - 9 - Math.sin(reloj * 10 + i) * 3);
      ctx.stroke();
    }
  });
  if (p.estado === 'dejado') {
    ctx.fillStyle = C.rojo;
    ctx.font = `16px ${FUENTE}`;
    ctx.fillText('!!', x + 18, y - 40);
  }
}

function caja(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
  ctx.fill();
}

function objeto(ctx, o, reloj) {
  if (o.fuera && (o.tipo === 'moneda' || o.tipo === 'turbo' || o.tipo === 'emoliente')) return;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.volando) {
    const t = Math.min(1, (o.vuelo = (o.vuelo || 0) + 1 / 60));
    ctx.translate((o.carril - 1 || 1) * t * 160, -t * 80);
    ctx.rotate(t * 6);
    ctx.globalAlpha = 1 - t;
  }
  if (o.golpeado) ctx.rotate(0.25);
  const { w, h } = o;
  if (o.tipo === 'auto') {
    caja(ctx, 0, 0, w, h, 9, AUTOS[o.color % AUTOS.length]);
    caja(ctx, 0, -h * 0.18, w - 8, h * 0.22, 4, '#1d1631');
    caja(ctx, 0, h * 0.28, w - 10, h * 0.14, 4, '#1d1631');
    ruedas(ctx, w, h);
  } else if (o.tipo === 'bus') {
    caja(ctx, 0, 0, w, h, 8, C.naranja);
    caja(ctx, 0, 0, w - 12, h - 16, 5, '#ffb15e');
    ctx.fillStyle = '#e4e0ef';
    for (let i = -2; i <= 2; i++) ctx.fillRect(-8, i * 22 - 6, 16, 10);
    caja(ctx, 0, -h / 2 + 8, w - 8, 8, 3, '#1d1631');
    ruedas(ctx, w, h);
  } else if (o.tipo === 'mototaxi') {
    caja(ctx, 0, 4, w, h - 8, 10, C.rojo);
    caja(ctx, 0, 6, w - 6, h * 0.55, 8, '#1d1631');
    ctx.fillStyle = '#0d0a14';
    ctx.fillRect(-3, -h / 2, 6, 10);
    ctx.fillRect(-w / 2 - 2, h / 2 - 16, 5, 12);
    ctx.fillRect(w / 2 - 3, h / 2 - 16, 5, 12);
  } else if (o.tipo === 'hueco') {
    ctx.fillStyle = '#100c1a';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4c4266';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(60, 201, 255, .25)';
    ctx.beginPath();
    ctx.ellipse(-6, -3, w / 5, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.tipo === 'conos') {
    caja(ctx, 0, 0, w, 8, 2, '#e4e0ef');
    ctx.fillStyle = C.rojo;
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 18 - 4, -3, 8, 4);
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = C.naranja;
      ctx.beginPath();
      ctx.moveTo(i * 20 - 7, 13);
      ctx.lineTo(i * 20, -12);
      ctx.lineTo(i * 20 + 7, 13);
      ctx.fill();
    }
  } else if (o.tipo === 'moneda') {
    ctx.scale(Math.abs(Math.cos(reloj * 5 + o.y * 0.02)) * 0.7 + 0.3, 1);
    ctx.fillStyle = C.amarillo;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b39400';
    ctx.font = `10px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText('S/', 0, 4);
  } else if (o.tipo === 'turbo') {
    const pulso = 1 + Math.sin(reloj * 8) * 0.08;
    ctx.scale(pulso, pulso);
    ctx.fillStyle = C.verde;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.oscuro;
    ctx.lineWidth = 4;
    for (const dy of [4, -6]) {
      ctx.beginPath();
      ctx.moveTo(-8, dy + 6);
      ctx.lineTo(0, dy - 2);
      ctx.lineTo(8, dy + 6);
      ctx.stroke();
    }
  } else if (o.tipo === 'emoliente') {
    caja(ctx, 0, 4, w - 6, h - 10, 4, C.celeste);
    caja(ctx, 0, 6, w - 12, 8, 2, C.blanco);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    for (const dx of [-5, 5]) {
      ctx.beginPath();
      ctx.moveTo(dx, -h / 2 + 4);
      ctx.quadraticCurveTo(dx + 4 * Math.sin(reloj * 6), -h / 2 - 4, dx, -h / 2 - 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function ruedas(ctx, w, h) {
  ctx.fillStyle = '#0d0a14';
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * (w / 2) - (sx > 0 ? 3 : 1), sy * (h / 2 - 16) - 6, 4, 12);
}

function combi(ctx, e, reloj) {
  if (e.invulnerable > 0 && Math.floor(reloj * 14) % 2 === 0) return;
  const { w, h } = COMBI;
  ctx.save();
  ctx.translate(e.x, e.yCombi);
  ctx.rotate((centroCarril(e.carril) - e.x) * 0.004);
  if (e.turbo > 0) {
    ctx.fillStyle = 'rgba(41, 227, 155, .35)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + 6 + i * 10, h / 2, 4, 30 + ((reloj * 600 + i * 37) % 40));
    ctx.strokeStyle = C.verde;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 12);
    ctx.stroke();
  }
  ruedas(ctx, w, h);
  caja(ctx, 0, 0, w, h, 9, C.amarillo);
  ctx.fillStyle = C.rosado;
  ctx.fillRect(-w / 2, -h / 2 + 18, 4, h - 28);
  ctx.fillRect(w / 2 - 4, -h / 2 + 18, 4, h - 28);
  ctx.fillStyle = C.verde;
  ctx.fillRect(-w / 2 + 4, -h / 2 + 18, 2, h - 28);
  ctx.fillRect(w / 2 - 6, -h / 2 + 18, 2, h - 28);
  caja(ctx, 0, -h / 2 + 12, w - 8, 14, 4, '#2a2050');
  // techo con parrilla y bultos
  ctx.strokeStyle = '#b39400';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 28 + i * 12);
    ctx.lineTo(w / 2 - 8, -h / 2 + 28 + i * 12);
    ctx.stroke();
  }
  caja(ctx, -6, 6, 14, 12, 3, C.celeste);
  caja(ctx, 7, 18, 12, 10, 3, C.rosado);
  // el cobrador sacando el brazo por la puerta
  ctx.strokeStyle = C.piel;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.lineTo(w / 2 + 12, -6 + Math.sin(reloj * 9) * 5);
  ctx.stroke();
  ctx.fillStyle = C.naranja;
  ctx.fillRect(w / 2 + 9, -12 + Math.sin(reloj * 9) * 5, 7, 6);
  // espejos
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(-w / 2 - 5, -h / 2 + 16, 5, 6);
  ctx.fillRect(w / 2, -h / 2 + 16, 5, 6);
  ctx.restore();
}
