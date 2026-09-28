import { useEffect, useSyncExternalStore } from 'react';

import { esCategoria, type CategoriaServicio } from '@/services/servicios';
import { guardarAjuste, leerAjuste } from './ajustes';

// Tiendas para "Reservar servicios" (peluquería, barbería...): nombre, qué son y el
// enlace donde se reserva (Booksy o su web). Solo en el dispositivo
// ("organizy:servicios"); viajan en la copia de seguridad.

export type Servicio = {
  id: string;
  nombre: string; // "Peluquería Laura"
  categoria: CategoriaServicio;
  enlace: string; // https://booksy.com/es-es/...
};

const CLAVE = 'servicios';

let estado: { cargado: boolean; servicios: Servicio[] } = { cargado: false, servicios: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(servicios: Servicio[]) {
  estado = { cargado: true, servicios };
  oyentes.forEach((avisar) => avisar());
}

// Lo que no tenga la forma esperada (copia antigua o rota) se descarta.
function valido(s: unknown): s is Servicio {
  const x = s as Partial<Servicio> | null;
  return (
    !!x && typeof x.id === 'string' && typeof x.nombre === 'string' && typeof x.enlace === 'string' && esCategoria(x.categoria)
  );
}

function cargar(): Promise<void> {
  if (!cargando) {
    cargando = leerAjuste<unknown>(CLAVE, []).then((s) => cambiar(Array.isArray(s) ? s.filter(valido) : []));
  }
  return cargando;
}

export function nuevoIdServicio(): string {
  return `srv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Crea o sustituye (por id), sin cambiar su sitio en la lista.
export async function guardarServicio(servicio: Servicio): Promise<void> {
  await cargar();
  const existe = estado.servicios.some((s) => s.id === servicio.id);
  const lista = existe
    ? estado.servicios.map((s) => (s.id === servicio.id ? servicio : s))
    : [...estado.servicios, servicio];
  cambiar(lista);
  await guardarAjuste(CLAVE, lista);
}

export async function borrarServicio(id: string): Promise<void> {
  await cargar();
  const lista = estado.servicios.filter((s) => s.id !== id);
  cambiar(lista);
  await guardarAjuste(CLAVE, lista);
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

const leerEstado = () => estado;

export function useServicios() {
  useEffect(() => {
    cargar();
  }, []);
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
