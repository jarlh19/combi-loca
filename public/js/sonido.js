// Combi Loca: sonidos hechos con Web Audio, sin archivos. Incluye una cumbia corta de fondo.
// El navegador solo deja sonar después de un toque, por eso todo arranca en activar().

let ac = null;
let maestro = null;
let musica = null;
let silencio = false;

export function activar() {
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    maestro = ac.createGain();
    maestro.gain.value = silencio ? 0 : 0.7;
    maestro.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

export function silenciar(si) {
  silencio = si;
  if (maestro) maestro.gain.setTargetAtTime(si ? 0 : 0.7, ac.currentTime, 0.05);
}

function tono(frec, inicio, dur, { tipo = 'square', vol = 0.15, hasta = null } = {}) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, inicio);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, inicio + dur);
  g.gain.setValueAtTime(vol, inicio);
  g.gain.exponentialRampToValueAtTime(0.001, inicio + dur);
  o.connect(g).connect(maestro);
  o.start(inicio);
  o.stop(inicio + dur + 0.02);
}

let ruidoBuffer = null;
function ruido(inicio, dur, { vol = 0.2, filtro = 2000, tipo = 'bandpass' } = {}) {
  if (!ac) return;
  if (!ruidoBuffer) {
    ruidoBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = ruidoBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource();
  s.buffer = ruidoBuffer;
  const f = ac.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = filtro;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, inicio);
  g.gain.exponentialRampToValueAtTime(0.001, inicio + dur);
  s.connect(f).connect(g).connect(maestro);
  s.start(inicio);
  s.stop(inicio + dur);
}

const ahora = () => (ac ? ac.currentTime : 0);

export const sonar = {
  bocina() { const t = ahora(); tono(392, t, 0.12, { vol: 0.12 }); tono(392, t + 0.18, 0.18, { vol: 0.12 }); },
  moneda() { const t = ahora(); tono(1320, t, 0.05, { vol: 0.06 }); tono(1760, t + 0.05, 0.08, { vol: 0.06 }); },
  sube(combo = 1) {
    const t = ahora();
    const base = 520 * (1 + (combo - 1) * 0.12);
    [1, 1.25, 1.5, 2].forEach((m, i) => tono(base * m, t + i * 0.06, 0.1, { vol: 0.08, tipo: 'triangle' }));
  },
  choque() { const t = ahora(); ruido(t, 0.35, { vol: 0.5, filtro: 600, tipo: 'lowpass' }); tono(110, t, 0.3, { tipo: 'sawtooth', vol: 0.2, hasta: 40 }); },
  dejado() { const t = ahora(); tono(330, t, 0.15, { vol: 0.07, tipo: 'triangle' }); tono(247, t + 0.15, 0.25, { vol: 0.07, tipo: 'triangle' }); },
  turbo() { tono(300, ahora(), 0.5, { tipo: 'sawtooth', vol: 0.08, hasta: 1200 }); },
  fin() { const t = ahora(); [392, 330, 262, 196].forEach((f, i) => tono(f, t + i * 0.16, 0.2, { vol: 0.1 })); },
};

// ---------- la cumbia ----------
// Bajo en la menor (la, mi), güiro en contratiempo y un cencerro. Se programa por compases.

const BPM = 104;
const NEGRA = 60 / BPM;
const BAJO = [110, 0, 82.4, 0, 110, 0, 82.4, 98];
const MELODIA = [440, 0, 523, 0, 494, 440, 392, 0, 440, 0, 330, 0, 392, 0, 440, 0];

export function musicaInicio(velocidadRel = 1) {
  if (!ac || musica) return;
  let siguiente = ac.currentTime + 0.1;
  let paso = 0;
  musica = { rapidez: velocidadRel };
  musica.timer = setInterval(() => {
    while (siguiente < ac.currentTime + 0.25) {
      const corchea = NEGRA / 2 / musica.rapidez;
      const b = BAJO[paso % 8];
      if (b) tono(b, siguiente, corchea * 1.6, { tipo: 'triangle', vol: 0.16 });
      if (paso % 2 === 1) ruido(siguiente, corchea * 0.7, { vol: 0.05, filtro: 4500 });
      if (paso % 4 === 2) tono(1600, siguiente, 0.05, { tipo: 'square', vol: 0.03 });
      const m = MELODIA[paso % 16];
      if (m && paso % 32 >= 16) tono(m, siguiente, corchea * 0.9, { tipo: 'square', vol: 0.025 });
      siguiente += corchea;
      paso += 1;
    }
  }, 60);
}

export function musicaRapidez(r) {
  if (musica) musica.rapidez = r;
}

export function musicaFin() {
  if (!musica) return;
  clearInterval(musica.timer);
  musica = null;
}
