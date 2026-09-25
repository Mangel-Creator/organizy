import type { Descanso, Dificultad, Epoca, RegistroBloque } from '@/data/epocas/tipos';
import type { Evento } from '@/data/eventos/tipos';
import {
  calcularHuecos,
  eventosDelDia,
  intervaloDe,
  MOMENTOS,
  type Energia,
  type Intervalo,
} from '@/services/agenda';
import { sumarDias, type ClaveDia } from '@/services/fechas';

import { diasEntre, esDiaLibre, imprescindiblesDelDia, ventanaEpoca } from './estado';

// Plan automático de la época: reparte las horas de preparación de cada hito
// en bloques de estudio (de 25, 50 o 90 min con su descanso) en los días
// anteriores a su fecha. Función pura, con pruebas en __tests__.
//
// Reglas:
// - Cada día se estudian las horas de la época (la mitad si ese día va "Tranqui").
// - Solo en los huecos del horario de la época: nunca se mueve un evento con hora
//   fija ni lo que no quiere dejar de hacer. El día libre no hay plan.
// - Primero los huecos del momento en que rinde más.
// - Cada bloque va al hito que más lo necesita: cercano, difícil y con muchas
//   horas por hacer (ver puntuacion).
// - Lo hecho y lo saltado se guardan (RegistroBloque). El plan de hoy se calcula
//   desde que empieza el día, así los bloques no cambian de hora mientras lo usas.
//   Los bloques de días pasados sin marcar y los saltados se reparten solos en los
//   días que quedan. Si ya no caben, faltanMin lo dice.

export const DESCANSOS: Record<Descanso, { trabajo: number; descanso: number }> = {
  '25-5': { trabajo: 25, descanso: 5 },
  '50-10': { trabajo: 50, descanso: 10 },
  '90-15': { trabajo: 90, descanso: 15 },
};

export const PESO_DIFICULTAD: Record<Dificultad, number> = { facil: 1, media: 1.5, dificil: 2 };

// Bloque más corto que se planifica (para no dejar trocitos de 5 minutos).
export const BLOQUE_MINIMO = 15;

export type BloquePlan = {
  id: string; // "<epoca>:<día>:<minuto de inicio>"
  epocaId: string;
  hitoId: string;
  dia: ClaveDia;
  inicio: number;
  fin: number;
  descansoFin: number; // igual que fin si no hay descanso detrás
  estado: 'pendiente' | 'hecho' | 'saltado';
};

export type PlanEpoca = {
  bloques: BloquePlan[]; // desde hoy hasta el final, por orden
  faltanMin: Record<string, number>; // hito -> minutos que ya no caben antes de su fecha
};

export type DatosPlan = {
  epoca: Epoca;
  eventos: Evento[];
  registro: RegistroBloque[];
  hoy: ClaveDia;
  energias?: Partial<Record<ClaveDia, Energia>>;
};

export function idBloque(epocaId: string, dia: ClaveDia, inicio: number): string {
  return `${epocaId}:${dia}:${inicio}`;
}

// Cuánto necesita un hito el siguiente bloque: más si es difícil, si le quedan
// muchas horas y si su fecha está cerca.
export function puntuacion(dificultad: Dificultad, restanteMin: number, diasHasta: number): number {
  return (PESO_DIFICULTAD[dificultad] * restanteMin) / Math.max(1, diasHasta);
}

// Pone primero la parte de los huecos que cae en el momento preferido.
function porMomento(huecos: Intervalo[], momento: Intervalo): Intervalo[] {
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
  return [...dentro, ...fuera.sort((a, b) => a.inicio - b.inicio)];
}

export function planificarEpoca({ epoca, eventos, registro, hoy, energias = {} }: DatosPlan): PlanEpoca {
  const { trabajo, descanso } = DESCANSOS[epoca.ritmo.descanso];
  const propio = registro.filter((r) => r.epocaId === epoca.id);
  const hitos = epoca.hitos.filter((h) => h.fecha > hoy);

  // Minutos que le quedan a cada hito: los de preparación menos los hechos.
  const restante = new Map<string, number>();
  for (const h of hitos) {
    const hechos = propio
      .filter((r) => r.hitoId === h.id && r.estado === 'hecho')
      .reduce((total, r) => total + (r.fin - r.inicio), 0);
    restante.set(h.id, Math.max(0, Math.round(h.horasPreparacion * 60) - hechos));
  }

  // Lo que ya se marcó hoy (y después) se queda donde está.
  const bloques: BloquePlan[] = propio
    .filter((r) => r.dia >= hoy)
    .map((r) => ({ ...r, descansoFin: r.fin }));

  const ventana = ventanaEpoca(epoca);
  const primerDia = epoca.inicio > hoy ? epoca.inicio : hoy;
  const ultimoHito = hitos.reduce((ultimo, h) => (h.fecha > ultimo ? h.fecha : ultimo), '');
  const ultimoDia = ultimoHito && ultimoHito <= epoca.fin ? sumarDias(ultimoHito, -1) : epoca.fin;

  for (let dia = primerDia; dia <= ultimoDia; dia = sumarDias(dia, 1)) {
    if (esDiaLibre(epoca, dia)) continue;

    const marcados = bloques.filter((b) => b.dia === dia);
    let cuota = Math.round(epoca.ritmo.horasDia * 60) / (energias[dia] === 'tranqui' ? 2 : 1);
    cuota -= marcados.reduce((total, b) => total + (b.fin - b.inicio), 0);

    const ocupados = [
      ...eventosDelDia(eventos, dia).map(intervaloDe),
      ...imprescindiblesDelDia(epoca, dia).map(intervaloDe),
      ...marcados.map((b) => ({ inicio: b.inicio, fin: b.fin })),
    ];
    const huecos = porMomento(calcularHuecos(ocupados, ventana, BLOQUE_MINIMO), MOMENTOS[epoca.ritmo.rindeMas]);

    for (const hueco of huecos) {
      let cursor = hueco.inicio;
      while (cuota >= BLOQUE_MINIMO && hueco.fin - cursor >= BLOQUE_MINIMO) {
        const candidatos = hitos.filter((h) => h.fecha > dia && (restante.get(h.id) ?? 0) > 0);
        if (candidatos.length === 0) break;
        const hito = candidatos.reduce((mejor, h) =>
          puntuacion(h.dificultad, restante.get(h.id) ?? 0, diasEntre(dia, h.fecha)) >
          puntuacion(mejor.dificultad, restante.get(mejor.id) ?? 0, diasEntre(dia, mejor.fecha))
            ? h
            : mejor,
        );
        const minutos = Math.min(trabajo, cuota, restante.get(hito.id) ?? 0, hueco.fin - cursor);
        if (minutos < BLOQUE_MINIMO) break;
        bloques.push({
          id: idBloque(epoca.id, dia, cursor),
          epocaId: epoca.id,
          hitoId: hito.id,
          dia,
          inicio: cursor,
          fin: cursor + minutos,
          descansoFin: Math.min(cursor + minutos + descanso, hueco.fin),
          estado: 'pendiente',
        });
        restante.set(hito.id, (restante.get(hito.id) ?? 0) - minutos);
        cuota -= minutos;
        cursor += minutos + descanso;
      }
    }
  }

  const faltanMin: Record<string, number> = {};
  for (const [id, minutos] of restante) if (minutos > 0) faltanMin[id] = minutos;

  bloques.sort((a, b) => a.dia.localeCompare(b.dia) || a.inicio - b.inicio);
  return { bloques, faltanMin };
}
