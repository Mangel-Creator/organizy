import { useSyncExternalStore } from 'react';

import type { Muestra } from '@/services/rutas/horasPunta';

import { guardarAjuste, leerAjuste } from './ajustes';

// Horas punta de los trayectos habituales (fase 6). Se calculan una vez por semana
// (services/rutas/actualizar.ts) y se guardan en "organizy:horasPunta".
//
//   - En pantallas: const horasPunta = useHorasPunta();

export type Trayecto = {
  nombre: string; // "Casa → Trabajo"
  muestras: Muestra[];
};

export type HorasPunta = {
  calculadasEl: string; // ISO
  // Para saber si hay que repetirlas al cambiar la dirección de casa o del trabajo.
  huella: string;
  trayectos: Trayecto[];
  horas: number[]; // minutos desde medianoche con atasco, ya calculados
};

const CLAVE = 'horasPunta';

let estado: HorasPunta | null = null;
let cargando: Promise<HorasPunta | null> | null = null;
const oyentes = new Set<() => void>();

export function leerHorasPunta(): Promise<HorasPunta | null> {
  if (!cargando) {
    cargando = leerAjuste<HorasPunta | null>(CLAVE, null).then((guardadas) => {
      estado = guardadas;
      oyentes.forEach((o) => o());
      return estado;
    });
  }
  return cargando.then(() => estado);
}

export async function guardarHorasPunta(nuevas: HorasPunta): Promise<void> {
  await leerHorasPunta();
  estado = nuevas;
  oyentes.forEach((o) => o());
  await guardarAjuste(CLAVE, nuevas);
}

function suscribirse(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leerEstado() {
  return estado;
}

export function useHorasPunta(): HorasPunta | null {
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
