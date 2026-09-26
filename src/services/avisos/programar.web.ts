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

export async function enviarAvisoDePrueba(_aviso?: AvisoPlanificado): Promise<void> {}

export async function posponerAviso(
  _titulo: string,
  _cuerpo: string,
  _datos: DatosAviso,
  _categoria: string | null,
): Promise<Date> {
  return new Date();
}

export type AccionAviso = 'tocar' | 'a-manana' | 'abrir' | 'retraso' | 'posponer' | 'parar' | 'como-llegar';

export type RespuestaAviso = {
  accion: AccionAviso;
  datos: DatosAviso;
  titulo: string;
  cuerpo: string;
  categoria: string | null;
};

export function escucharRespuestas(_alResponder: (respuesta: RespuestaAviso) => void): () => void {
  return () => {};
}
