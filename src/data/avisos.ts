import { useSyncExternalStore } from 'react';

import { guardarAjuste, leerAjuste } from './ajustes';

// Qué avisos quiere recibir el usuario (se cambia en Perfil > Avisos).
// Se guarda en AsyncStorage con la clave "organizy:avisos".
//
//   - En pantallas: const ajustes = useAjustesAvisos();
//   - Fuera de pantallas: await leerAjustesAvisos();
//   - Para cambiar: await cambiarAjustesAvisos({ resumenManana: false });
//
// Para añadir un tipo de aviso nuevo (por ejemplo, en la fase 4b "Época dorada"):
// añade su interruptor aquí con su valor por defecto y su generador en
// services/avisos/planificar.ts.

export type CierreSinPendientes = 'buenas-noches' | 'nada';

export type AjustesAvisos = {
  eventos: boolean; // antes de cada evento, con la antelación del perfil o del evento
  resumenManana: boolean; // a la hora de levantarse
  cierreDia: boolean; // una hora antes de acostarse
  cierreSinPendientes: CierreSinPendientes; // qué hacer si no queda nada pendiente
};

export const AJUSTES_AVISOS_POR_DEFECTO: AjustesAvisos = {
  eventos: true,
  resumenManana: true,
  cierreDia: true,
  cierreSinPendientes: 'buenas-noches',
};

const CLAVE = 'avisos';

let ajustes: AjustesAvisos = AJUSTES_AVISOS_POR_DEFECTO;
let cargando: Promise<AjustesAvisos> | null = null;
const oyentes = new Set<() => void>();

export function leerAjustesAvisos(): Promise<AjustesAvisos> {
  if (!cargando) {
    cargando = leerAjuste<Partial<AjustesAvisos>>(CLAVE, {}).then((guardados) => {
      // Se mezcla con los valores por defecto por si se añaden tipos nuevos.
      ajustes = { ...AJUSTES_AVISOS_POR_DEFECTO, ...guardados };
      oyentes.forEach((avisar) => avisar());
      return ajustes;
    });
  }
  return cargando;
}

export async function cambiarAjustesAvisos(cambios: Partial<AjustesAvisos>): Promise<void> {
  await leerAjustesAvisos();
  ajustes = { ...ajustes, ...cambios };
  oyentes.forEach((avisar) => avisar());
  await guardarAjuste(CLAVE, ajustes);
}

// Para que otras partes (la programación de avisos) se enteren de los cambios.
export function suscribirseAjustesAvisos(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

function leerEstado() {
  return ajustes;
}

export function useAjustesAvisos(): AjustesAvisos {
  return useSyncExternalStore(suscribirseAjustesAvisos, leerEstado, leerEstado);
}
