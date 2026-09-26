import type { Punto } from './tipos';

// En la web no hay ubicación en segundo plano: con el móvil bloqueado el navegador
// deja de dar indicaciones. Se mantiene la pantalla encendida mientras navegas.

export const fondoDisponible = false;

export async function iniciarFondo(_alRecibir: (p: Punto) => void): Promise<boolean> {
  return false;
}

export async function pararFondo(): Promise<void> {}
