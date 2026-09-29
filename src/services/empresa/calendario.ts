import type { DatosEmpresa, EventoEmpresa, TareaEmpresa, Turno } from '@/data/empresa/tipos';
import type { Evento, LugarEvento } from '@/data/eventos/tipos';
import type { Hora } from '@/data/perfil';
import { minutosDesdeHora, sumarDias, type ClaveDia } from '@/services/fechas';

import { equiposDe, nombreDeUsuario, nombreEquipo } from './roles';

// Lo de la empresa en el calendario de cada persona (funciones puras, con pruebas):
// sus turnos, los eventos de empresa a los que no ha dicho "No voy" y sus tareas
// asignadas salen en Hoy, Semana, la carga, los avisos, la hora de salida y las alarmas
// como eventos más, con la marca "empresa". No se guardan: se calculan de la copia.

export const PREFIJO_EMPRESA = 'emp-';

export type ClaseMarca = 'evento' | 'turno' | 'tarea';

// "emp-turno:<id>" (y "emp-turno:<id>:2", la parte de después de medianoche).
export function idVirtual(clase: ClaseMarca, id: string, parte?: 2): string {
  return `${PREFIJO_EMPRESA}${clase}:${id}${parte ? ':2' : ''}`;
}

export function leerIdVirtual(id: string): { clase: ClaseMarca; id: string } | null {
  const m = id.match(/^emp-(evento|turno|tarea):([^:]+)/);
  return m ? { clase: m[1] as ClaseMarca, id: m[2] } : null;
}

// ¿Acaba al día siguiente? (19:00 - 01:00)
export function cruzaMedianoche(turno: Pick<Turno, 'entrada' | 'salida'>): boolean {
  return minutosDesdeHora(turno.salida) <= minutosDesdeHora(turno.entrada);
}

// Minutos que dura un turno.
export function duracionTurno(turno: Pick<Turno, 'entrada' | 'salida'>): number {
  const d = minutosDesdeHora(turno.salida) - minutosDesdeHora(turno.entrada);
  return d > 0 ? d : d + 24 * 60;
}

const FIN_DEL_DIA: Hora = '23:59';

function base(id: string, marca: Evento['empresa'], fecha: ClaveDia): Evento {
  return {
    id,
    titulo: '',
    fecha,
    horaInicio: null,
    horaFin: null,
    tipo: 'yo',
    lugar: null,
    notas: '',
    repeticion: 'nunca',
    flexible: false,
    duracionMin: null,
    hecha: false,
    foco: false,
    avisoMin: null, // la antelación del perfil, como los demás
    ejemplo: false,
    empresa: marca,
  };
}

// Sin sitio, el turno es en su sitio "Trabajo" del perfil (si lo tiene).
function lugarDeTurno(turno: Turno, trabajoId: string | null): LugarEvento | null {
  if (turno.sitio.trim()) return { tipo: 'otro', direccion: turno.sitio.trim(), coordenadas: turno.coordenadas };
  return trabajoId ? { tipo: 'sitio', sitioId: trabajoId } : null;
}

export function tituloTurno(datos: DatosEmpresa, turno: Turno): string {
  return turno.equipoId ? `Turno en ${nombreEquipo(datos, turno.equipoId)}` : 'Turno';
}

function eventosDeTurno(datos: DatosEmpresa, turno: Turno, trabajoId: string | null): Evento[] {
  const marca = { clase: 'turno' as const, id: turno.id };
  const comun = {
    titulo: tituloTurno(datos, turno),
    lugar: lugarDeTurno(turno, trabajoId),
    notas: turno.notas,
  };
  if (!cruzaMedianoche(turno)) {
    return [{ ...base(idVirtual('turno', turno.id), marca, turno.fecha), ...comun, horaInicio: turno.entrada, horaFin: turno.salida }];
  }
  // Organizy no tiene eventos que crucen la medianoche: va en dos trozos.
  const partes: Evento[] = [];
  if (turno.entrada !== '00:00') {
    partes.push({ ...base(idVirtual('turno', turno.id), marca, turno.fecha), ...comun, horaInicio: turno.entrada, horaFin: FIN_DEL_DIA });
  }
  if (turno.salida !== '00:00') {
    partes.push({
      ...base(idVirtual('turno', turno.id, 2), marca, sumarDias(turno.fecha, 1)),
      ...comun,
      // Para los avisos y la hora de salida solo cuenta la primera parte.
      avisoMin: 0,
      lugar: null,
      horaInicio: '00:00',
      horaFin: turno.salida,
    });
  }
  return partes;
}

