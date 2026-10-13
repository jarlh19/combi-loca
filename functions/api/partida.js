// POST /api/partida: una ficha firmada al arrancar, que después acompaña al puntaje.
import { json } from "../../lib/util.js";
import { crearFicha } from "../../lib/ranking.js";

export async function onRequestPost({ env }){
  if (!env.RUN_SECRET) return json({ error: "sin-ranking" }, 503);
  return json({ ficha: await crearFicha(env.RUN_SECRET) }, 200, { "Cache-Control": "no-store" });
}
