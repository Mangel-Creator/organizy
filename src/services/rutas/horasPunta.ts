// Horas punta de la zona del usuario: con qué horas suele haber atasco en sus
// trayectos habituales (por ejemplo, de casa al trabajo y vuelta). Funciones puras.
//
// Una vez por semana se calcula cuánto se tarda en cada trayecto saliendo a
// distintas horas de un día laborable (tráfico previsto) y se guardan las muestras.

export type Muestra = {
  minuto: number; // hora de salida, en minutos desde medianoche
  duracionSeg: number; // con el tráfico previsto a esa hora
};

// Horas de salida que se prueban: de 7:00 a 20:30, cada media hora (28 muestras).
export const MINUTOS_MUESTRA: number[] = Array.from({ length: 28 }, (_, i) => 7 * 60 + i * 30);

// A partir de cuánto más de lo normal se considera atasco (un 25 % más que la
// hora más despejada del mismo trayecto).
export const UMBRAL_ATASCO = 1.25;

// Dos picos a menos de esta distancia son el mismo atasco: se queda el peor.
const SEPARACION_MIN = 120;

type Pico = { minuto: number; factor: number };

// Horas (en minutos) en las que suele haber atasco, ordenadas. Como mucho 3.
export function horasDeAtasco(trayectos: Muestra[][]): number[] {
  const picos: Pico[] = [];
  for (const muestras of trayectos) {
    const ordenadas = [...muestras].sort((a, b) => a.minuto - b.minuto);
    const minima = Math.min(...ordenadas.map((m) => m.duracionSeg));
    if (!(minima > 0)) continue;
    ordenadas.forEach((m, i) => {
      const factor = m.duracionSeg / minima;
      const antes = ordenadas[i - 1]?.duracionSeg ?? 0;
      const despues = ordenadas[i + 1]?.duracionSeg ?? 0;
      // Un pico: supera el umbral y no tiene al lado otra hora peor.
      if (factor >= UMBRAL_ATASCO && m.duracionSeg >= antes && m.duracionSeg >= despues) {
        picos.push({ minuto: m.minuto, factor });
      }
    });
  }
  // Del peor al más suave; se descartan los que caen cerca de uno ya elegido.
  const elegidos: Pico[] = [];
  for (const pico of picos.sort((a, b) => b.factor - a.factor)) {
    if (elegidos.every((e) => Math.abs(e.minuto - pico.minuto) >= SEPARACION_MIN)) elegidos.push(pico);
  }
  return elegidos
    .slice(0, 3)
    .map((p) => p.minuto)
    .sort((a, b) => a - b);
}

// 480 -> "8:00", 870 -> "14:30"
export function horaSinCero(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

// "En tu zona suele haber atasco a las 8:00 y a las 14:30."
export function fraseHorasPunta(minutos: number[]): string {
  if (minutos.length === 0) return 'En tus trayectos habituales no suele haber atascos.';
  const horas = minutos.map((m) => `a las ${horaSinCero(m)}`);
  const lista = horas.length === 1 ? horas[0] : `${horas.slice(0, -1).join(', ')} y ${horas[horas.length - 1]}`;
  return `En tu zona suele haber atasco ${lista}.`;
}
