import ICAL from 'ical.js';

import type { Repeticion } from '@/data/eventos/tipos';
import { claveDia, formatearHora, type ClaveDia } from '@/services/fechas';

// Lee un calendario en formato iCalendar (.ics: el de los enlaces de Google Calendar,
// iCloud, Outlook...) y lo convierte en citas con la forma de Organizy. Puro, con pruebas.
//
// - Las repeticiones sencillas (cada día, cada semana el mismo día, cada mes el mismo
//   número, sin fin ni excepciones) pasan a ser una serie de Organizy.
// - Las demás (cada 2 semanas, con fecha de fin, con días quitados o movidos...) se
//   convierten en citas sueltas, una por vez, dentro de la ventana.
// - Los eventos de todo el día no se traen: Organizy aún no los tiene. Se cuentan.
// - Las horas se pasan a la zona del dispositivo.

export type CitaExterna = {
  uid: string; // único dentro del calendario (en las sueltas de una serie, uid + vez)
  titulo: string;
  fecha: ClaveDia;
  horaInicio: string;
  horaFin: string;
  repeticion: Repeticion;
  lugar: string | null;
  notas: string;
};

export type LecturaCalendario = {
  citas: CitaExterna[];
  todoElDia: number; // eventos de todo el día que no se traen
};

export type Ventana = { desde: ClaveDia; hasta: ClaveDia };

// Como mucho, estas veces por serie (una diaria con fin en 2 años serían 730).
const MAX_VECES = 400;
const MAX_NOTAS = 1000;

type Vez = { uid: string; evento: ICAL.Event; inicio: Date; fin: Date };

function limpiar(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\r/g, '').trim();
}

// Una vez con hora, en la zona del dispositivo. Las que cruzan la medianoche se cortan
// a las 23:59 (en Organizy un evento no pasa de un día a otro).
function citaDe(vez: Vez, repeticion: Repeticion): CitaExterna | null {
  const fecha = claveDia(vez.inicio);
  const horaInicio = formatearHora(vez.inicio);
  let horaFin = formatearHora(vez.fin);
  if (claveDia(vez.fin) !== fecha || horaFin <= horaInicio) horaFin = '23:59';
  if (horaFin <= horaInicio) return null; // empieza a las 23:59
  const lugar = limpiar(vez.evento.location);
  return {
    uid: vez.uid,
    titulo: limpiar(vez.evento.summary) || '(Sin título)',
    fecha,
    horaInicio,
    horaFin,
    repeticion,
    lugar: lugar || null,
    notas: limpiar(vez.evento.description).slice(0, MAX_NOTAS),
  };
}

