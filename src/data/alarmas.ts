import { useEffect, useSyncExternalStore } from 'react';

import type { ClaveDia } from '@/services/fechas';

import { guardarAjuste, leerAjuste } from './ajustes';
import type { DiaSemana, Hora } from './perfil';

// Alarmas (fase 7). Se guardan en AsyncStorage ("organizy:alarmas"), igual en el
// móvil y en la web. Cómo suenan depende de dónde corre la app: ver services/alarmas.
//
//   - En pantallas: const { cargado, alarmas, ajustes } = useAlarmas();
//   - Fuera de pantallas: await leerAlarmas();
//   - Para cambiar: guardarAlarma, borrarAlarma, activarAlarma, cambiarAjustesAlarmas,
//     alternarAlarmaSalida.
//   - Adelantos de la alarma inteligente (calculados con el tráfico): leerAdelantos,
//     guardarAdelantos, useAdelantos ("organizy:adelantos").

export type TipoAlarma = 'despertador' | 'inteligente';
// Sin archivos de sonido propios: el de alarma del sistema o solo vibrar.
export type SonidoAlarma = 'alarma' | 'vibrar';

export type Alarma = {
  id: string; // UUID (AlarmKit, en iPhone, lo exige)
  tipo: TipoAlarma;
  hora: Hora; // "07:30": la hora normal (la inteligente solo se adelanta, nunca se retrasa)
  dias: DiaSemana[]; // lunes = 0 ... domingo = 6. Vacío = una sola vez
  unaVezEl: ClaveDia | null; // si no se repite: el día en que suena
  etiqueta: string;
  sonido: SonidoAlarma;
  activada: boolean;
  adelantoMaxMin: number; // solo la inteligente: como mucho, cuánto se adelanta
};

export type AjustesAlarmas = {
  dormir: boolean; // aviso suave antes de la hora de acostarse
  dormirAntesMin: number; // cuánto antes (30 por defecto)
  salidas: string[]; // ids de los eventos con alarma de salida
};

export const AJUSTES_ALARMAS_POR_DEFECTO: AjustesAlarmas = {
  dormir: false,
  dormirAntesMin: 30,
  salidas: [],
};

export const ADELANTOS_MAXIMOS = [10, 20, 30, 45] as const;
export const ANTES_DE_DORMIR = [15, 30, 45, 60] as const;

// Lo que se adelanta la inteligente en un día concreto y por qué.
export type Adelanto = {
  clave: string; // "<id de la alarma>:<día>"
  alarmaId: string;
  dia: ClaveDia;
  minutos: number; // 0 = suena a su hora
  retrasoMin: number; // lo que añade el tráfico ese día, aunque no haga falta adelantar
  destino: string; // "el trabajo" o el título de la primera cita
  calculadoEl: string; // ISO
};

export type Adelantos = Record<string, Adelanto>;

type Guardado = { alarmas: Alarma[]; ajustes: AjustesAlarmas };

export type EstadoAlarmas = Guardado & { cargado: boolean };

const CLAVE = 'alarmas';
const CLAVE_ADELANTOS = 'adelantos';

let estado: EstadoAlarmas = { cargado: false, alarmas: [], ajustes: AJUSTES_ALARMAS_POR_DEFECTO };
let cargando: Promise<EstadoAlarmas> | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((o) => o());
}

export function leerAlarmas(): Promise<EstadoAlarmas> {
  if (!cargando) {
    cargando = leerAjuste<Partial<Guardado>>(CLAVE, {}).then((guardado) => {
      estado = {
        cargado: true,
        alarmas: guardado?.alarmas ?? [],
        // Se mezcla con los valores por defecto por si se añaden ajustes nuevos.
        ajustes: { ...AJUSTES_ALARMAS_POR_DEFECTO, ...guardado?.ajustes },
      };
      avisar();
      return estado;
    });
  }
  return cargando.then(() => estado);
}

async function guardar(cambios: Partial<Guardado>): Promise<void> {
  await leerAlarmas();
  estado = { ...estado, ...cambios };
  avisar();
  await guardarAjuste<Guardado>(CLAVE, { alarmas: estado.alarmas, ajustes: estado.ajustes });
}

// UUID v4 (AlarmKit necesita que el identificador lo sea).
export function nuevoIdAlarma(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 0x3) | 0x8).toString(16);
  });
}

// Crea o actualiza una alarma.
export async function guardarAlarma(alarma: Alarma): Promise<void> {
  await leerAlarmas();
  const existe = estado.alarmas.some((a) => a.id === alarma.id);
  await guardar({
    alarmas: existe ? estado.alarmas.map((a) => (a.id === alarma.id ? alarma : a)) : [...estado.alarmas, alarma],
  });
}

export async function borrarAlarma(id: string): Promise<void> {
  await leerAlarmas();
  await guardar({ alarmas: estado.alarmas.filter((a) => a.id !== id) });
}

// Encender o apagar desde la lista. Una alarma de "una sola vez" que se vuelve a
// encender suena la próxima vez que llegue su hora (unaVezEl lo pone quien llama).
export async function activarAlarma(id: string, activada: boolean, unaVezEl?: ClaveDia | null): Promise<void> {
  await leerAlarmas();
  await guardar({
    alarmas: estado.alarmas.map((a) =>
      a.id === id ? { ...a, activada, ...(unaVezEl !== undefined ? { unaVezEl } : {}) } : a,
    ),
  });
}

export async function cambiarAjustesAlarmas(cambios: Partial<AjustesAlarmas>): Promise<void> {
  await leerAlarmas();
  await guardar({ ajustes: { ...estado.ajustes, ...cambios } });
}

// Alarma de salida de un evento: encendida o apagada.
export async function alternarAlarmaSalida(eventoId: string, activada: boolean): Promise<void> {
  await leerAlarmas();
  const resto = estado.ajustes.salidas.filter((id) => id !== eventoId);
  await cambiarAjustesAlarmas({ salidas: activada ? [...resto, eventoId] : resto });
}

export function suscribirseAlarmas(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leerEstado() {
  return estado;
}

export function useAlarmas(): EstadoAlarmas {
  useEffect(() => {
    leerAlarmas();
  }, []);
  return useSyncExternalStore(suscribirseAlarmas, leerEstado, leerEstado);
}

// --- Adelantos de la alarma inteligente ---

let adelantos: Adelantos = {};
let cargandoAdelantos: Promise<Adelantos> | null = null;
const oyentesAdelantos = new Set<() => void>();

export function leerAdelantos(): Promise<Adelantos> {
  if (!cargandoAdelantos) {
    cargandoAdelantos = leerAjuste<Adelantos>(CLAVE_ADELANTOS, {}).then((guardados) => {
      adelantos = guardados ?? {};
      oyentesAdelantos.forEach((o) => o());
      return adelantos;
    });
  }
  return cargandoAdelantos.then(() => adelantos);
}

export async function guardarAdelantos(nuevos: Adelantos): Promise<void> {
  await leerAdelantos();
  adelantos = nuevos;
  oyentesAdelantos.forEach((o) => o());
  await guardarAjuste(CLAVE_ADELANTOS, adelantos);
}

export function suscribirseAdelantos(oyente: () => void): () => void {
  oyentesAdelantos.add(oyente);
  return () => {
    oyentesAdelantos.delete(oyente);
  };
}

function leerAdelantosEstado() {
  return adelantos;
}

export function useAdelantos(): Adelantos {
  useEffect(() => {
    leerAdelantos();
  }, []);
  return useSyncExternalStore(suscribirseAdelantos, leerAdelantosEstado, leerAdelantosEstado);
}
