import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

// Reservar servicios (peluquería, barbería, uñas...): lo pidió el usuario el 28/09/2026.
// Booksy no deja a otras apps reservar por dentro (su API es solo para los negocios),
// así que Organizy guarda el enlace de cada tienda y la abre en Booksy (en el iPhone,
// en su app si la tienes) para reservar allí. Funciones puras, con pruebas.

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export type CategoriaServicio = 'peluqueria' | 'barberia' | 'unas' | 'estetica' | 'masajes' | 'otro';

export const CATEGORIAS: readonly {
  valor: CategoriaServicio;
  etiqueta: string;
  icono: NombreIcono;
  booksy: string; // búsqueda de Booksy: https://booksy.com/es-es/s/<esto>
}[] = [
  { valor: 'peluqueria', etiqueta: 'Peluquería', icono: 'cut-outline', booksy: 'peluqueria' },
  { valor: 'barberia', etiqueta: 'Barbería', icono: 'man-outline', booksy: 'barberia' },
  { valor: 'unas', etiqueta: 'Uñas', icono: 'hand-left-outline', booksy: 'salon-de-unas' },
  { valor: 'estetica', etiqueta: 'Estética', icono: 'sparkles-outline', booksy: 'estetica' },
  { valor: 'masajes', etiqueta: 'Masajes', icono: 'body-outline', booksy: 'masajes' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'storefront-outline', booksy: '' },
];

export function datosCategoria(categoria: CategoriaServicio) {
  return CATEGORIAS.find((c) => c.valor === categoria) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function esCategoria(valor: unknown): valor is CategoriaServicio {
  return CATEGORIAS.some((c) => c.valor === valor);
}

// Para buscar la tienda en Booksy: la búsqueda de esa categoría (o la portada).
export function enlaceBusquedaBooksy(categoria: CategoriaServicio): string {
  const ruta = datosCategoria(categoria).booksy;
  return ruta ? `https://booksy.com/es-es/s/${ruta}` : 'https://booksy.com/es-es/';
}

// Saca el enlace de lo que se pega. Al compartir desde Booksy viene con texto
// alrededor ("Reserva en Peluquería Laura: https://..."), y a mano a veces sin
// "https://". Devuelve null si no hay una dirección web válida.
export function extraerEnlace(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const conProtocolo = limpio.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  const candidato =
    conProtocolo ?? (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(limpio) ? `https://${limpio}` : null);
  if (!candidato) return null;
  try {
    const url = new URL(candidato.replace(/[).,;]+$/, ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
}

function dominio(enlace: string): string {
  try {
    return new URL(enlace).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function esBooksy(enlace: string): boolean {
  const host = dominio(enlace);
  return host === 'booksy.com' || host.endsWith('.booksy.com');
}

// Dónde se reserva, para enseñarlo debajo del nombre: "En Booksy" o "En peluqueria.es".
export function textoDonde(enlace: string): string {
  return esBooksy(enlace) ? 'En Booksy' : `En ${dominio(enlace) || 'su web'}`;
}

// Las páginas de un negocio en Booksy llevan su nombre en la dirección:
// booksy.com/es-es/123456_peluqueria-laura_peluqueria_53009_madrid -> "Peluqueria laura".
// Sirve para no tener que escribirlo; se puede cambiar.
export function nombreDesdeEnlace(enlace: string): string | null {
  if (!esBooksy(enlace)) return null;
  let ruta: string;
  try {
    ruta = decodeURIComponent(new URL(enlace).pathname);
  } catch {
    return null;
  }
  const trozo = ruta.split('/').find((t) => /^\d+_[^_]+_/.test(t));
  const nombre = trozo?.split('_')[1]?.replace(/-/g, ' ').trim();
  if (!nombre) return null;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}
