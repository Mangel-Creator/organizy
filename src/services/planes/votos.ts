import type { Plan } from '@/data/planes';
import type { ClaveDia } from '@/services/fechas';

// El recuento es el mismo que usa el servidor para el aviso "Laura ha votado…"
// (supabase/functions/_shared/recuento.ts): así la pantalla y el aviso dicen lo mismo.
export {
  avisoVotoNuevo,
  claveNombre,
  contarVotos,
  diaCorto,
  etiquetaHora,
  ganadoras,
  ordenarHoras,
  textoGanan,
  type FilaRecuento,
  type HoraVotable,
  type VotoInvitado,
} from '../../../supabase/functions/_shared/recuento';

export type SituacionPlan = 'votando' | 'cerrado' | 'pasado';

// Votando: abierto y con alguna hora por llegar. Cerrado: con hora elegida que aún
// no ha pasado. Pasado: todo lo demás (la hora elegida ya pasó, o todas las
// propuestas pasaron sin cerrarlo).
export function situacionPlan(plan: Plan, hoy: ClaveDia): SituacionPlan {
  if (plan.estado === 'cerrado') {
    const elegida = plan.horas.find((h) => h.id === plan.horaElegida);
    return elegida && elegida.dia >= hoy ? 'cerrado' : 'pasado';
  }
  return plan.horas.some((h) => h.dia >= hoy) ? 'votando' : 'pasado';
}

// Cuántos han votado desde la última vez que se abrió el plan.
export function votosNuevos(plan: Plan): number {
  return Math.max(0, plan.votos.length - plan.votosVistos);
}
