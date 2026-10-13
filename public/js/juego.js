// Combi Loca: pantallas, control, ciclo de juego y ranking.
import { nuevaPartida, avanzar, mover, aleatorio, soles, ANCHO, VIDAS, V0, VMAX } from './motor.js';
import { crearEfectos, registrar, avanzarEfectos, dibujar } from './dibujo.js';
import { activar, silenciar, sonar, musicaInicio, musicaRapidez, musicaFin } from './sonido.js';

const SITIO = 'https://combi-loca.pages.dev';
const $ = (id) => document.getElementById(id);

// localStorage es una comodidad: en modo privado puede no estar.
const guardado = {
  get(k) { try { return JSON.parse(localStorage.getItem(`combi-loca:${k}`)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`combi-loca:${k}`, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

const app = $('app');
const lienzo = $('lienzo');
const ctx = lienzo.getContext('2d');

let alto = 640;
let escala = 1;
let partida = null;
let azar = null;
let fx = crearEfectos();
let jugando = false;
let pausado = false;
let ficha = null;
let fichaPedida = null;
let ultimo = 0;
let demo = null;
let azarDemo = null;
let enPista = false; // la partida se ve detrás de la pausa y del final

// ---------- tamaño ----------

function medir() {
  const r = app.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  escala = r.width / ANCHO;
  alto = Math.round(r.height / escala);
  lienzo.width = Math.round(r.width * dpr);
  lienzo.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
  if (!jugando) nuevaDemo();
}

function nuevaDemo() {
  azarDemo = aleatorio(Date.now() & 0xffff);
  demo = nuevaPartida(alto);
  demo.vidas = Infinity;
  demo.yCombi = alto + 2000; // sin combi: nadie choca ni deja paraderos
  demo.t = 25;
  for (let i = 0; i < 120; i++) avanzar(demo, 1 / 30, azarDemo);
}

// ---------- pantallas ----------

function mostrar(id) {
  for (const p of ['pantalla-inicio', 'pantalla-pausa', 'pantalla-fin']) $(p).hidden = p !== id;
  $('hud').hidden = id !== null && id !== 'pantalla-pausa';
}

function arrancar() {
  activar();
  sonar.bocina();
  musicaInicio();
  partida = nuevaPartida(alto);
  azar = aleatorio((Math.random() * 2 ** 31) >>> 0);
  fx = crearEfectos();
  jugando = true;
  pausado = false;
  enPista = true;
  hudPrevio = '';
  mostrar(null);
  pedirFicha();
}

function pausar() {
  if (!jugando || pausado) return;
  pausado = true;
  musicaFin();
  mostrar('pantalla-pausa');
  $('btn-seguir').focus();
}

function seguir() {
  if (!jugando) return;
  pausado = false;
  activar();
  musicaInicio();
  mostrar(null);
  ultimo = performance.now();
}

function bajarse() {
  jugando = false;
  pausado = false;
  enPista = false;
  musicaFin();
  nuevaDemo();
  mostrar('pantalla-inicio');
  pintarRecord();
}

const TITULOS = [
  [1000, 'Cobrador practicante'],
  [3000, 'Chofer de la 41'],
  [6000, 'Rey de la Javier Prado'],
  [12000, 'Leyenda de la Panamericana'],
  [Infinity, 'Dueño de la empresa'],
];

function terminar() {
  jugando = false;
  musicaFin();
  sonar.fin();
  navigator.vibrate?.(200);
  const { recaudado, pasajeros, t } = partida;
  const record = guardado.get('record') || 0;
  const nuevo = recaudado > record;
  if (nuevo) guardado.set('record', recaudado);
  $('fin-titulo').textContent = TITULOS.find(([hasta]) => recaudado < hasta)[1];
  $('fin-plata').textContent = soles(recaudado);
  $('fin-datos').textContent = `${pasajeros} ${pasajeros === 1 ? 'pasajero' : 'pasajeros'} · ${Math.round(t)} segundos al volante`;
  $('fin-nuevo').hidden = !nuevo || recaudado === 0;
  $('ranking-aviso').textContent = '';
  $('ranking-aviso').classList.remove('mal');
  $('compartir-aviso').textContent = '';
  $('compartir-texto').hidden = true;
  $('in-nombre').value = guardado.get('nombre') || '';
  $('btn-guardar').disabled = false;
  setTimeout(async () => {
    mostrar('pantalla-fin');
    await fichaPedida;
    $('form-ranking').hidden = !ficha || recaudado === 0;
    if (!ficha && recaudado > 0) avisar('ranking-aviso', 'El ranking no está disponible ahora.', true);
    cargarTop();
  }, 900);
}

function pintarRecord() {
  const r = guardado.get('record');
  $('record').hidden = !r;
  if (r) $('record').textContent = `Tu récord: ${soles(r)}`;
}

// ---------- HUD ----------

let hudPrevio = '';
function pintarHud() {
  const e = partida;
  const clave = `${e.recaudado}|${e.pasajeros}|${e.combo}|${e.turbo > 0}|${e.vidas}`;
  if (clave === hudPrevio) return;
  hudPrevio = clave;
  $('hud-plata').textContent = soles(e.recaudado);
  $('hud-pas').textContent = `${e.pasajeros} ${e.pasajeros === 1 ? 'pasajero' : 'pasajeros'}`;
  $('hud-combo').hidden = e.combo < 2;
  $('hud-combo').textContent = `Combo x${e.combo}`;
  $('hud-turbo').hidden = !(e.turbo > 0);
  $('hud-vidas').innerHTML = Array.from({ length: VIDAS }, (_, i) => `<span class="${i < e.vidas ? '' : 'gastada'}">♥</span>`).join('');
  $('hud-vidas').setAttribute('aria-label', `${e.vidas} de ${VIDAS} vidas`);
}

// ---------- ciclo ----------

function sonidos(eventos) {
  for (const ev of eventos) {
    if (ev.tipo === 'moneda') sonar.moneda();
    else if (ev.tipo === 'sube') sonar.sube(ev.combo);
    else if (ev.tipo === 'choque') { sonar.choque(); navigator.vibrate?.(90); }
    else if (ev.tipo === 'dejado') sonar.dejado();
    else if (ev.tipo === 'turbo' || ev.tipo === 'emoliente') sonar.turbo();
  }
}

function ciclo(t) {
  const dt = Math.min(0.05, (t - ultimo) / 1000 || 0);
  ultimo = t;
  if (jugando && !pausado) {
    const eventos = avanzar(partida, dt, azar);
    registrar(fx, eventos);
    sonidos(eventos);
    pintarHud();
    musicaRapidez(1 + ((partida.velocidad - V0) / (VMAX - V0)) * 0.35);
    if (partida.terminado) terminar();
  } else if (!enPista && demo) {
    avanzar(demo, dt, azarDemo);
  }
  if (!pausado) avanzarEfectos(fx, dt);
  ctx.clearRect(0, 0, ANCHO, alto);
  if (enPista) dibujar(ctx, partida, fx);
  else if (demo) dibujar(ctx, demo, fx, { conCombi: false });
  requestAnimationFrame(ciclo);
}

// ---------- control ----------

app.addEventListener('pointerdown', (ev) => {
  if (!jugando || pausado || ev.target.closest('button, input, form, a')) return;
  const r = app.getBoundingClientRect();
  mover(partida, ev.clientX - r.left < r.width / 2 ? -1 : 1);
  ev.preventDefault();
});

document.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  const k = ev.key.toLowerCase();
  if (jugando && !pausado) {
    if (k === 'arrowleft' || k === 'a') { mover(partida, -1); ev.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { mover(partida, 1); ev.preventDefault(); }
    else if (k === 'p' || k === 'escape') pausar();
  } else if (pausado && (k === 'p' || k === 'escape')) {
    seguir();
  } else if (!jugando && (k === 'enter' || k === ' ') && !$('pantalla-inicio').hidden && document.activeElement === document.body) {
    ev.preventDefault();
    arrancar();
  }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });
window.addEventListener('resize', () => { if (!jugando) medir(); });

$('btn-arrancar').addEventListener('click', arrancar);
$('btn-otra').addEventListener('click', arrancar);
$('btn-pausa').addEventListener('click', pausar);
$('btn-seguir').addEventListener('click', seguir);
$('btn-salir').addEventListener('click', bajarse);
$('btn-compartir').addEventListener('click', compartir);
$('btn-sonido').addEventListener('click', () => {
  const callado = !guardado.get('silencio');
  guardado.set('silencio', callado);
  silenciar(callado);
  $('btn-sonido').textContent = `Sonido: ${callado ? 'no' : 'sí'}`;
});

// ---------- ranking ----------

function avisar(id, texto, mal = false) {
  $(id).textContent = texto;
  $(id).classList.toggle('mal', mal);
}

function pedirFicha() {
  ficha = null;
  fichaPedida = fetch('/api/partida', { method: 'POST' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { ficha = d?.ficha || null; })
    .catch(() => { ficha = null; });
}

let miNombre = guardado.get('nombre') || '';

async function cargarTop() {
  let top = null;
  try {
    const r = await fetch('/api/puntajes');
    if (r.ok) top = (await r.json()).top;
  } catch { top = null; }
  for (const id of ['top-inicio', 'top-fin']) {
    const lista = $(id);
    lista.replaceChildren();
    for (const fila of (top || []).slice(0, id === 'top-inicio' ? 10 : 20)) {
      const li = document.createElement('li');
      if (miNombre && fila.nombre.toLowerCase() === miNombre.toLowerCase()) li.className = 'yo';
      const n = document.createElement('span');
      n.className = 'nombre';
      n.textContent = fila.nombre;
      const p = document.createElement('span');
      p.className = 'plata';
      p.textContent = soles(fila.puntaje);
      li.append(n, p);
      lista.append(li);
    }
    const vacio = $(`${id}-vacio`);
    vacio.hidden = !!(top && top.length);
    vacio.textContent = top ? 'Todavía nadie. ¡Sé el primero!' : 'El ranking no está disponible ahora.';
  }
}

const ERRORES = {
  nombre: 'Ese nombre no va. Usa de 2 a 16 letras o números, sin groserías.',
  demasiados: 'Muchos puntajes seguidos. Espera un minuto.',
  repetida: 'Esta partida ya está guardada.',
  ficha: 'Esta partida no se puede guardar.',
};

$('form-ranking').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const nombre = $('in-nombre').value.trim();
  if (nombre.length < 2) return avisar('ranking-aviso', ERRORES.nombre, true);
  $('btn-guardar').disabled = true;
  avisar('ranking-aviso', 'Guardando…');
  try {
    const r = await fetch('/api/puntajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ficha, nombre,
        puntaje: partida.recaudado,
        pasajeros: partida.pasajeros,
        duracionMs: Math.round(partida.t * 1000),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      $('btn-guardar').disabled = d.error === 'repetida';
      return avisar('ranking-aviso', ERRORES[d.error] || 'No se pudo guardar. Intenta otra vez.', true);
    }
    miNombre = nombre;
    guardado.set('nombre', nombre);
    $('form-ranking').hidden = true;
    avisar('ranking-aviso', `¡Quedaste #${d.puesto} en el ranking!`);
    cargarTop();
  } catch {
    $('btn-guardar').disabled = false;
    avisar('ranking-aviso', 'No se pudo guardar. Revisa tu conexión.', true);
  }
});

// ---------- compartir ----------

async function compartir() {
  const p = partida;
  const texto = `Recaudé ${soles(p.recaudado)} y subí ${p.pasajeros} pasajeros en Combi Loca 🚌💨 ¿Me ganas?\n${SITIO}\n#HackTheAndes`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ text: texto });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    avisar('compartir-aviso', 'Copiado. Pégalo en tu red favorita.');
  } catch {
    $('compartir-texto').value = texto;
    $('compartir-texto').hidden = false;
    $('compartir-texto').select();
    avisar('compartir-aviso', 'Copia este texto:');
  }
}

// ---------- inicio ----------

async function iniciar() {
  const callado = !!guardado.get('silencio');
  silenciar(callado);
  $('btn-sonido').textContent = `Sonido: ${callado ? 'no' : 'sí'}`;
  pintarRecord();
  try { await document.fonts.load("20px 'Bungee'"); } catch { /* el dibujo usa la de respaldo */ }
  medir();
  mostrar('pantalla-inicio');
  cargarTop();
  requestAnimationFrame((t) => { ultimo = t; requestAnimationFrame(ciclo); });
}

iniciar();
