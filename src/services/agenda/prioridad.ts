import type { Cuadrante, Evento } from '@/data/eventos/tipos';

// Matriz de Eisenhower de las tareas flexibles: cada tarea va a un cuadrante según si
// es importante y si corre prisa. Hoy coloca primero las más importantes y la vista
// "Matriz" las enseña en sus cuatro cajas.
//
//                 Con prisa        Sin prisa
//   Importante    Hazlo ya         Planifícalo
//   No tanto      Delégalo         Elimínalo

export type DatosCuadrante = {
  nombre: string; // "Hazlo ya"
  descripcion: string; // "Importante y con prisa"
  consejo: string; // lo que se sugiere hacer con ella
  importante: boolean;
  urgente: boolean;
};

// En el orden de la matriz (de izquierda a derecha y de arriba abajo).
export const CUADRANTES: readonly Cuadrante[] = ['hazlo', 'planifica', 'delega', 'elimina'];

export const DATOS_CUADRANTE: Record<Cuadrante, DatosCuadrante> = {
  hazlo: {
    nombre: 'Hazlo ya',
    descripcion: 'Importante y con prisa',
    consejo: 'Va la primera: te la coloco antes que las demás.',
    importante: true,
    urgente: true,
  },
  planifica: {
    nombre: 'Planifícalo',
    descripcion: 'Importante, sin prisa',
    consejo: 'Ponle un día y resérvale un rato antes de que corra prisa.',
    importante: true,
    urgente: false,
  },
  delega: {
    nombre: 'Delégalo',
    descripcion: 'Con prisa, poco importante',
    consejo: '¿Se lo puedes pedir a alguien? Si no, hazla rápido y sin darle vueltas.',
    importante: false,
    urgente: true,
  },
  elimina: {
    nombre: 'Elimínalo',
    descripcion: 'Ni importante ni con prisa',
    consejo: '¿Hace falta de verdad? Si no, bórrala. Va al final de la lista.',
    importante: false,
    urgente: false,
  },
};

export function cuadranteDe(importante: boolean, urgente: boolean): Cuadrante {
  if (importante) return urgente ? 'hazlo' : 'planifica';
  return urgente ? 'delega' : 'elimina';
}

// Orden para colocar las tareas del día: lo importante primero. Las sin clasificar van
// detrás de las importantes y delante de las que no lo son, para no hundirlas.
const PESO: Record<Cuadrante | 'sin', number> = { hazlo: 0, planifica: 1, sin: 2, delega: 3, elimina: 4 };

const pesoDe = (tarea: Pick<Evento, 'cuadrante'>) => PESO[tarea.cuadrante ?? 'sin'];

// Ordena por prioridad sin cambiar el orden que ya traían las del mismo cuadrante
// (tareasPendientes las da por fecha: las atrasadas, antes).
export function ordenarPorPrioridad<T extends Pick<Evento, 'cuadrante'>>(tareas: readonly T[]): T[] {
  return tareas
    .map((tarea, i) => ({ tarea, i }))
    .sort((a, b) => pesoDe(a.tarea) - pesoDe(b.tarea) || a.i - b.i)
    .map(({ tarea }) => tarea);
}

// Las tareas repartidas en sus cuadrantes, más las que aún no tienen ninguno.
export function agruparPorCuadrante<T extends Pick<Evento, 'cuadrante'>>(
  tareas: readonly T[],
): Record<Cuadrante, T[]> & { sinClasificar: T[] } {
  const grupos = { hazlo: [], planifica: [], delega: [], elimina: [], sinClasificar: [] } as Record<Cuadrante, T[]> & {
    sinClasificar: T[];
  };
  for (const tarea of tareas) grupos[tarea.cuadrante ?? 'sinClasificar'].push(tarea);
  return grupos;
}