// ¿Se puede guardar como serie de Organizy tal cual?
function repeticionSencilla(evento: ICAL.Event, tieneCambios: boolean): Repeticion | null {
  const componente = evento.component;
  if (tieneCambios || componente.hasProperty('exdate') || componente.hasProperty('rdate')) return null;
  const reglas = componente.getAllProperties('rrule');
  if (reglas.length !== 1) return null;
  const regla = reglas[0].getFirstValue() as ICAL.Recur;
  if ((regla.interval ?? 1) !== 1 || regla.count || regla.until) return null;
  const partes = Object.entries(regla.parts ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const inicio = evento.startDate;
  if (regla.freq === 'DAILY' && partes.length === 0) return 'diaria';
  if (regla.freq === 'WEEKLY') {
    if (partes.length === 0) return 'semanal';
    const dias = regla.parts.BYDAY ?? [];
    const mismoDia = ICAL.Recur.numericDayToIcalDay(inicio.dayOfWeek());
    if (partes.length === 1 && dias.length === 1 && dias[0] === mismoDia) return 'semanal';
    return null;
  }
  if (regla.freq === 'MONTHLY') {
    if (partes.length === 0) return 'mensual';
    const numeros = regla.parts.BYMONTHDAY ?? [];
    if (partes.length === 1 && numeros.length === 1 && numeros[0] === inicio.day) return 'mensual';
  }
  return null;
}

function dentro(fecha: ClaveDia, ventana: Ventana): boolean {
  return fecha >= ventana.desde && fecha <= ventana.hasta;
}

export function leerIcs(texto: string, ventana: Ventana): LecturaCalendario {
  // Hay calendarios con saltos de línea raros (\r\r\n, solo \r): se dejan en \r\n.
  const limpio = texto.replace(/\r*\n|\r(?!\n)/g, '\r\n');
  const calendario = new ICAL.Component(ICAL.parse(limpio));
  if (calendario.name !== 'vcalendar') throw new Error('No es un calendario');
  // Las zonas horarias que trae el propio archivo (Google e iCloud las incluyen).
  for (const zona of calendario.getAllSubcomponents('vtimezone')) {
    const id = zona.getFirstPropertyValue('tzid');
    if (typeof id === 'string' && !ICAL.TimezoneService.has(id)) ICAL.TimezoneService.register(zona);
  }

  const eventos = calendario
    .getAllSubcomponents('vevent')
    .filter((c) => String(c.getFirstPropertyValue('status') ?? '').toUpperCase() !== 'CANCELLED')
    .map((c) => new ICAL.Event(c));

  // Las veces movidas o cambiadas de una serie vienen como eventos aparte con el
  // mismo UID y RECURRENCE-ID: se unen a su serie.
  const series = new Map<string, ICAL.Event>();
  for (const e of eventos) if (!e.isRecurrenceException() && e.uid) series.set(e.uid, e);
  const cambiosSueltos: ICAL.Event[] = [];
  for (const e of eventos) {
    if (!e.isRecurrenceException()) continue;
    const serie = series.get(e.uid);
    if (serie) serie.relateException(e);
    else cambiosSueltos.push(e);
  }

  const citas: CitaExterna[] = [];
  let todoElDia = 0;

  for (const evento of [...series.values(), ...cambiosSueltos]) {
    if (evento.startDate.isDate) {
      todoElDia += 1;
      continue;
    }
    const uid = evento.uid;
    if (!evento.isRecurring()) {
      const cita = citaDe(
        { uid: evento.isRecurrenceException() ? `${uid}#${evento.recurrenceId.toString()}` : uid, evento, inicio: evento.startDate.toJSDate(), fin: evento.endDate.toJSDate() },
        'nunca',
      );
      if (cita && dentro(cita.fecha, ventana)) citas.push(cita);
      continue;
    }

    // ical.js guarda las veces cambiadas en un objeto por RECURRENCE-ID.
    const sencilla = repeticionSencilla(evento, Object.keys(evento.exceptions).length > 0);
    if (sencilla) {
      const cita = citaDe({ uid, evento, inicio: evento.startDate.toJSDate(), fin: evento.endDate.toJSDate() }, sencilla);
      // Una serie vale aunque empezara hace años: se trae si sigue viva en la ventana.
      if (cita && cita.fecha <= ventana.hasta) citas.push(cita);
      continue;
    }

    // Serie complicada: una cita suelta por cada vez dentro de la ventana.
    const iterador = evento.iterator();
    let veces = 0;
    for (let siguiente = iterador.next(); siguiente && veces < MAX_VECES; siguiente = iterador.next()) {
      const detalle = evento.getOccurrenceDetails(siguiente);
      const inicio = detalle.startDate.toJSDate();
      const dia = claveDia(inicio);
      if (dia > ventana.hasta) break;
      if (dia < ventana.desde) continue;
      veces += 1;
      const cita = citaDe(
        { uid: `${uid}#${detalle.recurrenceId.toString()}`, evento: detalle.item, inicio, fin: detalle.endDate.toJSDate() },
        'nunca',
      );
      if (cita && String(detalle.item.component.getFirstPropertyValue('status') ?? '').toUpperCase() !== 'CANCELLED') {
        citas.push(cita);
      }
    }
  }

  return { citas, todoElDia };
}

// Lo que traemos: desde hace 3 meses hasta dentro de 2 años.
export function ventanaDesde(hoy: Date): Ventana {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
  const hasta = new Date(hoy.getFullYear() + 2, hoy.getMonth(), hoy.getDate());
  return { desde: claveDia(desde), hasta: claveDia(hasta) };
}

// "webcal://..." (así los da iCloud) es lo mismo que "https://...".
export function normalizarEnlace(texto: string): string | null {
  const limpio = texto.trim().replace(/^webcals?:\/\//i, 'https://');
  try {
    const url = new URL(limpio);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Un nombre para el calendario según de dónde venga el enlace.
export function nombrePorEnlace(enlace: string): string {
  const host = new URL(enlace).hostname;
  if (host.endsWith('google.com')) return 'Google Calendar';
  if (host.endsWith('icloud.com')) return 'iCloud';
  if (host.includes('outlook') || host.includes('office365')) return 'Outlook';
  return 'Otro calendario';
}
