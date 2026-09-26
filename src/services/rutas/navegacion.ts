import { proyectarEnRuta, type Proyeccion, type RadarEnRuta } from './radares';
import type { Instruccion, ModoViaje, Punto, Ruta } from './tipos';

// Navegación giro a giro (fase 6): dónde vas dentro de la ruta, cuál es la siguiente
// indicación y qué hay que decir en voz alta. Funciones puras, con pruebas; el motor
// que escucha el GPS y habla está en motorNavegacion.ts.

// --- Textos de las indicaciones (tuteo, frases cortas) ---

const ORDINALES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];

function ordinal(n: number): string {
  return ORDINALES[n - 1] ?? `número ${n}`;
}

function por(calle: string | null): string {
  return calle ? ` por ${calle}` : '';
}

// "Gira a la derecha por Calle Mayor", "En la rotonda, toma la segunda salida"...
export function textoInstruccion(i: Instruccion): string {
  const m = i.maniobra;
  const lado = m.endsWith('LEFT') ? 'izquierda' : 'derecha';
  switch (m) {
    case 'DEPART':
      return `Sal${por(i.calle)}`;
    case 'ARRIVE':
      return 'Llegas a tu destino';
    case 'ARRIVE_LEFT':
    case 'ARRIVE_RIGHT':
      return `Llegas a tu destino, a la ${lado}`;
    case 'STRAIGHT':
    case 'FOLLOW':
      return `Sigue recto${por(i.calle)}`;
    case 'KEEP_LEFT':
    case 'KEEP_RIGHT':
    case 'BEAR_LEFT':
    case 'BEAR_RIGHT':
      return `Mantente a la ${lado}${por(i.calle)}`;
    case 'TURN_LEFT':
    case 'TURN_RIGHT':
      return `Gira a la ${lado}${por(i.calle)}`;
    case 'SHARP_LEFT':
    case 'SHARP_RIGHT':
      return `Gira del todo a la ${lado}${por(i.calle)}`;
    case 'MAKE_UTURN':
    case 'TRY_MAKE_UTURN':
      return 'Cambia de sentido';
    case 'ROUNDABOUT_CROSS':
      return 'En la rotonda, sigue recto';
    case 'ROUNDABOUT_LEFT':
    case 'ROUNDABOUT_RIGHT':
    case 'ROUNDABOUT_BACK':
      return i.salida ? `En la rotonda, toma la ${ordinal(i.salida)} salida` : 'Entra en la rotonda';
    case 'ENTER_MOTORWAY':
    case 'ENTER_FREEWAY':
    case 'ENTER_HIGHWAY':
    case 'ENTRANCE_RAMP':
      return i.calle ? `Incorpórate a la ${i.calle}` : 'Incorpórate a la autovía';
    case 'TAKE_EXIT':
    case 'MOTORWAY_EXIT_LEFT':
    case 'MOTORWAY_EXIT_RIGHT':
      return `Toma la salida${i.salida ? ` ${i.salida}` : ''}${m === 'MOTORWAY_EXIT_LEFT' ? ' por la izquierda' : ''}${i.calle ? ` hacia ${i.calle}` : ''}`;
    case 'SWITCH_PARALLEL_ROAD':
      return 'Pasa a la vía de servicio';
    case 'SWITCH_MAIN_ROAD':
      return 'Vuelve a la vía principal';
    case 'TAKE_FERRY':
      return 'Coge el ferri';
    default:
      return i.mensaje || 'Sigue la ruta';
  }
}

// Distancia para decir en voz alta: "300 metros", "1 kilómetro", "2,5 kilómetros".
export function distanciaHablada(metros: number): string {
  if (metros >= 950) {
    const km = Math.round(metros / 100) / 10;
    return km === 1 ? '1 kilómetro' : `${km.toString().replace('.', ',')} kilómetros`;
  }
  const redondeo = metros >= 200 ? 50 : 10;
  return `${Math.max(redondeo, Math.round(metros / redondeo) * redondeo)} metros`;
}

// Lo mismo, corto, para la pantalla: "300 m", "1,2 km".
export function distanciaCorta(metros: number): string {
  if (metros >= 950) return `${(Math.round(metros / 100) / 10).toString().replace('.', ',')} km`;
  return `${Math.max(10, Math.round(metros / 10) * 10)} m`;
}

// --- Dónde vas ---

// Fuera de la ruta si estás a más de esto de la línea.
export const FUERA_DE_RUTA_M = 50;
// Llegado si quedan menos de esto.
export const LLEGADA_M = 30;

export type Guia = {
  proyeccion: Proyeccion;
  fueraDeRuta: boolean;
  llegado: boolean;
  recorridoM: number;
  restanteM: number;
  restanteSeg: number; // proporcional a lo que queda (con el tráfico de la ruta)
  siguiente: Instruccion | null; // la próxima maniobra (sin contar la salida)
  distanciaASiguienteM: number;
  proximoRadar: RadarEnRuta | null;
  distanciaARadarM: number;
};

