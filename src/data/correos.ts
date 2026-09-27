import { useEffect, useSyncExternalStore } from 'react';

import type { ClaveDia } from '@/services/fechas';

import { guardarAjuste, leerAjuste } from './ajustes';

// Resúmenes de correo (fase 11). Los prepara el ayudante de Gmail del usuario
// (gmail/organizy-correo.js, en su cuenta de Google) y la app los copia aquí, en el
// dispositivo (AsyncStorage, "organizy:correos"), para verlos aunque no haya
// conexión. La dirección del ayudante va en "organizy:correo".
//
//   - En pantallas: const { cargado, conexion, correos } = useCorreos();
//   - Fuera de pantallas: await leerCorreos(); suscribirseCorreos(...)
//   - Para cambiar: guardarConexion, guardarCorreos (services/correo hace el resto).

// Lo que manda el ayudante.
export type CorreoRemoto = {
  id: string; // el del mensaje en Gmail
  recibido: string; // ISO
  de: string; // "Gestoría López"
  asunto: string;
  titulo: string;
  resumen: string;
  fechaLimite: ClaveDia | null; // si pide algo con plazo
  tarea: string | null; // lo que hay que hacer, para el calendario
  via: 'reglas' | 'ia';
  enlace: string; // abre el correo en Gmail
};

export type CorreoResumido = CorreoRemoto & {
  // Solo en el dispositivo:
  visto: boolean;
  eventoId: string | null; // tarea creada en el calendario (aunque luego se borre)
  noEsPlazo: boolean; // "No es un plazo": se queda como resumen, sin tarea
};

export type ConexionCorreo = {
  enlace: string; // URL de la "Aplicación web" del ayudante
  conectadoEl: string; // ISO
  actualizadoEl: string | null; // última vez que la app trajo los correos
  ultimaRevision: string | null; // última vez que el ayudante miró el correo
  error: 'sin-conexion' | 'no-responde' | null;
};

type Estado = { cargado: boolean; conexion: ConexionCorreo | null; correos: CorreoResumido[] };

const CLAVE_CONEXION = 'correo';
const CLAVE_CORREOS = 'correos';

let estado: Estado = { cargado: false, conexion: null, correos: [] };
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cambiar(cambios: Partial<Estado>) {
  estado = { ...estado, ...cambios, cargado: true };
  oyentes.forEach((avisar) => avisar());
}

export function cargarCorreos(): Promise<void> {
  if (!cargando) {
    cargando = Promise.all([
      leerAjuste<ConexionCorreo | null>(CLAVE_CONEXION, null),
      leerAjuste<CorreoResumido[]>(CLAVE_CORREOS, []),
    ]).then(([conexion, correos]) => cambiar({ conexion, correos: Array.isArray(correos) ? correos : [] }));
  }
  return cargando;
}

export async function leerCorreos(): Promise<{ conexion: ConexionCorreo | null; correos: CorreoResumido[] }> {
  await cargarCorreos();
  return { conexion: estado.conexion, correos: estado.correos };
}

export async function guardarConexion(conexion: ConexionCorreo | null): Promise<void> {
  await cargarCorreos();
  cambiar({ conexion });
  await guardarAjuste(CLAVE_CONEXION, conexion);
}

export async function guardarCorreos(correos: CorreoResumido[]): Promise<void> {
  await cargarCorreos();
  cambiar({ correos });
  await guardarAjuste(CLAVE_CORREOS, correos);
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

export { suscribirse as suscribirseCorreos };

function leerEstado() {
  return estado;
}

export function useCorreos(): Estado {
  useEffect(() => {
    cargarCorreos();
  }, []);
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
