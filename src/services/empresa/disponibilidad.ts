import type { BloqueOcupado, DatosEmpresa } from '@/data/empresa/tipos';
import type { Evento } from '@/data/eventos/tipos';
import { eventosDelDia, intervaloDe, sePisan, unirIntervalos, type Intervalo } from '@/services/agenda';
import { claveDia, diaSemanaDesdeLunes, fechaDesdeClave, minutosDelDia, minutosDesdeHora, sumarDias, type ClaveDia } from '@/services/fechas';

import { cruzaMedianoche } from './calendario';

// Disponibilidad del equipo (parte E, funciones puras con pruebas). Para cada persona y
// día: cuándo está de turno, cuándo está ocupada (eventos de empresa a los que va y, si
// lo comparte, sus huecos personales como "Ocupado") y el resto, libre.

// --- Lo que comparte cada empleado (sale de su móvil) ---

export const DIAS_OCUPADO = 28;

// Mis ratos ocupados de los próximos días, sacados de MIS eventos (no de los de la
// empresa, que la empresa ya conoce): solo día y horas, sin título, lugar ni tipo.
export function bloquesOcupados(eventos: Evento[], desde: ClaveDia, dias = DIAS_OCUPADO): BloqueOcupado[] {
  const propios = eventos.filter((e) => !e.empresa && !e.flexible);
  const bloques: BloqueOcupado[] = [];
  for (let n = 0; n < dias; n++) {
    const dia = sumarDias(desde, n);
    for (const t of unirIntervalos(eventosDelDia(propios, dia).map(intervaloDe))) {
      if (t.fin > t.inicio) bloques.push({ d: dia, i: t.inicio, f: t.fin });
    }
  }
  return bloques;
}

// Para no volver a subir lo mismo.
export function huellaOcupado(bloques: BloqueOcupado[]): string {
  return bloques.map((b) => `${b.d}:${b.i}-${b.f}`).join(',');
}

// --- Vista del responsable ---

export type Franja = Intervalo & { que: 'turno' | 'ocupado' };

// ¿Esa persona va a ese evento de empresa? (es para ella y no ha dicho "No voy")
function vaAlEvento(datos: DatosEmpresa, usuario: string, e: DatosEmpresa['eventos'][number]): boolean {
  const esPara = e.equipoId === null || datos.enEquipos.some((m) => m.equipoId === e.equipoId && m.usuario === usuario);
  const respuesta = datos.respuestas.find((r) => r.eventoId === e.id && r.usuario === usuario)?.respuesta;
  return esPara && respuesta !== 'no-voy';
}

export function franjasDe(datos: DatosEmpresa, usuario: string, dia: ClaveDia): Franja[] {
  const franjas: Franja[] = [];
  for (const t of datos.turnos.filter((t) => t.usuario === usuario)) {
    const entrada = minutosDesdeHora(t.entrada);
    const salida = minutosDesdeHora(t.salida);
    if (t.fecha === dia) franjas.push({ inicio: entrada, fin: cruzaMedianoche(t) ? 24 * 60 : salida, que: 'turno' });
    if (cruzaMedianoche(t) && sumarDias(t.fecha, 1) === dia && salida > 0) franjas.push({ inicio: 0, fin: salida, que: 'turno' });
  }
  for (const e of datos.eventos) {
    if (e.fecha === dia && e.inicio && e.fin && vaAlEvento(datos, usuario, e)) {
      franjas.push({ inicio: minutosDesdeHora(e.inicio), fin: minutosDesdeHora(e.fin), que: 'ocupado' });
    }
  }
  for (const b of bloquesCompartidos(datos, usuario)) {
    if (b.d === dia) franjas.push({ inicio: b.i, fin: b.f, que: 'ocupado' });
  }
  return franjas.sort((a, b) => a.inicio - b.inicio);
}

function bloquesCompartidos(datos: DatosEmpresa, usuario: string): BloqueOcupado[] {
  return datos.ocupados.find((o) => o.usuario === usuario)?.bloques ?? [];
}

