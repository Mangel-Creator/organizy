import type { Punto } from './tipos';

// Radares fijos oficiales de la DGT cerca de una ruta. Funciones puras, con pruebas.
// Los datos están en src/data/radares (se actualizan con "npm run radares").

export type Radar = {
  id: string;
  tipo: 'fijo' | 'tramo'; // cabina de radar fijo o tramo de velocidad media
  lat: number;
  lon: number; // en los tramos, donde empieza (cada sentido viene aparte)
  fin?: Punto; // en los tramos, donde termina
  carretera: string;
  provincia: string;
  limite?: number; // km/h, si se conoce (de OpenStreetMap)
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

// Metros recorridos hasta cada punto de la ruta (el primero, 0).
export function acumulados(ruta: Punto[]): number[] {
  const total = [0];
  for (let i = 1; i < ruta.length; i++) total.push(total[i - 1] + distanciaM(ruta[i - 1], ruta[i]));
  return total;
}

export type Proyeccion = {
  distanciaM: number; // de "p" a la ruta
  recorridoM: number; // metros desde el principio de la ruta hasta el punto más cercano
  indice: number; // segmento más cercano (entre ruta[indice] y ruta[indice + 1])
};

// El punto de la ruta más cercano a "p". Para distancias cortas vale tratar la zona
// como un plano (metros hacia el este y hacia el norte). "desde" y "hasta" limitan
// los segmentos que se miran (la navegación solo busca cerca de donde ibas).
export function proyectarEnRuta(
  p: Punto,
  ruta: Punto[],
  metros: number[] = acumulados(ruta),
  desde = 0,
  hasta = ruta.length - 1,
): Proyeccion {
  if (ruta.length === 0) return { distanciaM: Infinity, recorridoM: 0, indice: 0 };
  if (ruta.length === 1) return { distanciaM: distanciaM(p, ruta[0]), recorridoM: 0, indice: 0 };
  const mLat = RADIO_TIERRA_M * A_RADIANES;
  const mLon = mLat * Math.cos(p[0] * A_RADIANES);
  let mejor: Proyeccion = { distanciaM: Infinity, recorridoM: 0, indice: 0 };
  for (let i = Math.max(1, desde + 1); i <= Math.min(hasta, ruta.length - 1); i++) {
    const ax = (ruta[i - 1][1] - p[1]) * mLon;
    const ay = (ruta[i - 1][0] - p[0]) * mLat;
    const bx = (ruta[i][1] - p[1]) * mLon;
    const by = (ruta[i][0] - p[0]) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    // Punto del segmento más cercano a "p" (que está en 0,0).
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < mejor.distanciaM) {
      mejor = { distanciaM: d, recorridoM: metros[i - 1] + t * (metros[i] - metros[i - 1]), indice: i - 1 };
    }
  }
  return mejor;
}

// Distancia en metros de un punto a la línea de la ruta.
export function distanciaARutaM(p: Punto, ruta: Punto[]): number {
  return proyectarEnRuta(p, ruta).distanciaM;
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

// Distancia máxima para dar un radar por "en la ruta". Las cabinas no dicen el
// sentido, así que en autovías cuenta también la del otro lado.
export const DISTANCIA_RADAR_M = 60;

export type RadarEnRuta = { radar: Radar; recorridoM: number };

// Radares que quedan sobre la ruta, con los metros desde la salida hasta cada uno
// (ordenados). Los tramos de velocidad media solo cuentan si la ruta pasa por su
// principio y después por su final: así no cuenta el del otro sentido.
export function radaresSobreRuta(ruta: Punto[], radares: Radar[], maxM = DISTANCIA_RADAR_M): RadarEnRuta[] {
  if (ruta.length < 2) return [];
  const caja = recuadro(ruta, 0.01); // unos 1.000 m: descarta rápido los lejanos
  const dentro = (p: Punto) => p[0] >= caja.minLat && p[0] <= caja.maxLat && p[1] >= caja.minLon && p[1] <= caja.maxLon;
  const metros = acumulados(ruta);
  const encontrados: RadarEnRuta[] = [];
  for (const radar of radares) {
    const inicio: Punto = [radar.lat, radar.lon];
    if (!dentro(inicio)) continue;
    const enInicio = proyectarEnRuta(inicio, ruta, metros);
    if (enInicio.distanciaM > maxM) continue;
    if (radar.fin) {
      if (!dentro(radar.fin)) continue;
      const enFin = proyectarEnRuta(radar.fin, ruta, metros);
      if (enFin.distanciaM > maxM || enFin.recorridoM <= enInicio.recorridoM) continue;
    }
    encontrados.push({ radar, recorridoM: enInicio.recorridoM });
  }
  return encontrados.sort((a, b) => a.recorridoM - b.recorridoM);
}

// Solo los radares (para contarlos y pintarlos).
export function radaresEnRuta(ruta: Punto[], radares: Radar[], maxM = DISTANCIA_RADAR_M): Radar[] {
  return radaresSobreRuta(ruta, radares, maxM).map((r) => r.radar);
}

// Radares dentro de una zona (para enseñar los cercanos en el mapa sin ruta).
export function radaresCerca(centro: Punto, radares: Radar[], radioM: number): Radar[] {
  return radares.filter((r) => distanciaM(centro, [r.lat, r.lon]) <= radioM);
}
