import type { Transporte } from '@/data/perfil';
import { formatearDuracion, formatearHora } from '@/services/fechas';

import type { ModoViaje, Punto } from './tipos';

// Hora de salida, textos y enlaces para abrir otras apps. Funciones puras, con pruebas.

// Margen para llegar a tiempo: se sale 5 minutos antes de lo justo.
export const MARGEN_SALIDA_MIN = 5;

// Hora a la que hay que salir para llegar a "llegada" con el margen. Se redondea
// hacia abajo al minuto (mejor salir un poco antes que un poco después).
export function horaDeSalida(llegada: Date, duracionSeg: number, margenMin = MARGEN_SALIDA_MIN): Date {
  const salida = llegada.getTime() - duracionSeg * 1000 - margenMin * 60000;
  return new Date(Math.floor(salida / 60000) * 60000);
}

// Segundos -> minutos enteros, redondeando hacia arriba (43 s cuentan como 1 min).
export function minutosDe(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 60));
}

// 1080 -> "18 min", 5400 -> "1 h 30 min"
export function textoDuracion(segundos: number): string {
  return formatearDuracion(minutosDe(segundos));
}

// Retraso por el tráfico: "+6 min". Por debajo de un minuto no se cuenta.
export function textoRetraso(retrasoSeg: number): string | null {
  if (retrasoSeg < 60) return null;
  return `+${textoDuracion(retrasoSeg)}`;
}

// 12345 -> "12,3 km"; 850 -> "850 m"
export function textoDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  const km = metros / 1000;
  return `${(km < 10 ? km.toFixed(1) : Math.round(km).toString()).replace('.', ',')} km`;
}

export const COMO_VIAJA: Record<ModoViaje, string> = {
  coche: 'en coche',
  moto: 'en moto',
  'a-pie': 'a pie',
};

// "Sal a las 10:05 · 18 min en coche"
export function textoSalida(salida: Date, duracionSeg: number, modo: ModoViaje): string {
  return `Sal a las ${formatearHora(salida)} · ${textoDuracion(duracionSeg)} ${COMO_VIAJA[modo]}`;
}

// "1 radar", "3 radares", "Sin radares"
export function textoRadares(n: number): string {
  if (n === 0) return 'Sin radares';
  return n === 1 ? '1 radar' : `${n} radares`;
}

// --- Enlaces para abrir otras apps ---

function coordenadas([lat, lon]: Punto): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

// Abre Waze navegando hasta el destino (si no está instalado, abre su web).
export function enlaceWaze(destino: Punto): string {
  return `https://waze.com/ul?ll=${coordenadas(destino)}&navigate=yes`;
}

const MODO_GOOGLE: Record<Transporte, string> = {
  coche: 'driving',
  moto: 'two-wheeler',
  'transporte-publico': 'transit',
  'a-pie': 'walking',
};

// Abre Google Maps con las indicaciones hasta el destino, desde donde estés.
export function enlaceGoogleMaps(destino: Punto, transporte: Transporte = 'coche'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coordenadas(destino)}&travelmode=${MODO_GOOGLE[transporte]}`;
}

export const MENSAJE_RETRASO = 'Voy con unos 10 min de retraso, lo siento';

// Abre WhatsApp con el mensaje escrito para que elijas a quién mandarlo.
// Nunca se envía solo: lo manda la persona.
export function enlaceWhatsapp(texto = MENSAJE_RETRASO): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
