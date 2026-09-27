import { AppState } from 'react-native';

import { guardarCalendario, leerCalendarios, quitarCalendario, type Calendario } from '@/data/calendarios';
import { cambiarEventos, leerEventos } from '@/data/eventos';
import type { TipoEvento } from '@/data/eventos/tipos';

import { descargarCalendario, type MotivoFallo } from './descargar';
import { leerIcs, nombrePorEnlace, normalizarEnlace, ventanaDesde } from './ics';
import { cambiadoAqui, idFuente, sincronizar, textoCambios } from './sincronizar';

export { cambiadoAqui };

// Traer otros calendarios (Google, iCloud, Outlook) a Organizy con su enlace iCal.
// Se pega el enlace una vez; después se vuelve a traer solo al abrir la app (como
// mucho una vez cada hora) para que lo nuevo de fuera llegue también. Ver
// "Otros calendarios" en CLAUDE.md.

const CADA_MS = 60 * 60 * 1000;

const TEXTO_FALLO: Record<MotivoFallo | 'formato', string> = {
  'sin-conexion': 'No he podido conectar. Mira tu conexión y vuelve a probar.',
  'no-encontrado': 'Ese enlace no responde. Cópialo otra vez desde tu calendario.',
  'no-es-calendario': 'Ese enlace no es de un calendario. Busca el que acaba en .ics o empieza por webcal://.',
  limite: 'Has traído calendarios muchas veces hoy. Prueba mañana.',
  'sin-servidor': 'En esta versión no se pueden traer calendarios.',
  formato: 'He abierto el calendario pero no lo entiendo. Prueba con otro enlace.',
};

export type ResultadoTraer = { ok: true; mensaje: string } | { ok: false; error: string };

async function traer(calendario: Calendario, primeraVez: boolean): Promise<ResultadoTraer> {
  const descarga = await descargarCalendario(calendario.enlace);
  if (!descarga.ok) {
    const error = TEXTO_FALLO[descarga.motivo];
    if (!primeraVez) await guardarCalendario({ ...calendario, error });
    return { ok: false, error };
  }
  const ventana = ventanaDesde(new Date());
  let lectura;
  try {
    lectura = leerIcs(descarga.texto, ventana);
  } catch (e) {
    console.warn('No se pudo leer el calendario', e);
    const error = TEXTO_FALLO.formato;
    if (!primeraVez) await guardarCalendario({ ...calendario, error });
    return { ok: false, error };
  }
  const cambios = sincronizar(await leerEventos(), calendario.id, calendario.tipo, lectura.citas, ventana);
  await cambiarEventos(cambios.guardar, cambios.borrar);
  await guardarCalendario({
    ...calendario,
    ultimaVez: new Date().toISOString(),
    error: null,
    todoElDia: lectura.todoElDia,
  });
  return { ok: true, mensaje: textoCambios(cambios, primeraVez, lectura.todoElDia) };
}

// Añade un calendario y trae sus eventos. Si el enlace ya estaba, lo vuelve a traer.
export async function anadirCalendario(texto: string, tipo: TipoEvento): Promise<ResultadoTraer> {
  const enlace = normalizarEnlace(texto);
  if (!enlace) return { ok: false, error: 'Pega el enlace completo: empieza por https:// o webcal://.' };
  const id = idFuente(enlace);
  const todos = await leerCalendarios();
  const existente = todos.find((c) => c.id === id);
  // Dos de Google: "Google Calendar" y "Google Calendar 2".
  const base = nombrePorEnlace(enlace);
  const repetidos = todos.filter((c) => c.nombre === base || c.nombre.startsWith(`${base} `)).length;
  const calendario: Calendario = existente ?? {
    id,
    nombre: repetidos > 0 ? `${base} ${repetidos + 1}` : base,
    enlace,
    tipo,
    ultimaVez: null,
    error: null,
    todoElDia: 0,
  };
  return traer(calendario, !existente);
}

export function actualizarCalendario(calendario: Calendario): Promise<ResultadoTraer> {
  return traer(calendario, false);
}

// Quita el calendario. Con "borrarEventos", también lo que trajo y no has cambiado aquí.
export async function dejarDeTraer(calendario: Calendario, borrarEventos: boolean): Promise<void> {
  if (borrarEventos) {
    const suyos = (await leerEventos()).filter((e) => e.origen?.fuente === calendario.id && !cambiadoAqui(e));
    await cambiarEventos([], suyos.map((e) => e.id));
  }
  await quitarCalendario(calendario.id);
}

export function eventosDeCalendario(eventos: { origen?: { fuente: string } | null }[], id: string): number {
  return eventos.filter((e) => e.origen?.fuente === id).length;
}

let trayendo: Promise<void> | null = null;

// Al abrir la app y al volver a ella: trae los que lleven más de una hora sin traerse.
export function actualizarCalendarios(): Promise<void> {
  if (!trayendo) {
    trayendo = (async () => {
      const ahora = Date.now();
      for (const calendario of await leerCalendarios()) {
        const ultima = calendario.ultimaVez ? Date.parse(calendario.ultimaVez) : 0;
        if (ahora - ultima >= CADA_MS) await traer(calendario, false);
      }
    })()
      .catch((e) => console.warn('No se pudieron traer los calendarios', e))
      .finally(() => {
        trayendo = null;
      });
  }
  return trayendo;
}

export function iniciarCalendarios(): () => void {
  actualizarCalendarios();
  const app = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') actualizarCalendarios();
  });
  return () => app.remove();
}

// Más de 3 días sin traerse (por ejemplo, porque falla el enlace): se avisa en Perfil.
export function desfasado(calendario: Calendario, ahora: Date): boolean {
  if (!calendario.ultimaVez) return true;
  return ahora.getTime() - Date.parse(calendario.ultimaVez) > 3 * 24 * 60 * 60 * 1000;
}
