import type { Punto } from './tipos';

// Radares fijos oficiales de la DGT cerca de una ruta. Funciones puras, con pruebas.
// Los datos están en src/data/radares (se actualizan con "npm run radares").

export type Radar = {
  id: string;
  tipo: 'fijo' | 'tramo'; // cabina de radar fijo o tramo de velocidad media
  lat: number;
  lon: number; // en los tramos, donde empieza
  fin?: Punto; // en los tramos, donde termina
  carretera: string;
  provincia: string;
};

const RADIO_TIERRA_M = 6371000;
const A_RADIANES = Math.PI / 180;

// Distancia en metros entre dos puntos.
export function distanciaM(a: Punto, b: Punto): number {
  const dLat = (b[0] - a[0]) * A_RADIANES;
  const dLon = (b[1] - a[1]) * A_RADIANES;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * A_RADIANES) * Math.cos(b[0] * A_RADIANES) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Distancia en metros de un punto a la línea de la ruta. Para distancias cortas vale
// tratar la zona como un plano (metros hacia el este y hacia el norte).
export function distanciaARutaM(p: Punto, ruta: Punto[]): number {
  if (ruta.length === 0) return Infinity;
  if (ruta.length === 1) return distanciaM(p, ruta[0]);
  const mLat = RADIO_TIERRA_M * A_RADIANES;
  const mLon = mLat * Math.cos(p[0] * A_RADIANES);
  let minima = Infinity;
  for (let i = 1; i < ruta.length; i++) {
    const ax = (ruta[i - 1][1] - p[1]) * mLon;
    const ay = (ruta[i - 1][0] - p[0]) * mLat;
    const bx = (ruta[i][1] - p[1]) * mLon;
    const by = (ruta[i][0] - p[0]) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    // Punto del segmento más cercano al radar (que está en 0,0).
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < minima) minima = d;
  }
  return minima;
}

// Recuadro que contiene la ruta, con un margen en grados.
function recuadro(ruta: Punto[], margen: number) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const [lat, lon] of ruta) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return { minLat: minLat - margen, maxLat: maxLat + margen, minLon: minLon - margen, maxLon: maxLon + margen };
}

// Distancia máxima para dar un radar por "en la ruta". Los datos no dicen el sentido,
// así que en autovías cuenta también el del otro lado.
export const DISTANCIA_RADAR_M = 60;

// Radares que quedan sobre la ruta. En los tramos de velocidad media basta con que
// la ruta pase por el principio o por el final.
export function radaresEnRuta(ruta: Punto[], radares: Radar[], maxM = DISTANCIA_RADAR_M): Radar[] {
  if (ruta.length === 0) return [];
  const caja = recuadro(ruta, 0.01); // unos 1.000 m: descarta rápido los lejanos
  const dentro = (p: Punto) => p[0] >= caja.minLat && p[0] <= caja.maxLat && p[1] >= caja.minLon && p[1] <= caja.maxLon;
  return radares.filter((radar) => {
    const puntos: Punto[] = [[radar.lat, radar.lon], ...(radar.fin ? [radar.fin] : [])];
    return puntos.some((p) => dentro(p) && distanciaARutaM(p, ruta) <= maxM);
  });
}

// Radares dentro de una zona (para enseñar los cercanos en el mapa sin ruta).
export function radaresCerca(centro: Punto, radares: Radar[], radioM: number): Radar[] {
  return radares.filter((r) => distanciaM(centro, [r.lat, r.lon]) <= radioM);
}
