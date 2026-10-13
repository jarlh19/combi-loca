// Combi Loca: sonidos y radio, todo sintetizado con Web Audio (sin archivos ni samples).
// La música es original: géneros y ritmos de uso común (tecno, reggaetón, cumbia, salsa, rock),
// con melodías propias. El navegador solo deja sonar después de un toque: todo empieza en activar().

let ac = null;
let maestro = null;
let busMusica = null;
let silencio = false;

export function activar() {
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    const compresor = ac.createDynamicsCompressor();
    compresor.threshold.value = -14;
    compresor.ratio.value = 4;
    compresor.connect(ac.destination);
    maestro = ac.createGain();
    maestro.gain.value = silencio ? 0 : 0.8;
    maestro.connect(compresor);
    busMusica = ac.createGain();
    busMusica.gain.value = 0.5;
    busMusica.connect(maestro);
  }
  if (ac.state === 'suspended') ac.resume();
}

export function silenciar(si) {
  silencio = si;
  if (maestro) maestro.gain.setTargetAtTime(si ? 0 : 0.8, ac.currentTime, 0.05);
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// ---------- instrumentos ----------

function tono(frec, t, dur, { tipo = 'square', vol = 0.15, hasta = null, destino = maestro, ataque = 0.004 } = {}) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let bufferRuido = null;
function ruido(t, dur, { vol = 0.2, filtro = 2000, tipo = 'bandpass', q = 1, destino = maestro } = {}) {
  if (!ac) return;
  if (!bufferRuido) {
    bufferRuido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource();
  s.buffer = bufferRuido;
  const f = ac.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = filtro;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(destino);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

const bombo = (t, vol = 0.9) => tono(150, t, 0.28, { tipo: 'sine', vol, hasta: 42, destino: busMusica, ataque: 0.002 });
const caja = (t, vol = 0.35) => {
  ruido(t, 0.16, { vol, filtro: 1900, q: 0.8, destino: busMusica });
  tono(190, t, 0.08, { tipo: 'triangle', vol: vol * 0.6, destino: busMusica });
};
const palmas = (t, vol = 0.32) => {
  for (const d of [0, 0.012, 0.024]) ruido(t + d, 0.09, { vol, filtro: 1300, q: 1.2, destino: busMusica });
};
const platillo = (t, abierto = false, vol = 0.12) =>
  ruido(t, abierto ? 0.14 : 0.035, { vol, filtro: 8000, tipo: 'highpass', destino: busMusica });

// Bajo con filtro: el "brillo" sube con la intensidad del juego.
function bajo(frec, t, dur, { tipo = 'sawtooth', vol = 0.22, corte = 500 } = {}) {
  if (!ac) return;
  const o = ac.createOscillator();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.value = frec;
  f.type = 'lowpass';
  f.Q.value = 6;
  f.frequency.setValueAtTime(corte * 2.5, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(80, corte * 0.5), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(busMusica);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Acorde de rave: tres sierras desafinadas por nota, cortadas con filtro.
function golpeRave(notas, t, dur, corte) {
  if (!ac) return;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(corte, t);
  f.frequency.exponentialRampToValueAtTime(corte * 0.35, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(busMusica);
  for (const n of notas) {
    for (const d of [-9, 0, 9]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = d;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }
}

const marimba = (n, t, vol = 0.14) => {
  tono(midi(n), t, 0.35, { tipo: 'triangle', vol, destino: busMusica, ataque: 0.002 });
  tono(midi(n + 12), t, 0.12, { tipo: 'sine', vol: vol * 0.4, destino: busMusica, ataque: 0.002 });
};

// Salsa
const clave = (t) => {
  tono(2400, t, 0.05, { tipo: 'sine', vol: 0.12, destino: busMusica, ataque: 0.001 });
  tono(1800, t, 0.03, { tipo: 'triangle', vol: 0.05, destino: busMusica, ataque: 0.001 });
};
const campana = (t, vol) => {
  tono(800, t, 0.12, { tipo: 'square', vol, destino: busMusica, ataque: 0.001 });
  tono(540, t, 0.12, { tipo: 'square', vol: vol * 0.6, destino: busMusica, ataque: 0.001 });
};
const tumbadora = (t, golpe) => {
  if (golpe === 'tapado') ruido(t, 0.06, { vol: 0.18, filtro: 1200, q: 2, destino: busMusica });
  else tono(golpe === 'grave' ? 196 : 247, t, 0.22, { tipo: 'sine', vol: 0.22, hasta: golpe === 'grave' ? 180 : 230, destino: busMusica, ataque: 0.002 });
};
const piano = (notas, t, dur) => {
  for (const n of notas) {
    tono(midi(n), t, dur, { tipo: 'triangle', vol: 0.06, destino: busMusica, ataque: 0.002 });
    tono(midi(n + 12), t, 0.12, { tipo: 'sine', vol: 0.02, destino: busMusica, ataque: 0.002 });
  }
};
function metales(n, t, dur, x) {
  if (!ac) return;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900 + x * 1200, t);
  f.frequency.linearRampToValueAtTime(2600 + x * 1200, t + 0.04);
  f.frequency.exponentialRampToValueAtTime(1000, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(busMusica);
  for (const [nota, d] of [[n, -6], [n, 6], [n - 12, 0]]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(nota);
    o.detune.value = d;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

// Rock: un solo distorsionador compartido, como un amplificador.
let amplificador = null;
function distorsion() {
  if (amplificador) return amplificador;
  const curva = new Float32Array(1024);
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(6 * ((i / (curva.length - 1)) * 2 - 1));
  const formador = ac.createWaveShaper();
  formador.curve = curva;
  formador.oversample = '4x';
  const filtro = ac.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 3200;
  const salida = ac.createGain();
  salida.gain.value = 0.13;
  formador.connect(filtro).connect(salida).connect(busMusica);
  amplificador = formador;
  return amplificador;
}
function guitarra(notas, t, dur, vol) {
  if (!ac) return;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(distorsion());
  for (const n of notas) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(n);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

// ---------- efectos del juego ----------

const ahora = () => (ac ? ac.currentTime : 0);

export const sonar = {
  bocina() { const t = ahora(); tono(392, t, 0.12, { vol: 0.12 }); tono(392, t + 0.18, 0.18, { vol: 0.12 }); },
  moneda() { const t = ahora(); tono(1320, t, 0.05, { vol: 0.05 }); tono(1760, t + 0.05, 0.08, { vol: 0.05 }); },
  sube(combo = 1) {
    const t = ahora();
    const base = 520 * (1 + (combo - 1) * 0.12);
    [1, 1.25, 1.5, 2].forEach((m, i) => tono(base * m, t + i * 0.06, 0.1, { vol: 0.08, tipo: 'triangle' }));
  },
  choque() {
    const t = ahora();
    ruido(t, 0.35, { vol: 0.5, filtro: 600, tipo: 'lowpass' });
    tono(110, t, 0.3, { tipo: 'sawtooth', vol: 0.2, hasta: 40 });
    if (busMusica) {
      busMusica.gain.cancelScheduledValues(t);
      busMusica.gain.setValueAtTime(0.12, t);
      busMusica.gain.linearRampToValueAtTime(0.5, t + 0.8);
    }
  },
  dejado() { const t = ahora(); tono(330, t, 0.15, { vol: 0.07, tipo: 'triangle' }); tono(247, t + 0.15, 0.25, { vol: 0.07, tipo: 'triangle' }); },
  turbo() { tono(300, ahora(), 0.6, { tipo: 'sawtooth', vol: 0.08, hasta: 1400 }); ruido(ahora(), 0.6, { vol: 0.08, filtro: 3000 }); },
  fin() { const t = ahora(); [392, 330, 262, 196].forEach((f, i) => tono(f, t + i * 0.16, 0.2, { vol: 0.1 })); },
};

// ---------- la radio ----------

const ACORDES = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // la m, fa, do, sol
const RAIZ = [45, 41, 48, 43];

// Melodía propia en la menor, ritmo 3+3+2: una frase de 4 compases.
const RIFF = [
  [76, 0, 0, 76, 0, 0, 74, 0, 72, 0, 0, 69, 0, 72, 0, 0],
  [77, 0, 0, 77, 0, 0, 76, 0, 72, 0, 0, 69, 0, 72, 0, 0],
  [79, 0, 0, 79, 0, 0, 77, 0, 76, 0, 0, 72, 0, 76, 0, 0],
  [74, 0, 0, 74, 0, 0, 76, 0, 74, 0, 0, 71, 0, 74, 0, 0],
];

const MARIMBA = [
  [69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0, 67, 0],
  [69, 0, 72, 0, 77, 0, 76, 0, 72, 0, 0, 0, 69, 0, 0, 0],
  [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0, 71, 0],
  [74, 0, 71, 0, 67, 0, 71, 0, 74, 0, 0, 0, 76, 0, 74, 0],
];

// Salsa en la menor (la m, re m, mi7, la m). Cada "compás" de 16 pasos son dos compases reales en corcheas:
// así cabe una vuelta entera de la clave 3-2.
const SALSA_ACORDES = [[57, 60, 64], [62, 65, 69], [56, 59, 62, 64], [57, 60, 64]];
const SALSA_RAIZ = [45, 50, 40, 45];
const CLAVE = [0, 3, 6, 10, 12];
const MONTUNO = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15];
const METALES = [
  [76, 0, 0, 76, 0, 0, 77, 0, 0, 0, 76, 0, 74, 0, 0, 0],
  [74, 0, 0, 74, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 0, 0],
  [71, 0, 0, 71, 0, 0, 74, 0, 0, 0, 71, 0, 68, 0, 0, 0],
  [72, 0, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Rock en mi menor (mi, do, sol, re) con un solo propio en pentatónica.
const ROCK_RAIZ = [40, 36, 43, 38];
const SOLO = [
  [76, 0, 0, 79, 0, 0, 81, 0, 79, 0, 76, 0, 74, 0, 76, 0],
  [72, 0, 0, 76, 0, 0, 79, 0, 76, 0, 72, 0, 71, 0, 72, 0],
  [79, 0, 0, 81, 0, 0, 83, 0, 81, 0, 79, 0, 76, 0, 79, 0],
  [74, 0, 0, 78, 0, 0, 81, 0, 78, 0, 74, 0, 76, 0, 0, 0],
];

const ESTACIONES = {
  techno: {
    nombre: 'Tecno',
    bpm: 136,
    tocar(compas, pos, t, paso, x) {
      const c = compas % 4;
      const parte = compas < 16 ? compas : 4 + ((compas - 4) % 12);
      if (pos % 4 === 0) bombo(t);
      if (pos % 4 === 2) platillo(t, true, 0.1);
      if (x > 0.35 && pos % 2 === 1) platillo(t, false, 0.05);
      if (parte >= 2 && (pos === 4 || pos === 12)) palmas(t);
      if (pos % 4 === 2) bajo(midi(RAIZ[c] + 12), t, paso * 1.8, { corte: 350 + x * 1400 });
      if (pos % 4 === 3 && x > 0.5) bajo(midi(RAIZ[c] + 24), t, paso, { corte: 500 + x * 1400, vol: 0.12 });
      if (parte >= 4 && [0, 3, 6, 10, 13].includes(pos)) golpeRave(ACORDES[c], t, paso * 2.2, 1200 + x * 2600);
      if (parte >= 8) {
        const n = RIFF[c][pos];
        if (n) {
          tono(midi(n), t, paso * 2.4, { tipo: 'square', vol: 0.05, destino: busMusica });
          tono(midi(n) * 1.004, t, paso * 2.4, { tipo: 'sawtooth', vol: 0.04, destino: busMusica });
        }
      }
      if (x > 0.6 && parte >= 4) {
        const nota = ACORDES[c][[0, 1, 2, 1][pos % 4]] + 24;
        tono(midi(nota), t, paso * 0.8, { tipo: 'square', vol: 0.025, destino: busMusica });
      }
    },
  },
  reggaeton: {
    nombre: 'Reggaetón',
    bpm: 94,
    tocar(compas, pos, t, paso, x) {
      const c = compas % 4;
      const relleno = compas % 8 === 7 && pos >= 12;
      if (pos % 4 === 0) bombo(t, 0.95);
      if (relleno) caja(t, 0.2 + (pos - 12) * 0.06);
      else if ([3, 6, 11, 14].includes(pos)) caja(t, 0.32);
      if (pos % 2 === 0) platillo(t, false, 0.06 + x * 0.04);
      if (x > 0.45 && pos % 2 === 1) platillo(t, false, 0.03);
      if ([0, 3, 6, 8, 11, 14].includes(pos)) {
        const f = midi(RAIZ[c]);
        tono(f, t, paso * (pos === 14 ? 2 : 2.6), { tipo: 'sine', vol: 0.32, destino: busMusica, hasta: pos === 14 ? f * 0.8 : null });
      }
      if (compas >= 2 && [0, 3, 6, 10].includes(pos)) {
        for (const n of ACORDES[c]) tono(midi(n), t, paso * 1.6, { tipo: 'triangle', vol: 0.035, destino: busMusica });
      }
      if (compas >= 4) {
        const n = MARIMBA[c][pos];
        if (n) marimba(n, t, 0.11 + x * 0.04);
      }
    },
  },
  cumbia: {
    nombre: 'Cumbia',
    bpm: 104,
    tocar(compas, pos, t, paso, x) {
      if (pos % 2 === 1) return;
      const corchea = pos / 2;
      const c = compas % 4;
      const bajos = [RAIZ[c] + 12, 0, RAIZ[c] + 7, 0, RAIZ[c] + 12, 0, RAIZ[c] + 7, RAIZ[c] + 10];
      if (bajos[corchea]) tono(midi(bajos[corchea]), t, paso * 3, { tipo: 'triangle', vol: 0.2, destino: busMusica });
      if (corchea % 2 === 1) ruido(t, paso * 1.4, { vol: 0.06, filtro: 4500, destino: busMusica });
      if (corchea % 4 === 2) tono(1600, t, 0.05, { tipo: 'square', vol: 0.03, destino: busMusica });
      if (corchea % 4 === 0) bombo(t, 0.5);
      if (compas >= 2) {
        const n = RIFF[c][pos];
        if (n) tono(midi(n - 12), t, paso * 2, { tipo: 'square', vol: 0.03 + x * 0.01, destino: busMusica });
      }
    },
  },
  salsa: {
    nombre: 'Salsa',
    bpm: 96,
    tocar(compas, pos, t, paso, x) {
      const c = compas % 4;
      const acorde = SALSA_ACORDES[c];
      if (CLAVE.includes(pos)) clave(t);
      if (pos % 2 === 0) campana(t, pos % 4 === 0 ? 0.05 : 0.03);
      if (pos === 2 || pos === 10) tumbadora(t, 'tapado');
      if ([6, 7, 14, 15].includes(pos)) tumbadora(t, pos % 2 ? 'agudo' : 'grave');
      // tumbao: el bajo cae en el 2 "y" y en el 4, y el último anticipa el acorde que viene
      const bajoSalsa = (n, dur) => tono(midi(n), t, dur, { tipo: 'triangle', vol: 0.24, destino: busMusica });
      if (pos === 3 || pos === 11) bajoSalsa(SALSA_RAIZ[c] + 7, paso * 2.6);
      if (pos === 6) bajoSalsa(SALSA_RAIZ[c], paso * 4);
      if (pos === 14) bajoSalsa(SALSA_RAIZ[(c + 1) % 4], paso * 4);
      if (compas >= 1 && MONTUNO.includes(pos)) {
        const i = MONTUNO.indexOf(pos);
        piano(i % 2 === 0 ? [acorde[0] + 12] : acorde.slice(1), t, paso * 1.3);
      }
      // el mambo de metales entra cada cuatro vueltas y descansa las siguientes cuatro
      if (compas >= 4 && Math.floor(compas / 4) % 2 === 1) {
        const n = METALES[c][pos];
        if (n) metales(n, t, paso * 1.6, x);
      }
      if (x > 0.5 && pos % 2 === 1) ruido(t, 0.05, { vol: 0.04, filtro: 6000, tipo: 'highpass', destino: busMusica });
    },
  },
  rock: {
    nombre: 'Rock',
    bpm: 148,
    tocar(compas, pos, t, paso, x) {
      const c = compas % 4;
      const raiz = ROCK_RAIZ[c];
      if (pos === 0 || pos === 8 || pos === 10) bombo(t, 0.9);
      if (compas % 8 === 7 && pos >= 12) caja(t, 0.25 + (pos - 12) * 0.07);
      else if (pos === 4 || pos === 12) caja(t, 0.45);
      if (pos % 2 === 0) platillo(t, false, 0.07 + x * 0.03);
      if (pos === 0 && compas % 4 === 0) ruido(t, 0.9, { vol: 0.1, filtro: 6000, tipo: 'highpass', destino: busMusica });
      if (pos % 2 === 0) bajo(midi(raiz), t, paso * 1.8, { tipo: 'square', vol: 0.16, corte: 300 + x * 600 });
      if (compas >= 1 && pos % 2 === 0) {
        const acento = [0, 6, 10].includes(pos);
        guitarra([raiz + 12, raiz + 19, raiz + 24], t, acento ? paso * 3 : paso * 0.9, acento ? 0.6 : 0.3);
      }
      if (compas >= 8 && Math.floor(compas / 4) % 2 === 0) {
        const n = SOLO[c][pos];
        if (n) guitarra([n], t, paso * 2.4, 0.5);
      }
    },
  },
};

export const RADIOS = ['techno', 'reggaeton', 'cumbia', 'salsa', 'rock', 'apagada'];
export const nombreRadio = (r) => ESTACIONES[r]?.nombre || 'Apagada';

let musica = null;

export function musicaInicio(radio = 'techno') {
  if (!ac || musica || !ESTACIONES[radio]) return;
  const estacion = ESTACIONES[radio];
  let siguiente = ac.currentTime + 0.08;
  let paso = 0;
  musica = { rapidez: 1, intensidad: 0 };
  busMusica.gain.cancelScheduledValues(ac.currentTime);
  busMusica.gain.setValueAtTime(0.5, ac.currentTime);
  musica.timer = setInterval(() => {
    while (siguiente < ac.currentTime + 0.2) {
      const duracion = 60 / estacion.bpm / 4 / musica.rapidez;
      estacion.tocar(Math.floor(paso / 16), paso % 16, siguiente, duracion, musica.intensidad);
      siguiente += duracion;
      paso += 1;
    }
  }, 50);
}

// r: 1 al arrancar; intensidad: 0 a 1 según la velocidad de la combi.
export function musicaRitmo(r, intensidad) {
  if (!musica) return;
  musica.rapidez = r;
  musica.intensidad = intensidad;
}

export function musicaFin() {
  if (!musica) return;
  clearInterval(musica.timer);
  musica = null;
}
