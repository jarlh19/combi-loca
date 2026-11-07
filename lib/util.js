export const json = (datos, estado = 200, extra = {}) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extra }
  });

export async function sha256(texto){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 con un secreto del servidor. Para datos cortos como una IP: un
// sha256 simple se revierte probando todas las IPv4 en minutos; sin el
// secreto, esta huella no.
export async function huella(texto, secreto){
  const c = new TextEncoder();
  const llave = await crypto.subtle.importKey("raw", c.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", llave, c.encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