// ¿Comparte sus huecos? Si no, de su vida personal no se sabe nada (puede estar libre o no).
export function comparteHuecos(datos: DatosEmpresa, usuario: string): boolean {
  return datos.ocupados.some((o) => o.usuario === usuario);
}

// Resumen de un día para la rejilla: "turno", "ocupado" (algo), "libre".
export function resumenDia(datos: DatosEmpresa, usuario: string, dia: ClaveDia): 'turno' | 'ocupado' | 'libre' {
  const franjas = franjasDe(datos, usuario, dia);
  if (franjas.some((f) => f.que === 'turno')) return 'turno';
  return franjas.length > 0 ? 'ocupado' : 'libre';
}

// --- "Buscar hueco para una reunión" ---

export type CuandoReunion = 'horario' | 'turno';

export type BusquedaHueco = {
  datos: DatosEmpresa;
  personas: string[];
  desde: ClaveDia;
  dias: number; // cuántos días mirar
  franja: Intervalo; // por ejemplo, de 9:00 a 19:00
  duracion: number; // minutos
  // "horario": cuando nadie está ocupado; "turno": además, cuando están todos de turno.
  cuando: CuandoReunion;
  diasSemana: number[]; // 0 = lunes ... 6 = domingo
  ahora: Date;
  maximo?: number;
};

export type HuecoReunion = { dia: ClaveDia; inicio: number; fin: number };

const PASO = 30;

// Días en que la empresa (o su equipo) cierra: festivos y cierres de todo el día.
function diaCerrado(datos: DatosEmpresa, dia: ClaveDia, personas: string[]): boolean {
  return datos.eventos.some(
    (e) =>
      e.fecha === dia &&
      !e.inicio &&
      (e.clase === 'festivo' || e.clase === 'cierre') &&
      (e.equipoId === null || personas.some((p) => datos.enEquipos.some((m) => m.equipoId === e.equipoId && m.usuario === p))),
  );
}

// Horas en las que les viene bien a todos, de las primeras a las últimas; como mucho dos
// por día, para que haya donde elegir.
export function buscarHueco(b: BusquedaHueco): HuecoReunion[] {
  const maximo = b.maximo ?? 6;
  const hoy = claveDia(b.ahora);
  const huecos: HuecoReunion[] = [];
  if (b.personas.length === 0 || b.duracion <= 0) return huecos;
  for (let n = 0; n < b.dias && huecos.length < maximo; n++) {
    const dia = sumarDias(b.desde, n);
    if (dia < hoy) continue;
    if (!b.diasSemana.includes(diaSemanaDesdeLunes(fechaDesdeClave(dia)))) continue;
    if (diaCerrado(b.datos, dia, b.personas)) continue;
    const franjas = b.personas.map((p) => franjasDe(b.datos, p, dia));
    let desde = b.franja.inicio;
    if (dia === hoy) desde = Math.max(desde, Math.ceil((minutosDelDia(b.ahora) + 15) / PASO) * PASO);
    let enElDia = 0;
    let ultimoFin = -1;
    for (let inicio = desde; inicio + b.duracion <= b.franja.fin && enElDia < 2; inicio += PASO) {
      const tramo = { inicio, fin: inicio + b.duracion };
      if (inicio < ultimoFin) continue; // que no se pisen entre ellos
      const bien = franjas.every((de) => {
        if (de.some((f) => f.que === 'ocupado' && sePisan(f, tramo))) return false;
        if (b.cuando === 'turno') return de.some((f) => f.que === 'turno' && f.inicio <= tramo.inicio && f.fin >= tramo.fin);
        return true;
      });
      if (bien) {
        huecos.push({ dia, ...tramo });
        enElDia += 1;
        // El segundo del día, al menos 2 horas después.
        ultimoFin = tramo.fin + 60;
        if (huecos.length >= maximo) break;
      }
    }
  }
  return huecos;
}
