import type { Evento } from '@/data/eventos/tipos';
import type { HoraPlan, Plan } from '@/data/planes';
import { unirConY } from '@/services/agenda';
import { horaDesdeMinutos, minutosDesdeHora } from '@/services/fechas';

// El evento que se crea en el calendario al cerrar un plan. Funciones puras, con pruebas.

// Hora de fin: inicio + duración, sin pasar de las 23:59 (los eventos no cruzan la medianoche).
export function horaFinDe(hora: string, duracionMin: number): string {
  return horaDesdeMinutos(Math.min(minutosDesdeHora(hora) + duracionMin, 23 * 60 + 59));
}

export function eventoDelPlan(plan: Plan, hora: HoraPlan, id: string): Evento {
  return {
    id,
    titulo: plan.titulo,
    fecha: hora.dia,
    horaInicio: hora.hora,
    horaFin: horaFinDe(hora.hora, plan.duracionMin),
    tipo: plan.tipo === 'cliente' ? 'cliente' : 'amigos',
    lugar: null,
    notas: plan.invitados.length > 0 ? `Con ${unirConY(plan.invitados)}` : '',
    repeticion: 'nunca',
    flexible: false,
    duracionMin: null,
    hecha: false,
    foco: false,
    avisoMin: null,
    ejemplo: false,
  };
}
