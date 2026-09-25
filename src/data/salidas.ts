import { useSyncExternalStore } from 'react';

import type { ModoViaje, Punto } from '@/services/rutas/tipos';

import { guardarAjuste, leerAjuste } from './ajustes';

// Hora de salida calculada para las próximas citas con lugar (fase 6). La calcula
// services/rutas/actualizar.ts con el tráfico previsto y la guarda aquí, en
// AsyncStorage ("organizy:salidas"), para Hoy, el Mapa y el aviso "Sal ya".
//
//   - En pantallas: const salida = useSalida(eventoId, dia);
//   - Fuera de pantallas: await leerSalidas();

export type Salida = {
  clave: string; // "<id del evento>:<día>"
  eventoId: string;
  dia: string;
  titulo: string; // del evento
  lugar: string; // "Oficina", "casa" o la dirección
  llegada: string; // ISO: hora de inicio del evento
  salida: string; // ISO: hora a la que hay que salir (con 5 min de margen)
  duracionSeg: number; // trayecto con el tráfico previsto
  retrasoSeg: number; // lo que añade el tráfico
  modo: ModoViaje;
  calculadaEl: string; // ISO
  origen: Punto; // desde dónde se calculó
};

export type Salidas = Record<string, Salida>;

const CLAVE = 'salidas';

let salidas: Salidas = {};
let cargando: Promise<Salidas> | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((o) => o());
}

export function leerSalidas(): Promise<Salidas> {
  if (!cargando) {
    cargando = leerAjuste<Salidas>(CLAVE, {}).then((guardadas) => {
      salidas = guardadas ?? {};
      avisar();
      return salidas;
    });
  }
  return cargando.then(() => salidas);
}

// Sustituye todas las salidas guardadas (las de citas que ya pasaron se quitan).
export async function guardarSalidas(nuevas: Salidas): Promise<void> {
  await leerSalidas();
  salidas = nuevas;
  avisar();
  await guardarAjuste(CLAVE, salidas);
}

export function suscribirseSalidas(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leerEstado() {
  return salidas;
}

export function useSalidas(): Salidas {
  return useSyncExternalStore(suscribirseSalidas, leerEstado, leerEstado);
}

export function useSalida(eventoId: string, dia: string): Salida | null {
  return useSalidas()[`${eventoId}:${dia}`] ?? null;
}
