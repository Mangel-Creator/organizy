import type { Evento } from '@/data/eventos/tipos';
import type { Hora, Perfil } from '@/data/perfil';
import type { TipoPlan } from '@/data/planes';
import { calcularHuecos, eventosDelDia, intervaloDe, ventanaDelDia, type Intervalo } from '@/services/agenda';
import {
  claveDia,
  diaSemanaDesdeLunes,
  fechaDesdeClave,
  horaDesdeMinutos,
  minutosDelDia,
  minutosDesdeHora,
  sumarDias,
  type ClaveDia,
} from '@/services/fechas';

// Horas que la app propone para un plan, según los huecos libres del calendario
// (fase 3). Funciones puras, con pruebas.

export type Sugerencia = { dia: ClaveDia; hora: Hora };

// Horas de empezar habituales, de la que más apetece a la que menos.
// Con amigos: por la tarde-noche entre semana; el fin de semana, comida o cena.
// Con clientes: en horario de trabajo y solo los días de trabajo.
export const HORAS_HABITUALES: Record<TipoPlan, { laborable: Hora[]; libre: Hora[] }> = {
  amigos: {
    laborable: ['21:00', '20:30', '20:00', '19:30', '19:00'],
    libre: ['14:00', '21:00', '20:30', '13:30', '11:00', '18:00'],
  },
  cliente: {
    laborable: ['10:00', '11:00', '12:00', '16:00', '09:30', '17:00'],
    libre: [],
  },
};

// Duración por defecto: una cena o comida con amigos, 2 h; una reunión, 1 h.
export const DURACION_POR_DEFECTO: Record<TipoPlan, number> = { amigos: 120, cliente: 60 };

// Antelación mínima para proponer algo hoy: que dé tiempo a votar.
export const MARGEN_HOY_MIN = 120;

type Datos = {
  eventos: Evento[];
  perfil: Perfil | null;
  ahora: Date;
  tipo: TipoPlan;
  duracionMin: number;
  maximo?: number; // 4 por defecto
  dias?: number; // cuántos días mirar, 14 por defecto
};

function esLaborable(perfil: Perfil | null, dia: ClaveDia): boolean {
  const dias = perfil?.horario.diasTrabajo ?? [0, 1, 2, 3, 4];
  return (dias as number[]).includes(diaSemanaDesdeLunes(fechaDesdeClave(dia)));
}

// ¿Cabe un plan que empieza en "inicio" y dura "duracion" dentro de algún hueco?
function cabe(huecos: Intervalo[], inicio: number, duracion: number): boolean {
  return huecos.some((h) => h.inicio <= inicio && inicio + duracion <= h.fin);
}

// Huecos libres de un día (desde "desde" en adelante) con sitio para "duracion".
function huecosDelDia(eventos: Evento[], perfil: Perfil | null, dia: ClaveDia, duracion: number, desde = 0) {
  const ventana = ventanaDelDia(perfil);
  const ocupados = eventosDelDia(eventos, dia).map(intervaloDe);
  return calcularHuecos(ocupados, { inicio: Math.max(ventana.inicio, desde), fin: ventana.fin }, duracion);
}

// Horas candidatas de un día, por orden de preferencia.
function candidatas(perfil: Perfil | null, tipo: TipoPlan, dia: ClaveDia, duracion: number): number[] {
  const laborable = esLaborable(perfil, dia);
  const lista = laborable ? HORAS_HABITUALES[tipo].laborable : HORAS_HABITUALES[tipo].libre;
  const minutos = lista.map(minutosDesdeHora);
  if (tipo === 'cliente') {
    // Dentro del horario de trabajo del perfil.
    const empieza = minutosDesdeHora(perfil?.horario.empiezoTrabajo ?? '09:00');
    const termina = minutosDesdeHora(perfil?.horario.terminoTrabajo ?? '18:00');
    return minutos.filter((m) => m >= empieza && m + duracion <= termina);
  }
  if (laborable) {
    // Con amigos entre semana, después de trabajar.
    const termina = minutosDesdeHora(perfil?.horario.terminoTrabajo ?? '18:00');
    return minutos.filter((m) => m >= termina);
  }
  return minutos;
}

// De 2 a 4 horas en días distintos, la primera que se pueda de cada día, empezando
// por hoy (si queda tiempo) y sin pisar ningún evento.
export function sugerirHoras({ eventos, perfil, ahora, tipo, duracionMin, maximo = 4, dias = 14 }: Datos): Sugerencia[] {
  const hoy = claveDia(ahora);
  const sugerencias: Sugerencia[] = [];
  for (let n = 0; n < dias && sugerencias.length < maximo; n++) {
    const dia = sumarDias(hoy, n);
    const desde = n === 0 ? minutosDelDia(ahora) + MARGEN_HOY_MIN : 0;
    const huecos = huecosDelDia(eventos, perfil, dia, duracionMin, desde);
    const primera = candidatas(perfil, tipo, dia, duracionMin).find((m) => m >= desde && cabe(huecos, m, duracionMin));
    if (primera !== undefined) sugerencias.push({ dia, hora: horaDesdeMinutos(primera) });
  }
  return sugerencias;
}

// Hora para proponer un plan en un hueco concreto (botón "Proponer plan" de Semana):
// una hora habitual que quepa dentro; si no hay, el principio del hueco redondeado a
// la media hora siguiente.
export function horaParaHueco(hueco: Intervalo, dia: ClaveDia, perfil: Perfil | null, duracionMin: number): Hora {
  const habitual = candidatas(perfil, 'amigos', dia, duracionMin).find(
    (m) => m >= hueco.inicio && m + duracionMin <= hueco.fin,
  );
  if (habitual !== undefined) return horaDesdeMinutos(habitual);
  return horaDesdeMinutos(Math.ceil(hueco.inicio / 30) * 30);
}

// Huecos de un día donde cabe un plan (Semana: 2 h o más). Hoy, desde ahora
// (redondeado al cuarto de hora); los días pasados, ninguno. "ocupados" y "ventana"
// son los del día tal como los enseña Semana (con la Época dorada, si la hay).
export function huecosParaPlan(
  ocupados: Intervalo[],
  ventana: Intervalo,
  dia: ClaveDia,
  ahora: Date,
  minimoMin = 120,
): Intervalo[] {
  const hoy = claveDia(ahora);
  if (dia < hoy) return [];
  const desde = dia === hoy ? Math.ceil(minutosDelDia(ahora) / 15) * 15 : 0;
  return calcularHuecos(ocupados, { inicio: Math.max(ventana.inicio, desde), fin: ventana.fin }, minimoMin);
}
