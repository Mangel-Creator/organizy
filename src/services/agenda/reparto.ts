import type { MomentoDelDia } from '@/data/perfil';

import type { Intervalo } from './huecos';

// Reparto de las tareas flexibles en los huecos libres según la energía del día.
// Las tareas solo se colocan en huecos: nunca mueven eventos con hora fija.
//
// - A tope: primero en los huecos del momento del día en que el usuario rinde más.
// - Normal: las reparte entre los huecos, por turnos: una en cada hueco.
// - Tranqui: como Normal, pero solo 2 para hoy; el resto, mejor mañana.

export type Energia = 'a-tope' | 'normal' | 'tranqui';

export const MAXIMO_TAREAS_TRANQUI = 2;

// Tramos del día, igual que el saludo: mañana de 6 a 14, tarde de 14 a 21 y noche el resto.
export const MOMENTOS: Record<MomentoDelDia, Intervalo> = {
  manana: { inicio: 6 * 60, fin: 14 * 60 },
  tarde: { inicio: 14 * 60, fin: 21 * 60 },
  noche: { inicio: 21 * 60, fin: 24 * 60 },
};

export type TareaColocada<T> = { tarea: T; inicio: number; fin: number };

export type Reparto<T> = {
  colocadas: TareaColocada<T>[]; // ordenadas por hora
  sinHueco: T[]; // no caben en ningún hueco
  paraManana: T[]; // solo con energía "tranqui"
};

type Trozo = { inicio: number; fin: number; cursor: number };

function trozosDe(huecos: Intervalo[]): Trozo[] {
  return huecos.map((h) => ({ ...h, cursor: h.inicio }));
}

// Divide los huecos en la parte que cae en el momento preferido (primero)
// y el resto (después), todo en orden de hora.
function trozosPreferidos(huecos: Intervalo[], momento: Intervalo): Trozo[] {
  const dentro: Intervalo[] = [];
  const fuera: Intervalo[] = [];
  for (const h of huecos) {
    const inicio = Math.max(h.inicio, momento.inicio);
    const fin = Math.min(h.fin, momento.fin);
    if (fin > inicio) {
      dentro.push({ inicio, fin });
      if (h.inicio < inicio) fuera.push({ inicio: h.inicio, fin: inicio });
      if (fin < h.fin) fuera.push({ inicio: fin, fin: h.fin });
    } else {
      fuera.push(h);
    }
  }
  const porHora = (a: Intervalo, b: Intervalo) => a.inicio - b.inicio;
  return [...trozosDe(dentro.sort(porHora)), ...trozosDe(fuera.sort(porHora))];
}

const libre = (t: Trozo) => t.fin - t.cursor;

export function repartirTareas<T>(
  tareas: T[],
  duracion: (tarea: T) => number,
  huecos: Intervalo[],
  energia: Energia,
  rindeMas: MomentoDelDia,
): Reparto<T> {
  const paraHoy = energia === 'tranqui' ? tareas.slice(0, MAXIMO_TAREAS_TRANQUI) : tareas;
  const paraManana = energia === 'tranqui' ? tareas.slice(MAXIMO_TAREAS_TRANQUI) : [];

  const trozos = energia === 'a-tope' ? trozosPreferidos(huecos, MOMENTOS[rindeMas]) : trozosDe(huecos);
  const colocadas: TareaColocada<T>[] = [];
  const sinHueco: T[] = [];

  let turno = 0; // hueco al que le toca la siguiente tarea (normal y tranqui)

  for (const tarea of paraHoy) {
    const minutos = duracion(tarea);
    // A tope: el primero que sirva (los preferidos van delante).
    // Normal y tranqui: por turnos, el siguiente hueco en el que quepa.
    const orden = energia === 'a-tope' ? trozos : [...trozos.slice(turno), ...trozos.slice(0, turno)];
    const elegido = orden.find((t) => libre(t) >= minutos);
    if (!elegido) {
      sinHueco.push(tarea);
      continue;
    }
    colocadas.push({ tarea, inicio: elegido.cursor, fin: elegido.cursor + minutos });
    elegido.cursor += minutos;
    turno = (trozos.indexOf(elegido) + 1) % trozos.length;
  }

  colocadas.sort((a, b) => a.inicio - b.inicio);
  return { colocadas, sinHueco, paraManana };
}
