// GET /api/puntajes  → el top, con el mejor puntaje de cada nombre
// POST /api/puntajes → guarda el puntaje de una partida (una sola vez por ficha)
import { json, sha256 } from "../../lib/util.js";
import { leerFicha, nombreLimpio, revisarPuntaje } from "../../lib/ranking.js";

const TOP = 20;
const POR_MINUTO = 6;   // por IP; en el evento mucha gente comparte la misma

export async function onRequestGet({ env }){
  try {
    const { results } = await env.DB.prepare(
      `SELECT nombre, puntaje, pasajeros FROM (
         SELECT nombre, puntaje, pasajeros,
                ROW_NUMBER() OVER (PARTITION BY clave ORDER BY puntaje DESC, creado ASC) AS n
         FROM puntajes
       ) WHERE n = 1 ORDER BY puntaje DESC LIMIT ?`
    ).bind(TOP).all();
    return json({ top: results }, 200, { "Cache-Control": "public, max-age=10" });
  } catch (e){
    return json({ error: "servidor" }, 500);
  }
}

export async function onRequestPost({ request, env }){
  try {
    if (!env.RUN_SECRET) return json({ error: "sin-ranking" }, 503);
    if (Number(request.headers.get("Content-Length") || 0) > 2000) return json({ error: "muy-grande" }, 413);
    let b;
    try { b = await request.json(); } catch { return json({ error: "formato" }, 400); }
    if (!b || typeof b !== "object") return json({ error: "formato" }, 400);

    const ficha = await leerFicha(env.RUN_SECRET, b.ficha);
    if (!ficha) return json({ error: "ficha" }, 400);
    const nombre = nombreLimpio(b.nombre);
    if (!nombre) return json({ error: "nombre" }, 400);
    const ahora = Date.now();
    const datos = { puntaje: b.puntaje, pasajeros: b.pasajeros, duracionMs: b.duracionMs };
    const problema = revisarPuntaje(datos, ficha.inicio, ahora);
    if (problema) return json({ error: problema }, 400);

    const ip = await sha256("combi:" + (request.headers.get("CF-Connecting-IP") || ""));
    const reciente = await env.DB.prepare("SELECT COUNT(*) AS n FROM puntajes WHERE ip = ? AND creado > ?")
      .bind(ip, ahora - 60_000).first();
    if (reciente && reciente.n >= POR_MINUTO) return json({ error: "demasiados" }, 429);

    const r = await env.DB.prepare(
      `INSERT INTO puntajes (partida, nombre, clave, puntaje, pasajeros, duracion, ip, creado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(partida) DO NOTHING`
    ).bind(ficha.id, nombre, nombre.toLowerCase(), datos.puntaje, datos.pasajeros, datos.duracionMs, ip, ahora).run();
    if (!r.meta.changes) return json({ error: "repetida" }, 409);

    const arriba = await env.DB.prepare("SELECT COUNT(DISTINCT clave) AS n FROM puntajes WHERE puntaje > ?")
      .bind(datos.puntaje).first();
    return json({ ok: true, puesto: (arriba?.n || 0) + 1 });
  } catch (e){
    return json({ error: "servidor" }, 500);
  }
}
