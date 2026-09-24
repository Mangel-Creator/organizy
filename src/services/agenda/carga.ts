import { minutosOcupados, type Intervalo } from './huecos';

// Carga de un día: horas ocupadas entre horas de la jornada de trabajo.
// Más del 80 % se considera un día cargado (barrita naranja en Semana).

export const UMBRAL_CARGA_ALTA = 0.8;

export type Carga = {
  ocupadoMin: number;
  proporcion: number; // 0 = libre, 1 = jornada completa (puede pasar de 1)
  alta: boolean;
};

export function cargaDelDia(
  ocupados: Intervalo[],
  minutosTareas: number,
  jornadaMin: number,
): Carga {
  const ocupadoMin = minutosOcupados(ocupados) + minutosTareas;
  const proporcion = jornadaMin > 0 ? ocupadoMin / jornadaMin : 0;
  return { ocupadoMin, proporcion, alta: proporcion > UMBRAL_CARGA_ALTA };
}
