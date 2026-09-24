import { useSyncExternalStore } from 'react';

import { guardarAjuste, leerAjuste } from './ajustes';

// Densidad: cuánta información cabe en las listas de Hoy y en la línea de horas de
// Semana. La elige cada persona en Perfil > "Cómo se ve" y se guarda en el
// dispositivo ("organizy:densidad"). Los formularios no cambian con ella.
//
//   const { nivel, medidas } = useDensidad();   (se actualiza sola al cambiarla)

export type Densidad = 'aire' | 'equilibrado' | 'compacto';

export type MedidasDensidad = {
  altoFila: number; // alto mínimo de una fila de evento, hueco o tarea
  rellenoFila: number; // espacio arriba y abajo dentro de la fila
  separacion: number; // espacio entre filas
  texto: number; // tamaño del texto principal de la fila
  interlineado: number;
  pxPorHora: number; // Semana: alto de una hora en la línea de horas
};

export const MEDIDAS_DENSIDAD: Record<Densidad, MedidasDensidad> = {
  aire: { altoFila: 76, rellenoFila: 12, separacion: 12, texto: 17, interlineado: 24, pxPorHora: 72 },
  equilibrado: { altoFila: 60, rellenoFila: 8, separacion: 8, texto: 16, interlineado: 22, pxPorHora: 56 },
  // Nunca por debajo de 44 px de alto, para que se pueda pulsar bien.
  compacto: { altoFila: 48, rellenoFila: 4, separacion: 4, texto: 15, interlineado: 20, pxPorHora: 44 },
};

export const OPCIONES_DENSIDAD: readonly { valor: Densidad; etiqueta: string }[] = [
  { valor: 'aire', etiqueta: 'Con aire' },
  { valor: 'equilibrado', etiqueta: 'Equilibrado' },
  { valor: 'compacto', etiqueta: 'Compacto' },
];

const CLAVE = 'densidad';
const POR_DEFECTO: Densidad = 'equilibrado';

let nivel: Densidad = POR_DEFECTO;
let cargada = false;
const oyentes = new Set<() => void>();

function cambiar(nuevo: Densidad) {
  nivel = nuevo;
  oyentes.forEach((avisar) => avisar());
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (!cargada) {
    cargada = true;
    leerAjuste<Densidad>(CLAVE, POR_DEFECTO).then((guardada) => {
      if (guardada in MEDIDAS_DENSIDAD && guardada !== nivel) cambiar(guardada);
    });
  }
  return () => {
    oyentes.delete(avisar);
  };
}

export function useDensidad(): { nivel: Densidad; medidas: MedidasDensidad } {
  const actual = useSyncExternalStore(suscribir, () => nivel, () => nivel);
  return { nivel: actual, medidas: MEDIDAS_DENSIDAD[actual] };
}

export async function guardarDensidad(nueva: Densidad): Promise<void> {
  cambiar(nueva);
  await guardarAjuste(CLAVE, nueva);
}
