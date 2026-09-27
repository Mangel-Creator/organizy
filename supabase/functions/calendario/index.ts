// Organizy · otros calendarios: trae un calendario (.ics) para la versión web.
//
// El navegador no deja a la web leer el enlace iCal de Google Calendar o de iCloud
// (esas webs no lo permiten), así que la web se lo pide a esta función, que lo
// descarga y lo devuelve tal cual. No guarda nada y en los registros no apunta ni el
// enlace ni lo que trae (el enlace funciona como una llave). La app del móvil no pasa
// por aquí: lo descarga ella misma.
//
// Seguridad: solo sitios de calendarios conocidos (para que nadie la use para pedir
// cualquier dirección), como mucho 5 MB y 60 veces al día por persona.

import { respuestaJson, respuestaPrevia } from '../_shared/cors.ts';
import { numeroDeEntorno, sumarUso } from '../_shared/limite.ts';
import { usuarioDeLaPeticion } from '../_shared/usuario.ts';

const LIMITE_POR_USUARIO = numeroDeEntorno('CALENDARIO_LIMITE_USUARIO', 60);
const LIMITE_GLOBAL = numeroDeEntorno('CALENDARIO_LIMITE_GLOBAL', 3000);
const MAX_BYTES = 5 * 1024 * 1024;
const ESPERA_MAX_MS = 15_000;
const MAX_REDIRECCIONES = 3;

// Google Calendar, iCloud (pNN-caldav.icloud.com) y Outlook.
const SITIOS = [/^calendar\.google\.com$/, /^([a-z0-9-]+\.)*icloud\.com$/, /^outlook\.(office365|live|office)\.com$/];

function enlaceValido(texto: unknown): URL | null {
  if (typeof texto !== 'string' || texto.length > 2000) return null;
  try {
    const url = new URL(texto.trim().replace(/^webcals?:\/\//i, 'https://'));
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return SITIOS.some((s) => s.test(url.hostname)) ? url : null;
  } catch {
    return null;
  }
}

// Sigue las redirecciones a mano para comprobar que no salen de los sitios permitidos.
async function descargar(url: URL): Promise<{ texto: string } | { error: string }> {
  let actual = url;
  for (let i = 0; i <= MAX_REDIRECCIONES; i++) {
    const respuesta = await fetch(actual, {
      redirect: 'manual',
      headers: { Accept: 'text/calendar', 'User-Agent': 'Organizy' },
      signal: AbortSignal.timeout(ESPERA_MAX_MS),
    });
    if (respuesta.status >= 300 && respuesta.status < 400) {
      const siguiente = enlaceValido(new URL(respuesta.headers.get('Location') ?? '', actual).toString());
      if (!siguiente) return { error: 'enlace' };
      actual = siguiente;
      continue;
    }
    if (!respuesta.ok || !respuesta.body) return { error: 'no-encontrado' };
    // Se lee por trozos para cortar si pasa del máximo.
    const lector = respuesta.body.getReader();
    const trozos: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        await lector.cancel();
        return { error: 'demasiado-grande' };
      }
      trozos.push(value);
    }
    const bytes = new Uint8Array(total);
    let posicion = 0;
    for (const t of trozos) {
      bytes.set(t, posicion);
      posicion += t.length;
    }
    const texto = new TextDecoder().decode(bytes);
    if (!texto.trimStart().startsWith('BEGIN:VCALENDAR')) return { error: 'no-es-calendario' };
    return { texto };
  }
  return { error: 'enlace' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return respuestaPrevia(req);
  if (req.method !== 'POST') return respuestaJson(req, { error: 'metodo' }, 405);

  const usuario = await usuarioDeLaPeticion(req);
  if (!usuario) return respuestaJson(req, { error: 'sin-sesion' }, 401);

  const cuerpo = await req.json().catch(() => null);
  const url = enlaceValido(cuerpo?.enlace);
  if (!url) return respuestaJson(req, { error: 'enlace' }, 400);

  try {
    const uso = await sumarUso(usuario, 'calendario', LIMITE_POR_USUARIO, LIMITE_GLOBAL);
    if (!uso.permitido) return respuestaJson(req, { error: uso.motivo }, 429);
  } catch (error) {
    console.error(error);
    return respuestaJson(req, { error: 'servidor' }, 500);
  }

  try {
    const resultado = await descargar(url);
    if ('error' in resultado) {
      console.log(`calendario: ${resultado.error}`);
      return respuestaJson(req, { error: resultado.error }, 422);
    }
    console.log(`calendario ok · ${resultado.texto.length} caracteres`);
    return respuestaJson(req, { ics: resultado.texto });
  } catch (error) {
    console.error('calendario: fallo al descargar', error instanceof Error ? error.name : 'desconocido');
    return respuestaJson(req, { error: 'no-encontrado' }, 502);
  }
});
