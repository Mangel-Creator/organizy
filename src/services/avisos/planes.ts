import type { Evento } from '@/data/eventos/tipos';
import type { Plan } from '@/data/planes';
import { intervaloDe } from '@/services/agenda';
import { fechaDesdeClave, type ClaveDia } from '@/services/fechas';
import { textoRecordatorio } from '@/services/planes/mensajes';

import type { AvisoPlanificado } from './tipos';

// "Recordar a todos 3 h antes" (fase 8): 3 horas antes de un plan cerrado, un aviso
// al organizador con un botón que abre WhatsApp con el recordatorio escrito para el
// grupo. Sale de la hora del evento del calendario (si lo mueves, el aviso se mueve;
// si lo borras, no hay aviso).

export const ANTELACION_RECORDATORIO_MIN = 180;

export function avisosDePlanes(planes: Plan[] = [], eventos: Evento[], dia: ClaveDia): AvisoPlanificado[] {
  return planes.flatMap((plan) => {
    if (plan.estado !== 'cerrado' || !plan.recordar || !plan.eventoId) return [];
    const evento = eventos.find((e) => e.id === plan.eventoId);
    if (!evento || evento.flexible || evento.fecha !== dia || !evento.horaInicio) return [];
    const fecha = fechaDesdeClave(dia);
    const inicio = intervaloDe(evento).inicio;
    const cuando = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, inicio - ANTELACION_RECORDATORIO_MIN);
    return [
      {
        id: `plan-recordatorio:${plan.id}:${dia}`,
        tipo: 'plan-recordatorio' as const,
        dia,
        cuando,
        titulo: `En 3 horas: ${evento.titulo}`,
        cuerpo: '¿Se lo recuerdas a todos? El mensaje ya va escrito.',
        destino: { pantalla: 'plan' as const, id: plan.id },
        categoria: 'plan' as const,
        mensaje: textoRecordatorio(evento.titulo, { id: '', dia, hora: evento.horaInicio }, cuando),
      },
    ];
  });
}
