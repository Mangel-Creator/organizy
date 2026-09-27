import { AppState } from 'react-native';

import { cargarCorreos, guardarConexion, guardarCorreos, leerCorreos, type CorreoResumido } from '@/data/correos';
import { borrarEvento, guardarEvento, leerEventos, nuevoId } from '@/data/eventos';
import { datosPublicosSupabase } from '@/data/supabase';
import { claveDia } from '@/services/fechas';
import { escucharPush, tokenDeAvisos } from '@/services/planes/push';

import { correosSinTarea, leerEnlace, mezclarCorreos, tareaDeCorreo, validarRemoto } from './correos';

// Resúmenes de correo (fase 11). El ayudante de Gmail del usuario (en su cuenta de
// Google, gmail/organizy-correo.js) mira el correo cada 10 minutos, avisa al móvil y
// guarda 7 días de títulos y resúmenes. La app se los pide al abrirse, al volver a
// ella y al llegar un aviso de correo, y apunta los plazos como tareas.
//
// Al pedirlos, la app le pasa su dirección de avisos (para que avise a este móvil)
// y la dirección y la clave pública del servidor de Organizy (para la IA, si algún
// día está la clave de Anthropic). Nada de esto sale de la cuenta del usuario salvo
// eso.

export * from './correos';

type Respuesta =
  | { ok: true; correos: ReturnType<typeof validarRemoto>[]; ultimaRevision: string | null }
  | { ok: false; motivo: 'sin-conexion' | 'no-responde' };

async function pedirAlAyudante(enlace: string): Promise<Respuesta> {
  const token = await tokenDeAvisos().catch(() => null);
  const control = new AbortController();
  const espera = setTimeout(() => control.abort(), 25000);
  try {
    // text/plain: así el navegador no hace la pregunta previa de CORS, que Google
    // no contesta. Google responde con una redirección que fetch sigue sola.
    const respuesta = await fetch(enlace, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, supabase: datosPublicosSupabase }),
      signal: control.signal,
    });
    const datos = (await respuesta.json().catch(() => null)) as {
      ok?: boolean;
      correos?: unknown[];
      ultimaRevision?: string | null;
    } | null;
    if (!respuesta.ok || !datos?.ok || !Array.isArray(datos.correos)) return { ok: false, motivo: 'no-responde' };
    return {
      ok: true,
      correos: datos.correos.map(validarRemoto),
      ultimaRevision: typeof datos.ultimaRevision === 'string' ? datos.ultimaRevision : null,
    };
  } catch {
    return { ok: false, motivo: control.signal.aborted ? 'no-responde' : 'sin-conexion' };
  } finally {
    clearTimeout(espera);
  }
}

// Apunta como tarea cada plazo nuevo. Si luego se borra la tarea, no se vuelve a crear.
async function crearTareas(correos: CorreoResumido[]): Promise<CorreoResumido[]> {
  const pendientes = new Set(correosSinTarea(correos, claveDia(new Date())).map((c) => c.id));
  if (pendientes.size === 0) return correos;
  const resultado: CorreoResumido[] = [];
  for (const correo of correos) {
    if (!pendientes.has(correo.id)) {
      resultado.push(correo);
      continue;
    }
    const tarea = tareaDeCorreo(correo, nuevoId());
    await guardarEvento(tarea);
    resultado.push({ ...correo, eventoId: tarea.id });
  }
  return resultado;
}

let trayendo: Promise<void> | null = null;

// Trae los correos del ayudante. Si ya se está haciendo, espera a que termine.
export function actualizarCorreos(): Promise<void> {
  if (!trayendo) {
    trayendo = (async () => {
      const { conexion } = await leerCorreos();
      if (!conexion) return;
      const respuesta = await pedirAlAyudante(conexion.enlace);
      const actual = (await leerCorreos()).conexion;
      if (!actual || actual.enlace !== conexion.enlace) return; // se desconectó mientras tanto
      if (!respuesta.ok) {
        await guardarConexion({ ...actual, error: respuesta.motivo });
        return;
      }
      const remotos = respuesta.correos.filter((c): c is NonNullable<typeof c> => c !== null);
      const ahora = new Date();
      const mezclados = await crearTareas(mezclarCorreos((await leerCorreos()).correos, remotos, ahora));
      await guardarCorreos(mezclados);
      await guardarConexion({
        ...actual,
        actualizadoEl: ahora.toISOString(),
        ultimaRevision: respuesta.ultimaRevision,
        error: null,
      });
    })().finally(() => {
      trayendo = null;
    });
  }
  return trayendo;
}

export type ResultadoConectar = { ok: true } | { ok: false; motivo: 'enlace' | 'sin-conexion' | 'no-responde' };

// Pega el enlace del ayudante: comprueba que responde y trae los correos.
export async function conectarCorreo(texto: string): Promise<ResultadoConectar> {
  const enlace = leerEnlace(texto);
  if (!enlace) return { ok: false, motivo: 'enlace' };
  const respuesta = await pedirAlAyudante(enlace);
  if (!respuesta.ok) return respuesta;
  await guardarConexion({
    enlace,
    conectadoEl: new Date().toISOString(),
    actualizadoEl: null,
    ultimaRevision: null,
    error: null,
  });
  await actualizarCorreos();
  return { ok: true };
}

// Deja de pedir correos y olvida los guardados. Las tareas creadas se quedan.
export async function desconectarCorreo(): Promise<void> {
  await guardarConexion(null);
  await guardarCorreos([]);
}

export async function marcarCorreosVistos(): Promise<void> {
  const { correos } = await leerCorreos();
  if (correos.some((c) => !c.visto)) await guardarCorreos(correos.map((c) => (c.visto ? c : { ...c, visto: true })));
}

// "No es un plazo": quita su tarea (si sigue sin hacer) y lo deja como resumen.
export async function quitarPlazo(id: string): Promise<void> {
  const { correos } = await leerCorreos();
  const correo = correos.find((c) => c.id === id);
  if (!correo) return;
  if (correo.eventoId) {
    const tarea = (await leerEventos()).find((e) => e.id === correo.eventoId);
    if (tarea && !tarea.hecha) await borrarEvento(tarea.id);
  }
  await guardarCorreos(correos.map((c) => (c.id === id ? { ...c, noEsPlazo: true } : c)));
}

// Se llama una vez al arrancar la app: trae los correos al abrirla, al volver a ella
// y cuando llega un aviso de correo con la app abierta.
export function iniciarCorreo(): () => void {
  cargarCorreos().then(() => actualizarCorreos().catch(() => {}));
  const app = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') actualizarCorreos().catch(() => {});
  });
  const quitarPush = escucharPush('correo', () => actualizarCorreos().catch(() => {}));
  return () => {
    app.remove();
    quitarPush();
  };
}
