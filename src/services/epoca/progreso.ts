import type { Epoca, Hito, RegistroBloque } from '@/data/epocas/tipos';
import { claveDia, fechaDesdeClave, inicioDeSemana, sumarDias, type ClaveDia } from '@/services/fechas';

import type { PlanEpoca } from './plan';

// Progreso de la época: horas hechas y planeadas de la semana y de cada hito,
// y el resumen al terminar. Funciones puras, con pruebas en __tests__.

function duracion(r: { inicio: number; fin: number }): number {
  return r.fin - r.inicio;
}

function hechosDe(epoca: Epoca, registro: RegistroBloque[]): RegistroBloque[] {
  return registro.filter((r) => r.epocaId === epoca.id && r.estado === 'hecho');
}

export type ProgresoHito = {
  hito: Hito;
  hechoMin: number;
  totalMin: number; // horas de preparación que calculó
  faltanMin: number; // lo que ya no cabe antes de su fecha
};

export function progresoHitos(epoca: Epoca, registro: RegistroBloque[], plan: PlanEpoca | null): ProgresoHito[] {
  const hechos = hechosDe(epoca, registro);
  return [...epoca.hitos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
    .map((hito) => ({
      hito,
      hechoMin: hechos.filter((r) => r.hitoId === hito.id).reduce((t, r) => t + duracion(r), 0),
      totalMin: Math.round(hito.horasPreparacion * 60),
      faltanMin: plan?.faltanMin[hito.id] ?? 0,
    }));
}

// La semana de "hoy" (de lunes a domingo): lo hecho y lo planeado (lo hecho más
// los bloques pendientes que quedan esta semana).
export function progresoSemana(
  epoca: Epoca,
  registro: RegistroBloque[],
  plan: PlanEpoca | null,
  hoy: ClaveDia,
): { hechoMin: number; planeadoMin: number } {
  const lunes = claveDia(inicioDeSemana(fechaDesdeClave(hoy)));
  const domingo = sumarDias(lunes, 6);
  const enSemana = (dia: ClaveDia) => dia >= lunes && dia <= domingo;
  const hechoMin = hechosDe(epoca, registro)
    .filter((r) => enSemana(r.dia))
    .reduce((t, r) => t + duracion(r), 0);
  const pendienteMin = (plan?.bloques ?? [])
    .filter((b) => b.estado === 'pendiente' && enSemana(b.dia))
    .reduce((t, b) => t + duracion(b), 0);
  return { hechoMin, planeadoMin: hechoMin + pendienteMin };
}

export type ResumenEpoca = {
  minutosHechos: number;
  bloquesHechos: number;
  hitosSuperados: number; // los que ya han pasado
  hitosTotal: number;
};

export function resumenEpoca(epoca: Epoca, registro: RegistroBloque[], hoy: ClaveDia): ResumenEpoca {
  const hechos = hechosDe(epoca, registro);
  return {
    minutosHechos: hechos.reduce((t, r) => t + duracion(r), 0),
    bloquesHechos: hechos.length,
    hitosSuperados: epoca.hitos.filter((h) => h.fecha < hoy).length,
    hitosTotal: epoca.hitos.length,
  };
}

// 90 -> "1,5 h", 120 -> "2 h", 45 -> "45 min"
export function textoHoras(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round((minutos / 60) * 10) / 10;
  return `${String(horas).replace('.', ',')} h`;
}
