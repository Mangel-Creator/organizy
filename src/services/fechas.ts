// Utilidades de fechas y horas en español de España.
// - Semana empezando en lunes.
// - Horas en formato 24 h.
// - Siempre en la zona horaria del dispositivo (la que usa Date por defecto).

const LOCALE = 'es-ES';

const formatoFechaLarga = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatoFechaCorta = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatoHora = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// "martes, 23 de septiembre"
export function formatearFechaLarga(fecha: Date): string {
  return formatoFechaLarga.format(fecha);
}

// Pone en mayúscula solo la primera letra: "miércoles, 23..." -> "Miércoles, 23..."
export function capitalizar(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase(LOCALE) + texto.slice(1);
}

// "23/09/2026"
export function formatearFechaCorta(fecha: Date): string {
  return formatoFechaCorta.format(fecha);
}

// "18:05"
export function formatearHora(fecha: Date): string {
  return formatoHora.format(fecha);
}

// Día de la semana con lunes = 0 y domingo = 6.
export function diaSemanaDesdeLunes(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

// Lunes de la semana de "fecha", a las 00:00.
export function inicioDeSemana(fecha: Date): Date {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  lunes.setDate(lunes.getDate() - diaSemanaDesdeLunes(lunes));
  return lunes;
}

export const DIAS_SEMANA_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

// Letras de los días para selectores, empezando en lunes (X = miércoles).
export const DIAS_SEMANA_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

// "Buenos días" de 6:00 a 13:59, "Buenas tardes" de 14:00 a 20:59 y
// "Buenas noches" el resto, como se dice en España.
export function saludoSegunHora(fecha: Date): string {
  const hora = fecha.getHours();
  if (hora >= 6 && hora < 14) return 'Buenos días';
  if (hora >= 14 && hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

// "07:30" -> 450 (minutos desde medianoche).
export function minutosDesdeHora(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// 450 -> "07:30". Da la vuelta al pasar de medianoche.
export function horaDesdeMinutos(minutos: number): string {
  const total = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
