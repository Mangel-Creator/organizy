import { useEffect, useSyncExternalStore } from 'react';

import { estadoEmpresaActual, leerEmpresa, suscribirseEmpresa, type EstadoEmpresa } from '@/data/empresa';
import { cargarEventos, leerEventos, suscribirseEventos, useEventos, type EstadoEventos, type Evento } from '@/data/eventos';
import { estadoPerfilActual, suscribirsePerfil, usePerfil, type Perfil } from '@/data/perfil';
import { sitioTrabajo } from '@/services/agenda/lugar';
import { eventosDeEmpresa } from '@/services/empresa/calendario';
import { claveDia } from '@/services/fechas';

// La agenda: tus eventos y, con Organizy grupal activado y dentro de una empresa, lo de
// la empresa (tus turnos, sus eventos y tus tareas asignadas) como eventos más, con la
// marca "empresa". Es lo que usan Hoy, Semana, los avisos, la hora de salida y las alarmas.
// Sin empresa es exactamente la lista de tus eventos (el mismo array).
//
//   - En pantallas: const { cargado, eventos } = useAgenda();
//   - Fuera de pantallas: await leerAgenda() / suscribirseAgenda(...)
// Para cambiar tus eventos se sigue usando data/eventos (lo de la empresa no se edita aquí).

type Opciones = { tareas?: boolean };

let cache: { propios: Evento[]; empresa: unknown; trabajo: string | null; hoy: string; tareas: boolean; eventos: Evento[] } | null = null;

// Todo lo que usa se le pasa (no lo lee de fuera): así el compilador de React sabe
// cuándo volver a calcularlo.
function combinar(propios: Evento[], empresa: EstadoEmpresa, perfil: Perfil | null, opciones: Opciones = {}): Evento[] {
  const { modo, situacion } = empresa;
  if (!modo || situacion.fase !== 'dentro') return propios;
  const trabajo = sitioTrabajo(perfil)?.id ?? null;
  const hoy = claveDia(new Date());
  const tareas = opciones.tareas !== false;
  if (
    cache &&
    cache.propios === propios &&
    cache.empresa === situacion.datos &&
    cache.trabajo === trabajo &&
    cache.hoy === hoy &&
    cache.tareas === tareas
  ) {
    return cache.eventos;
  }
  const eventos = [...propios, ...eventosDeEmpresa(situacion.datos, hoy, trabajo, { tareas })];
  cache = { propios, empresa: situacion.datos, trabajo, hoy, tareas, eventos };
  return eventos;
}

// Las tareas de la empresa no van a los avisos del cierre del día ("¿Las paso a
// mañana?"): no se pueden mover desde aquí. Para eso, { tareas: false }.
//
// La empresa de ejemplo solo se ve en las pantallas: no programa avisos ni cambia la hora
// de salida ni las alarmas (leerAgenda es lo que usan).
export async function leerAgenda(opciones: Opciones = {}): Promise<Evento[]> {
  const [propios] = await Promise.all([leerEventos(), leerEmpresa()]);
  const empresa = estadoEmpresaActual();
  if (empresa.situacion.fase === 'dentro' && empresa.situacion.datos.ejemplo) return propios;
  return combinar(propios, empresa, estadoPerfilActual().perfil, opciones);
}

export function suscribirseAgenda(avisar: () => void): () => void {
  const quitar = [suscribirseEventos(avisar), suscribirseEmpresa(avisar), suscribirsePerfil(avisar)];
  return () => quitar.forEach((q) => q());
}

let estadoCache: { base: EstadoEventos; eventos: Evento[]; estado: EstadoEventos } | null = null;

// El mismo objeto mientras no cambie nada (para no volver a pintar de más).
function estadoDe(propios: EstadoEventos, eventos: Evento[]): EstadoEventos {
  if (eventos === propios.eventos) return propios;
  if (estadoCache && estadoCache.base === propios && estadoCache.eventos === eventos) return estadoCache.estado;
  const estado = { cargado: propios.cargado, eventos };
  estadoCache = { base: propios, eventos, estado };
  return estado;
}

export function useAgenda(): EstadoEventos {
  const propios = useEventos();
  useEffect(() => {
    cargarEventos();
    leerEmpresa();
  }, []);
  // Se vuelve a pintar cuando cambia lo de la empresa o el perfil (el sitio Trabajo).
  const empresa = useSyncExternalStore(suscribirseEmpresa, estadoEmpresaActual, estadoEmpresaActual);
  const { perfil } = usePerfil();
  return estadoDe(propios, combinar(propios.eventos, empresa, perfil));
}
