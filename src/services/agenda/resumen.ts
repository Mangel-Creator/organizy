import type { Evento } from '@/data/eventos/tipos';
import { horaDesdeMinutos } from '@/services/fechas';

import type { Intervalo } from './huecos';

// Frase que resume el día, hecha con reglas sencillas (sin IA).
// "Hoy: 2 clientes, 1 plan con amigos y un hueco libre de 17:00 a 19:00."

export const FRASE_DIA_LIBRE = 'Día libre. ¿Lo aprovechamos?';

function contar(n: number, singular: string, plural: string): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

// "a", "a y b", "a, b y c"
export function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

function tramo(i: Intervalo): string {
  return `de ${horaDesdeMinutos(i.inicio)} a ${horaDesdeMinutos(i.fin)}`;
}

type Datos = {
  eventos: Evento[]; // eventos con hora fija del día
  tareasPendientes: number;
  huecos: Intervalo[]; // huecos libres que quedan
};

export function fraseResumen({ eventos, tareasPendientes, huecos }: Datos): string {
  if (eventos.length === 0 && tareasPendientes === 0) return FRASE_DIA_LIBRE;

  const normales = eventos.filter((e) => !e.foco);
  const partes = [
    contar(normales.filter((e) => e.tipo === 'cliente').length, 'cliente', 'clientes'),
    contar(normales.filter((e) => e.tipo === 'amigos').length, 'plan con amigos', 'planes con amigos'),
    contar(normales.filter((e) => e.tipo === 'yo').length, 'cosa tuya', 'cosas tuyas'),
    contar(eventos.length - normales.length, 'bloque de foco', 'bloques de foco'),
    contar(tareasPendientes, 'tarea pendiente', 'tareas pendientes'),
  ].filter((p): p is string => p !== null);

  if (huecos.length === 0) {
    return `Hoy: ${unirConY(partes)}. Sin huecos libres.`;
  }
  if (huecos.length === 1) {
    partes.push(`un hueco libre ${tramo(huecos[0])}`);
  } else {
    const mayor = huecos.reduce((a, b) => (b.fin - b.inicio > a.fin - a.inicio ? b : a));
    partes.push(`${huecos.length} huecos libres (el mayor, ${tramo(mayor)})`);
  }
  return `Hoy: ${unirConY(partes)}.`;
}
