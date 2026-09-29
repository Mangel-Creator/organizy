import { useEffect, useSyncExternalStore } from 'react';

import { borrarAjuste, guardarAjuste, leerAjuste } from '@/data/ajustes';

// En el móvil carga repositorio.ts (SQLite) y en la web repositorio.web.ts.
import { repositorio } from './repositorio';
import type { EstadoEmpresa, Situacion } from './tipos';

export * from './tipos';

// Organizy grupal (fase 15) en el dispositivo: si el modo está activado y la última
// copia de lo de la empresa que se trajo del servidor. Con el modo apagado no hay nada
// y la app se queda como siempre.
//
//   - En pantallas: const { modo, situacion } = useEmpresa();
//   - Fuera de pantallas: await leerEmpresa() / suscribirseEmpresa(...)
//   - Lo cambia services/empresa (activar, entrar, traer, salir...).

const CLAVE_MODO = 'empresaModo';

let estado: EstadoEmpresa = { cargado: false, modo: false, situacion: { fase: 'sin-sesion' }, traidoEl: null };
let cargando: Promise<EstadoEmpresa> | null = null;
const oyentes = new Set<() => void>();

function cambiar(nuevo: EstadoEmpresa) {
  estado = nuevo;
  oyentes.forEach((avisar) => avisar());
}

type Copia = { situacion: Situacion; traidoEl: string | null };

function leerCopia(texto: string | null): Copia | null {
  if (!texto) return null;
  try {
    const copia = JSON.parse(texto) as Copia;
    return copia?.situacion?.fase ? copia : null;
  } catch {
    return null;
  }
}

export function leerEmpresa(): Promise<EstadoEmpresa> {
  if (!cargando) {
    cargando = (async () => {
      const modo = await leerAjuste<boolean>(CLAVE_MODO, false);
      // Con el modo apagado ni siquiera se abre la copia.
      const copia = modo ? leerCopia(await repositorio.leer().catch(() => null)) : null;
      cambiar({
        cargado: true,
        modo,
        situacion: copia?.situacion ?? { fase: 'sin-sesion' },
        traidoEl: copia?.traidoEl ?? null,
      });
      return estado;
    })();
  }
  return cargando.then(() => estado);
}

export async function cambiarModoEmpresa(modo: boolean): Promise<void> {
  await leerEmpresa();
  await guardarAjuste(CLAVE_MODO, modo);
  cambiar({ ...estado, modo });
}

export async function guardarSituacion(situacion: Situacion, traidoEl: string | null = new Date().toISOString()) {
  await leerEmpresa();
  await repositorio.guardar(JSON.stringify({ situacion, traidoEl } satisfies Copia));
  cambiar({ ...estado, situacion, traidoEl });
}

// Al salir de la empresa (o apagar el modo): se borra del dispositivo todo lo de la
// empresa. Lo personal no se toca.
export async function olvidarEmpresa(): Promise<void> {
  await leerEmpresa();
  await repositorio.borrar().catch(() => {});
  await Promise.all([borrarAjuste(CLAVE_MODO), borrarAjuste('empresaInvitacion'), borrarAjuste('empresaOcupado')]);
  cambiar({ cargado: true, modo: false, situacion: { fase: 'sin-sesion' }, traidoEl: null });
}

export function suscribirseEmpresa(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

// Para la lógica sin pantallas (la agenda, los avisos) sin esperar.
export function estadoEmpresaActual(): EstadoEmpresa {
  return estado;
}

export function useEmpresa(): EstadoEmpresa {
  useEffect(() => {
    leerEmpresa();
  }, []);
  return useSyncExternalStore(suscribirseEmpresa, estadoEmpresaActual, estadoEmpresaActual);
}