function eventoDeEvento(evento: EventoEmpresa): Evento {
  return {
    ...base(idVirtual('evento', evento.id), { clase: 'evento', id: evento.id }, evento.fecha),
    titulo: evento.titulo,
    horaInicio: evento.inicio,
    horaFin: evento.fin,
    lugar: evento.lugar.trim()
      ? { tipo: 'otro', direccion: evento.lugar.trim(), coordenadas: evento.coordenadas }
      : null,
    notas: evento.notas,
  };
}

// ¿Esta tarea es mía? (a mí, o a un equipo en el que estoy)
export function esTareaMia(datos: DatosEmpresa, tarea: TareaEmpresa): boolean {
  if (tarea.usuario) return tarea.usuario === datos.yo;
  return tarea.equipoId !== null && equiposDe(datos, datos.yo).some((e) => e.id === tarea.equipoId);
}

// Las tareas asignadas salen entre las de hoy mientras no estén hechas (las que se
// pasaron de fecha, con su fecha, para que salgan como atrasadas).
function eventoDeTarea(tarea: TareaEmpresa, hoy: ClaveDia, hechaHoy: boolean): Evento {
  return {
    ...base(idVirtual('tarea', tarea.id), { clase: 'tarea', id: tarea.id }, hechaHoy || tarea.fechaLimite >= hoy ? hoy : tarea.fechaLimite),
    titulo: tarea.titulo,
    notas: tarea.notas,
    flexible: true,
    duracionMin: tarea.duracionMin,
    hecha: tarea.hecha,
    cuadrante: tarea.cuadrante,
  };
}

// ¿Voy a ese evento? Sin "¿Vienes?" o sin contestar, cuenta; con "No voy", no.
export function voyAlEvento(datos: DatosEmpresa, eventoId: string): boolean {
  return datos.respuestas.find((r) => r.eventoId === eventoId && r.usuario === datos.yo)?.respuesta !== 'no-voy';
}

// Todo lo de la empresa que va a mi calendario.
//   - trabajoId: el id del sitio "Trabajo" del perfil, para los turnos sin sitio.
//   - hoy: las tareas asignadas salen hoy.
export function eventosDeEmpresa(
  datos: DatosEmpresa,
  hoy: ClaveDia,
  trabajoId: string | null,
  opciones: { tareas?: boolean } = {},
): Evento[] {
  const eventos = datos.eventos
    .filter((e) => e.inicio && e.fin && voyAlEvento(datos, e.id))
    .map(eventoDeEvento);
  const turnos = datos.turnos.filter((t) => t.usuario === datos.yo).flatMap((t) => eventosDeTurno(datos, t, trabajoId));
  const tareas =
    opciones.tareas === false
      ? []
      : datos.tareas
          .filter((t) => esTareaMia(datos, t))
          .filter((t) => !t.hecha || (t.hechaEl !== null && t.hechaEl.slice(0, 10) >= hoy && t.hechaPor === datos.yo))
          .map((t) => eventoDeTarea(t, hoy, t.hecha));
  return [...eventos, ...turnos, ...tareas];
}

// Festivos, cierres y demás de todo el día (Organizy no tiene eventos de todo el día:
// salen como una línea encima del día).
export function todoElDiaDeEmpresa(datos: DatosEmpresa, dia: ClaveDia): EventoEmpresa[] {
  return datos.eventos.filter((e) => e.fecha === dia && !e.inicio);
}

// "Turno en Cocina · 19:00 – 01:00 (acaba el día siguiente)"
export function textoTurno(datos: DatosEmpresa, turno: Turno): string {
  const cruza = cruzaMedianoche(turno) ? ' (acaba al día siguiente)' : '';
  return `${tituloTurno(datos, turno)} · ${turno.entrada} – ${turno.salida}${cruza}`;
}

// "Para Laura" / "Para Cocina" / "Para ti"
export function paraQuien(datos: DatosEmpresa, tarea: TareaEmpresa): string {
  if (tarea.usuario) return tarea.usuario === datos.yo ? 'Para ti' : `Para ${nombreDeUsuario(datos, tarea.usuario)}`;
  return `Para ${nombreEquipo(datos, tarea.equipoId)}`;
}
