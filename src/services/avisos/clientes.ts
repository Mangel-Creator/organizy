import type { Evento } from '@/data/eventos/tipos';
import type { Perfil } from '@/data/perfil';
import type { AjustesRecordatorios, Envios } from '@/data/recordatorios';
import { eventosDelDia } from '@/services/agenda';
import { claveEnvio, puedeRecordar, recordatorioDe } from '@/services/clientes';
import { fechaDesdeClave, minutosDesdeHora, sumarDias, type ClaveDia } from '@/services/fechas';

import type { AvisoPlanificado } from './tipos';

// Recordatorios a clientes (fase 10, parte A): el día antes de cada cita con un cliente
// que lo ha aceptado, a la hora elegida en Perfil, un aviso con el botón "Enviar por
// WhatsApp", que abre el chat del cliente con el mensaje escrito. Si ya se le envió
// (desde la ficha o desde el aviso), no se vuelve a avisar.

export type RecordatoriosParaAvisos = {
  ajustes: AjustesRecordatorios;
  envios: Envios;
};

// Avisos que llegan el día "dia" (por las citas del día siguiente).
export function avisosDeClientes(
  recordatorios: RecordatoriosParaAvisos | null | undefined,
  eventos: Evento[],
  perfil: Perfil,
  dia: ClaveDia,
): AvisoPlanificado[] {
  if (!recordatorios?.ajustes.activo) return [];
  const diaCita = sumarDias(dia, 1);
  const fecha = fechaDesdeClave(dia);
  const cuando = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    0,
    minutosDesdeHora(recordatorios.ajustes.hora),
  );
  return eventosDelDia(eventos, diaCita).flatMap((evento) => {
    if (!puedeRecordar(evento) || !evento.cliente) return [];
    if (recordatorios.envios[claveEnvio(evento.id, diaCita)]?.estado === 'enviado') return [];
    const recordatorio = recordatorioDe(evento, evento.cliente, diaCita, perfil, cuando);
    if (!recordatorio) return [];
    const quien = evento.cliente.nombre.trim() || 'tu cliente';
    return [
      {
        id: `cliente:${evento.id}:${diaCita}`,
        tipo: 'recordatorio-cliente' as const,
        dia: diaCita,
        cuando,
        titulo: `Recuérdale la cita a ${quien}`,
        cuerpo: `Mañana a las ${evento.horaInicio}: ${evento.titulo}. El mensaje ya va escrito.`,
        destino: { pantalla: 'evento' as const, id: evento.id },
        categoria: 'cliente' as const,
        mensaje: recordatorio.texto,
        telefono: recordatorio.telefono,
      },
    ];
  });
}
