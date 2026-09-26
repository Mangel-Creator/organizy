import { describe, expect, it } from '@jest/globals';

import {
  calcularGuia,
  distanciaCorta,
  distanciaHablada,
  NADA_DICHO,
  queDecir,
  textoInstruccion,
  type DatosRuta,
  type YaDicho,
} from '@/services/rutas/navegacion';
import { acumulados, radaresSobreRuta, type Radar } from '@/services/rutas/radares';
import type { Instruccion, Punto, Ruta } from '@/services/rutas/tipos';

// Una ruta recta de oeste a este (unos 8,3 km), con un punto cada ~83 m.
const puntos: Punto[] = Array.from({ length: 101 }, (_, i) => [41.65, -0.95 + i * 0.001]);
const metros = acumulados(puntos);
const METROS_POR_PUNTO = metros[1];

function instruccion(indice: number, maniobra: string, calle: string | null = null, salida: number | null = null): Instruccion {
  return { indice, distanciaM: metros[indice], maniobra, calle, salida, mensaje: '' };
}

const ruta: Ruta = {
  duracionSeg: 600,
  sinTraficoSeg: 540,
  retrasoSeg: 60,
  distanciaM: metros[100],
  salida: '',
  llegada: '',
  puntos,
  tramos: [],
  instrucciones: [
    instruccion(0, 'DEPART', 'Calle Mayor'),
    instruccion(30, 'TURN_RIGHT', 'Calle Alfonso'),
    instruccion(60, 'ROUNDABOUT_RIGHT', null, 2),
    instruccion(100, 'ARRIVE'),
  ],
};

const radar: Radar = { id: 'r1', tipo: 'fijo', lat: 41.65, lon: -0.95 + 0.045, carretera: 'N-232', provincia: 'ZARAGOZA', limite: 80 };
const datos: DatosRuta = { ruta, metros, radares: radaresSobreRuta(puntos, [radar]) };

// Posición sobre la ruta a tantos metros de la salida.
function en(m: number): Punto {
  return [41.65, -0.95 + (m / METROS_POR_PUNTO) * 0.001];
}

function decir(m: number, dicho: YaDicho = NADA_DICHO, modo: 'coche' | 'a-pie' = 'coche') {
  return queDecir(calcularGuia(datos, en(m)), modo, dicho);
}

describe('textos de las indicaciones', () => {
  it('en tuteo y con la calle', () => {
    expect(textoInstruccion(instruccion(1, 'TURN_LEFT', 'Calle Coso'))).toBe('Gira a la izquierda por Calle Coso');
    expect(textoInstruccion(instruccion(1, 'ROUNDABOUT_LEFT', null, 3))).toBe('En la rotonda, toma la tercera salida');
    expect(textoInstruccion(instruccion(1, 'ENTER_MOTORWAY', 'A-2'))).toBe('Incorpórate a la A-2');
    expect(textoInstruccion(instruccion(1, 'MOTORWAY_EXIT_RIGHT', 'Huesca', 23))).toBe('Toma la salida 23 hacia Huesca');
    expect(textoInstruccion(instruccion(1, 'ARRIVE_RIGHT'))).toBe('Llegas a tu destino, a la derecha');
    expect(textoInstruccion({ ...instruccion(1, 'RARA'), mensaje: 'Texto de TomTom' })).toBe('Texto de TomTom');
  });

  it('distancias en voz alta y en pantalla', () => {
    expect(distanciaHablada(287)).toBe('300 metros');
    expect(distanciaHablada(87)).toBe('90 metros');
    expect(distanciaHablada(1000)).toBe('1 kilómetro');
    expect(distanciaHablada(2460)).toBe('2,5 kilómetros');
    expect(distanciaCorta(1240)).toBe('1,2 km');
    expect(distanciaCorta(284)).toBe('280 m');
  });
});

describe('por dónde vas', () => {
  it('la siguiente maniobra, lo que queda y el próximo radar', () => {
    const guia = calcularGuia(datos, en(1000));
    expect(guia.fueraDeRuta).toBe(false);
    expect(guia.siguiente?.maniobra).toBe('TURN_RIGHT');
    expect(guia.distanciaASiguienteM).toBeCloseTo(metros[30] - 1000, -1);
    expect(guia.restanteM).toBeCloseTo(metros[100] - 1000, -1);
    expect(guia.restanteSeg).toBeCloseTo(600 * (1 - 1000 / metros[100]), -1);
    expect(guia.proximoRadar?.radar.id).toBe('r1');
  });

  it('fuera de la ruta si te alejas más de 50 m', () => {
    expect(calcularGuia(datos, [41.6515, -0.9]).fueraDeRuta).toBe(true);
  });
});

describe('qué decir', () => {
  const giro = metros[30];

  it('avisa de cada maniobra a 1 km, a 300 m y encima, sin repetirse', () => {
    const a = decir(giro - 990);
    expect(a.frases).toEqual(['En 1 kilómetro, gira a la derecha por Calle Alfonso']);
    expect(decir(giro - 980, a.dicho).frases).toEqual([]);
    const b = decir(giro - 290, a.dicho);
    expect(b.frases).toEqual(['En 300 metros, gira a la derecha por Calle Alfonso']);
    const c = decir(giro - 50, b.dicho);
    expect(c.frases).toEqual(['Gira a la derecha por Calle Alfonso']);
  });

  it('si el GPS salta, dice solo el aviso más cercano', () => {
    const a = decir(giro - 40);
    expect(a.frases).toEqual(['Gira a la derecha por Calle Alfonso']);
    expect(decir(giro - 30, a.dicho).frases).toEqual([]);
  });

  it('radar con su límite, una sola vez (a pie, no)', () => {
    const radarM = datos.radares[0].recorridoM;
    const a = decir(radarM - 450);
    expect(a.frases).toContain('Radar a 450 metros. Límite 80');
    expect(decir(radarM - 300, a.dicho).frases.some((f) => f.startsWith('Radar'))).toBe(false);
    expect(decir(radarM - 450, NADA_DICHO, 'a-pie').frases.some((f) => f.startsWith('Radar'))).toBe(false);
  });

  it('rotonda y llegada', () => {
    expect(decir(metros[60] - 250).frases).toEqual(['En 250 metros, en la rotonda, toma la segunda salida']);
    const fin = decir(metros[100] - 10);
    expect(fin.frases).toEqual(['Has llegado a tu destino']);
    expect(decir(metros[100] - 5, fin.dicho).frases).toEqual([]);
  });

  it('fuera de la ruta no dice nada (se recalcula)', () => {
    expect(queDecir(calcularGuia(datos, [41.6515, -0.9]), 'coche', NADA_DICHO).frases).toEqual([]);
  });
});
