import type { AvisoPlanificado, DatosAviso } from './tipos';

// Versión web de programar.ts. El navegador no puede programar notificaciones
// locales que lleguen con la web cerrada, así que aquí no se hace nada y Perfil
// explica que los avisos son solo para la app del móvil.

export const avisosDisponibles = false;

export async function prepararAvisos(): Promise<void> {}

export async function programarAvisos(_avisos: AvisoPlanificado[]): Promise<number> {
  return 0;
}

export async function contarAvisosProgramados(): Promise<number> {
  return 0;
}

export async function enviarAvisoDePrueba(): Promise<void> {}

export type RespuestaAviso = { accion: 'tocar' | 'a-manana' | 'abrir'; datos: DatosAviso };

export function escucharRespuestas(_alResponder: (respuesta: RespuestaAviso) => void): () => void {
  return () => {};
}
