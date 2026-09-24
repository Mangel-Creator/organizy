import type { LugarEvento } from '@/data/eventos/tipos';
import type { Coordenadas, Perfil, SitioHabitual } from '@/data/perfil';

// Convierte el lugar de un evento (que puede ser solo una referencia a Casa o a
// un sitio del perfil) en nombre + dirección + coordenadas, con los datos del
// perfil de ahora mismo. Así, si el usuario se muda, sus eventos se actualizan solos.

export type LugarResuelto = {
  nombre: string | null; // "Casa", "Trabajo"... (null en "Otro sitio")
  direccion: string;
  coordenadas: Coordenadas | null;
};

export const NOMBRE_CASA = 'Casa';
export const NOMBRE_TRABAJO = 'Trabajo';

// Devuelve null si no hay lugar o si el sitio ya no está en el perfil.
export function resolverLugar(lugar: LugarEvento | null, perfil: Perfil | null): LugarResuelto | null {
  if (!lugar) return null;
  if (lugar.tipo === 'otro') {
    return { nombre: null, direccion: lugar.direccion, coordenadas: lugar.coordenadas };
  }
  if (!perfil) return null;
  if (lugar.tipo === 'casa') {
    return { nombre: NOMBRE_CASA, ...perfil.vivienda };
  }
  const sitio = perfil.sitios.find((s) => s.id === lugar.sitioId);
  return sitio ? { nombre: sitio.nombre, direccion: sitio.direccion, coordenadas: sitio.coordenadas } : null;
}

// El sitio habitual que se llama "Trabajo" (sin mirar mayúsculas ni espacios).
export function sitioTrabajo(perfil: Perfil | null): SitioHabitual | null {
  const buscado = NOMBRE_TRABAJO.toLocaleLowerCase('es-ES');
  return perfil?.sitios.find((s) => s.nombre.trim().toLocaleLowerCase('es-ES') === buscado) ?? null;
}
