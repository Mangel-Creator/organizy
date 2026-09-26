import { useEffect, useSyncExternalStore } from 'react';

import type { Hora } from '@/data/perfil';
import type { ClaveDia } from '@/services/fechas';

import { guardarAjuste, leerAjuste } from './ajustes';

// Planes con votación de hora (fase 8). Se guardan en el dispositivo (AsyncStorage,
// clave "organizy:planes", también en el móvil: son pocos y pequeños) para tener la
// lista y el historial aunque el servidor los borre a los 7 días. Los votos se traen
// del servidor (services/planes) y se copian aquí.
//
//   - En pantallas: const { cargado, planes } = usePlanes();
//   - Fuera de pantallas: await leerPlanes(); suscribirsePlanes(...)
//   - Para cambiar: guardarPlan, borrarPlanLocal, marcarVotosVistos.

export type TipoPlan = 'amigos' | 'cliente';

export type HoraPlan = { id: string; dia: ClaveDia; hora: Hora };

// Voto de un invitado: su nombre y las horas (ids) que le van bien.
export type VotoPlan = { nombre: string; horas: string[] };

export type Plan = {
  id: string; // el mismo que en el servidor
  codigo: string; // el del enlace de votación
  titulo: string;
  tipo: TipoPlan;
  organizador: string; // "Miguel te invita a…"
  invitados: string[]; // nombres que puso el organizador (solo en el móvil)
  horas: HoraPlan[];
  duracionMin: number;
  recordar: boolean; // "Recordar a todos 3 h antes"
  estado: 'abierto' | 'cerrado';
  horaElegida: string | null; // id de la hora al cerrar
  eventoId: string | null; // evento creado en el calendario al cerrar
  creadoEl: string; // ISO
  votos: VotoPlan[];
  votosVistos: number; // votantes que ya se han visto (para marcar los nuevos)
  actualizadoEl: string | null; // última vez que se trajeron los votos
  enServidor: boolean; // false si el servidor ya lo borró
};

const CLAVE = 'planes';

let estado: { cargado: boolean; planes: Plan[] } = { cargado: false, planes: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(planes: Plan[]) {
  estado = { cargado: true, planes };
  oyentes.forEach((avisar) => avisar());
}

export function cargarPlanes(): Promise<void> {
  if (!cargando) {
    cargando = leerAjuste<Plan[]>(CLAVE, []).then((planes) => cambiar(Array.isArray(planes) ? planes : []));
  }
  return cargando;
}

export async function leerPlanes(): Promise<Plan[]> {
  await cargarPlanes();
  return estado.planes;
}

async function escribir(planes: Plan[]) {
  cambiar(planes);
  await guardarAjuste(CLAVE, planes);
}

// Crea o sustituye un plan.
export async function guardarPlan(plan: Plan): Promise<void> {
  await cargarPlanes();
  await escribir([...estado.planes.filter((p) => p.id !== plan.id), plan]);
}

// Cambia varios planes a la vez (al traer los votos del servidor).
export async function guardarPlanes(cambiados: Plan[]): Promise<void> {
  await cargarPlanes();
  const porId = new Map(cambiados.map((p) => [p.id, p]));
  await escribir(estado.planes.map((p) => porId.get(p.id) ?? p));
}

export async function borrarPlanLocal(id: string): Promise<void> {
  await cargarPlanes();
  await escribir(estado.planes.filter((p) => p.id !== id));
}

// Al abrir un plan, sus votos dejan de ser "nuevos".
export async function marcarVotosVistos(id: string): Promise<void> {
  await cargarPlanes();
  const plan = estado.planes.find((p) => p.id === id);
  if (plan && plan.votosVistos !== plan.votos.length) await guardarPlan({ ...plan, votosVistos: plan.votos.length });
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

export { suscribirse as suscribirsePlanes };

function leerEstado() {
  return estado;
}

export function usePlanes(): { cargado: boolean; planes: Plan[] } {
  useEffect(() => {
    cargarPlanes();
  }, []);
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
