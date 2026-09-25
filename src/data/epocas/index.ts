import { useEffect, useSyncExternalStore } from 'react';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import { claveDia, sumarDias } from '@/services/fechas';

import { crearEpocaEjemplo } from './ejemplo';
// En el móvil carga repositorio.ts (SQLite) y en la web repositorio.web.ts.
import { repositorio } from './repositorio';
import type { Epoca, EstadoBloque, RegistroBloque } from './tipos';

export type {
  AvisosEpoca,
  Descanso,
  Dificultad,
  Epoca,
  EstadoBloque,
  Hito,
  Imprescindible,
  RegistroBloque,
  RitmoEpoca,
  TipoEpoca,
} from './tipos';

// Épocas doradas y el registro de bloques hechos o saltados. Se leen una vez
// y se guardan en memoria para que todas las pantallas vean lo mismo.
//
//   - En pantallas: const { cargado, epocas, registro } = useEpocas();
//   - Fuera de pantallas: await leerEpocas();  y  suscribirseEpocas(avisar)
//   - Para cambiar: guardarEpoca, borrarEpoca, terminarEpoca, marcarBloque...
// La lógica (qué época está activa, el plan...) está en services/epoca.

export type EstadoEpocas = { cargado: boolean; epocas: Epoca[]; registro: RegistroBloque[] };

let estado: EstadoEpocas = { cargado: false, epocas: [], registro: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(cambios: Partial<EstadoEpocas>) {
  estado = { ...estado, ...cambios, cargado: true };
  oyentes.forEach((avisar) => avisar());
}

const CLAVE_EJEMPLO = 'epocaEjemploCreada';

export function cargarEpocas(): Promise<void> {
  if (!cargando) {
    cargando = (async () => {
      let [epocas, registro] = await Promise.all([repositorio.leerEpocas(), repositorio.leerRegistro()]);
      // En modo desarrollo, la primera vez se crea una época de ejemplo.
      if (__DEV__ && epocas.length === 0 && !(await leerAjuste(CLAVE_EJEMPLO, false))) {
        const ejemplo = crearEpocaEjemplo(claveDia(new Date()));
        await repositorio.guardarEpoca(ejemplo.epoca);
        for (const r of ejemplo.registro) await repositorio.guardarRegistro(r);
        await guardarAjuste(CLAVE_EJEMPLO, true);
        epocas = [ejemplo.epoca];
        registro = [...registro, ...ejemplo.registro];
      }
      cambiar({ epocas, registro });
    })();
  }
  return cargando;
}

export function nuevoIdEpoca(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Crea o actualiza una época (con sus hitos).
export async function guardarEpoca(epoca: Epoca): Promise<void> {
  await cargarEpocas();
  await repositorio.guardarEpoca(epoca);
  cambiar({ epocas: [...estado.epocas.filter((e) => e.id !== epoca.id), epoca] });
}

export async function borrarEpoca(id: string): Promise<void> {
  await cargarEpocas();
  await repositorio.borrarEpoca(id);
  cambiar({
    epocas: estado.epocas.filter((e) => e.id !== id),
    registro: estado.registro.filter((r) => r.epocaId !== id),
  });
}

// Termina la época hoy mismo: pasa a ser de ayer y la app vuelve al ritmo normal.
export async function terminarEpoca(id: string): Promise<void> {
  const epoca = estado.epocas.find((e) => e.id === id);
  if (!epoca) return;
  const ayer = sumarDias(claveDia(new Date()), -1);
  await guardarEpoca({ ...epoca, fin: ayer, inicio: epoca.inicio > ayer ? ayer : epoca.inicio });
}

export async function marcarResumenVisto(id: string): Promise<void> {
  const epoca = estado.epocas.find((e) => e.id === id);
  if (epoca) await guardarEpoca({ ...epoca, resumenVisto: true });
}

// Marca un bloque del plan como hecho o saltado (o lo deja pendiente con null).
export async function marcarBloque(
  bloque: Omit<RegistroBloque, 'estado'>,
  nuevo: EstadoBloque | null,
): Promise<void> {
  await cargarEpocas();
  const { id, epocaId, hitoId, dia, inicio, fin } = bloque;
  const resto = estado.registro.filter((r) => r.id !== id);
  if (nuevo === null) {
    await repositorio.borrarRegistro(id);
    cambiar({ registro: resto });
    return;
  }
  const registro: RegistroBloque = { id, epocaId, hitoId, dia, inicio, fin, estado: nuevo };
  await repositorio.guardarRegistro(registro);
  cambiar({ registro: [...resto, registro] });
}

export async function crearEpocaDeEjemplo(): Promise<void> {
  await borrarEpocasDeEjemplo();
  const ejemplo = crearEpocaEjemplo(claveDia(new Date()));
  await repositorio.guardarEpoca(ejemplo.epoca);
  for (const r of ejemplo.registro) await repositorio.guardarRegistro(r);
  cambiar({ epocas: [...estado.epocas, ejemplo.epoca], registro: [...estado.registro, ...ejemplo.registro] });
}

export async function borrarEpocasDeEjemplo(): Promise<number> {
  await cargarEpocas();
  const ejemplos = estado.epocas.filter((e) => e.ejemplo);
  for (const e of ejemplos) await borrarEpoca(e.id);
  return ejemplos.length;
}

export function suscribirseEpocas(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

// Para la lógica sin pantallas (por ejemplo, programar los avisos).
export async function leerEpocas(): Promise<EstadoEpocas> {
  await cargarEpocas();
  return estado;
}

function leerEstado() {
  return estado;
}

export function useEpocas(): EstadoEpocas {
  useEffect(() => {
    cargarEpocas();
  }, []);
  return useSyncExternalStore(suscribirseEpocas, leerEstado, leerEstado);
}
