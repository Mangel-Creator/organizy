import { useEffect, useSyncExternalStore } from 'react';

import type { TipoEvento } from './eventos/tipos';
import { guardarAjuste, leerAjuste } from './ajustes';

// Calendarios de fuera (Google, iCloud, Outlook...) que se traen a Organizy con su
// enlace iCal. Se guardan en AsyncStorage ("organizy:calendarios"). El enlace funciona
// como una llave (quien lo tenga ve el calendario), así que no va en la copia de
// seguridad: en otro móvil se vuelve a pegar. La lógica está en services/calendarios.

export type Calendario = {
  id: string; // resumen del enlace: el mismo enlace da el mismo id (ver idFuente)
  nombre: string; // "Google Calendar"
  enlace: string; // https://...
  tipo: TipoEvento; // cómo se ven sus eventos en Organizy
  ultimaVez: string | null; // ISO de la última vez que se trajo bien
  error: string | null; // el último fallo, para enseñarlo
  todoElDia: number; // eventos de todo el día que no se traen
};

const CLAVE = 'calendarios';

let estado: { cargado: boolean; calendarios: Calendario[] } = { cargado: false, calendarios: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(calendarios: Calendario[]) {
  estado = { cargado: true, calendarios };
  oyentes.forEach((avisar) => avisar());
}

function cargar(): Promise<void> {
  if (!cargando) {
    cargando = leerAjuste<Calendario[]>(CLAVE, []).then((c) => cambiar(Array.isArray(c) ? c : []));
  }
  return cargando;
}

export async function leerCalendarios(): Promise<Calendario[]> {
  await cargar();
  return estado.calendarios;
}

// Crea o sustituye (por id).
export async function guardarCalendario(calendario: Calendario): Promise<void> {
  await cargar();
  const lista = [...estado.calendarios.filter((c) => c.id !== calendario.id), calendario];
  cambiar(lista);
  await guardarAjuste(CLAVE, lista);
}

export async function quitarCalendario(id: string): Promise<void> {
  await cargar();
  const lista = estado.calendarios.filter((c) => c.id !== id);
  cambiar(lista);
  await guardarAjuste(CLAVE, lista);
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

const leerEstado = () => estado;

export function useCalendarios() {
  useEffect(() => {
    cargar();
  }, []);
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