export type DatosRuta = {
  ruta: Ruta;
  metros: number[]; // acumulados(ruta.puntos)
  radares: RadarEnRuta[]; // radaresSobreRuta(ruta.puntos, ...)
};

// "indiceAnterior": el segmento donde ibas; se busca cerca de él para no saltar a
// otra parte de la ruta que pase cerca (por ejemplo, ida y vuelta por la misma calle).
export function calcularGuia(datos: DatosRuta, posicion: Punto, indiceAnterior = 0): Guia {
  const { ruta, metros, radares } = datos;
  const total = metros[metros.length - 1] ?? 0;
  const cerca = proyectarEnRuta(posicion, ruta.puntos, metros, Math.max(0, indiceAnterior - 5), indiceAnterior + 80);
  const proyeccion =
    cerca.distanciaM <= FUERA_DE_RUTA_M ? cerca : proyectarEnRuta(posicion, ruta.puntos, metros);
  const recorridoM = proyeccion.recorridoM;
  const restanteM = Math.max(0, total - recorridoM);
  const siguiente =
    (ruta.instrucciones ?? []).find((i) => i.maniobra !== 'DEPART' && i.distanciaM > recorridoM + 5) ?? null;
  const proximoRadar = radares.find((r) => r.recorridoM > recorridoM) ?? null;
  return {
    proyeccion,
    fueraDeRuta: proyeccion.distanciaM > FUERA_DE_RUTA_M,
    llegado: restanteM < LLEGADA_M && proyeccion.distanciaM <= FUERA_DE_RUTA_M,
    recorridoM,
    restanteM,
    restanteSeg: total > 0 ? Math.round((ruta.duracionSeg * restanteM) / total) : 0,
    siguiente,
    distanciaASiguienteM: siguiente ? siguiente.distanciaM - recorridoM : Infinity,
    proximoRadar,
    distanciaARadarM: proximoRadar ? proximoRadar.recorridoM - recorridoM : Infinity,
  };
}

// --- Qué decir ---

// A qué distancia de cada maniobra se avisa (la última, casi encima).
export const UMBRALES_M: Record<ModoViaje, number[]> = {
  coche: [1000, 300, 60],
  moto: [1000, 300, 60],
  'a-pie': [100, 20],
};
// Los radares se avisan una vez, a esta distancia.
export const AVISO_RADAR_M = 500;

// Lo ya dicho, para no repetirlo: "<distancia de la maniobra>:<umbral>" y los radares.
export type YaDicho = { maniobras: string[]; radares: string[]; llegada: boolean };

export const NADA_DICHO: YaDicho = { maniobras: [], radares: [], llegada: false };

export function queDecir(guia: Guia, modo: ModoViaje, dicho: YaDicho): { frases: string[]; dicho: YaDicho } {
  const frases: string[] = [];
  let nuevo = dicho;
  if (guia.llegado) {
    if (!dicho.llegada) {
      frases.push('Has llegado a tu destino');
      nuevo = { ...nuevo, llegada: true };
    }
    return { frases, dicho: nuevo };
  }
  if (guia.fueraDeRuta) return { frases, dicho: nuevo };

  // Radar: una vez, al acercarse (no a pie).
  const radar = guia.proximoRadar;
  if (radar && modo !== 'a-pie' && guia.distanciaARadarM <= AVISO_RADAR_M && !dicho.radares.includes(radar.radar.id)) {
    const que = radar.radar.tipo === 'tramo' ? 'Tramo de velocidad media' : 'Radar';
    const limite = radar.radar.limite ? `. Límite ${radar.radar.limite}` : '';
    frases.push(`${que} a ${distanciaHablada(guia.distanciaARadarM)}${limite}`);
    nuevo = { ...nuevo, radares: [...nuevo.radares, radar.radar.id] };
  }

  // Maniobra: solo el umbral más cercano que ya se haya pasado (si el GPS salta, no
  // se dicen tres avisos seguidos de la misma maniobra).
  const siguiente = guia.siguiente;
  if (siguiente) {
    const d = guia.distanciaASiguienteM;
    const umbrales = UMBRALES_M[modo];
    const pasado = umbrales.filter((u) => d <= u).pop();
    const clave = `${siguiente.distanciaM}:${pasado}`;
    if (pasado !== undefined && !dicho.maniobras.includes(clave)) {
      const cercano = pasado === umbrales[umbrales.length - 1];
      const texto = textoInstruccion(siguiente);
      frases.push(cercano ? texto : `En ${distanciaHablada(d)}, ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`);
      const claves = umbrales.filter((u) => u >= pasado).map((u) => `${siguiente.distanciaM}:${u}`);
      nuevo = { ...nuevo, maniobras: [...nuevo.maniobras, ...claves] };
    }
  }
  return { frases, dicho: nuevo };
}

// Hora de llegada estimada: "Llegas a las 10:32".
export function horaDeLlegada(ahora: Date, restanteSeg: number): Date {
  return new Date(ahora.getTime() + restanteSeg * 1000);
}
