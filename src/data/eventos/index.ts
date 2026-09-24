import { useEffect, useSyncExternalStore } from 'react';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import { claveDia } from '@/services/fechas';

import { crearEjemplos } from './ejemplos';
// En el móvil carga repositorio.ts (SQLite) y en la web repositorio.web.ts.
import { repositorio } from './repositorio';
import type { Evento } from './tipos';

export type { Evento, LugarEvento, Repeticion, TipoEvento } from './tipos';

// Eventos del calendario. Se leen todos del dispositivo una vez y se guardan
// en memoria para que todas las pantallas vean lo mismo al momento.
//
//   - En pantallas: const { cargado, eventos } = useEventos();
//   - Para cambiar: crearEvento, guardarEvento, borrarEvento, marcarHecha...

export type EstadoEventos = { cargado: boolean; eventos: Evento[] };

let estado: EstadoEventos = { cargado: false, eventos: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(eventos: Evento[]) {
  estado = { cargado: true, eventos };
  oyentes.forEach((avisar) => avisar());
}

const CLAVE_EJEMPLOS = 'ejemplosCreados';

export function cargarEventos(): Promise<void> {
  if (!cargando) {
    cargando = (async () => {
      let eventos = await repositorio.leerTodos();
      // En modo desarrollo, la primera vez se crean eventos de ejemplo.
      if (__DEV__ && eventos.length === 0 && !(await leerAjuste(CLAVE_EJEMPLOS, false))) {
        const ejemplos = crearEjemplos(claveDia(new Date()));
        for (const e of ejemplos) await repositorio.guardar(e);
        await guardarAjuste(CLAVE_EJEMPLOS, true);
        eventos = ejemplos;
      }
      cambiar(eventos);
    })();
  }
  return cargando;
}

export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Crea o actualiza un evento.
export async function guardarEvento(evento: Evento): Promise<void> {
  await cargarEventos();
  await repositorio.guardar(evento);
  cambiar([...estado.eventos.filter((e) => e.id !== evento.id), evento]);
}

export async function borrarEvento(id: string): Promise<void> {
  await cargarEventos();
  await repositorio.borrar(id);
  cambiar(estado.eventos.filter((e) => e.id !== id));
}

export async function marcarHecha(id: string, hecha: boolean): Promise<void> {
  const evento = estado.eventos.find((e) => e.id === id);
  if (evento) await guardarEvento({ ...evento, hecha });
}

// Pasa varias tareas flexibles a otro día (por ejemplo, "Pasar el resto a mañana").
export async function moverTareas(ids: string[], fecha: string): Promise<void> {
  for (const id of ids) {
    const evento = estado.eventos.find((e) => e.id === id);
    if (evento) await guardarEvento({ ...evento, fecha });
  }
}

export async function crearEventosEjemplo(): Promise<number> {
  await borrarEventosEjemplo();
  const ejemplos = crearEjemplos(claveDia(new Date()));
  for (const e of ejemplos) await repositorio.guardar(e);
  cambiar([...estado.eventos, ...ejemplos]);
  return ejemplos.length;
}

export async function borrarEventosEjemplo(): Promise<number> {
  await cargarEventos();
  const cuantos = estado.eventos.filter((e) => e.ejemplo).length;
  await repositorio.borrarEjemplos();
  cambiar(estado.eventos.filter((e) => !e.ejemplo));
  return cuantos;
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

// Para la lógica sin pantallas (por ejemplo, programar los avisos).
export async function leerEventos(): Promise<Evento[]> {
  await cargarEventos();
  return estado.eventos;
}

export { suscribirse as suscribirseEventos };

function leerEstado() {
  return estado;
}

// Hook para usar los eventos en pantallas. Los carga la primera vez.
export function useEventos(): EstadoEventos {
  useEffect(() => {
    cargarEventos();
  }, []);
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
