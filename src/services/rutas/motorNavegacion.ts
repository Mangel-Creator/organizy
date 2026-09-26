import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import { RADARES } from '@/data/radares';
import { callar, hablar, prepararVoz } from '@/services/voz';

import { calcularRutas } from './index';
import { calcularGuia, NADA_DICHO, queDecir, textoInstruccion, type Guia, type YaDicho } from './navegacion';
import { iniciarFondo, pararFondo } from './navegacionFondo';
import { acumulados, radaresSobreRuta, type RadarEnRuta } from './radares';
import type { ModoViaje, Punto, Ruta } from './tipos';

// Motor de la navegación (fase 6): escucha el GPS, calcula por dónde vas (navegacion.ts),
// dice las indicaciones en voz alta y recalcula la ruta si te sales. Hay una sola
// navegación a la vez; las pantallas la leen con useNavegacion().
//
// Con la pantalla encendida recibe la ubicación de watchPositionAsync (móvil y web).
// En la app propia, también con el móvil bloqueado (navegacionFondo.ts).

export type EstadoNavegacion = {
  activa: boolean;
  ruta: Ruta | null;
  radares: RadarEnRuta[];
  destino: Punto | null;
  nombreDestino: string;
  modo: ModoViaje;
  posicion: Punto | null;
  guia: Guia | null;
  recalculando: boolean;
  enFondo: boolean; // sigue con el móvil bloqueado (solo app propia)
  voz: boolean;
  error: string | null;
};

const INICIAL: EstadoNavegacion = {
  activa: false,
  ruta: null,
  radares: [],
  destino: null,
  nombreDestino: '',
  modo: 'coche',
  posicion: null,
  guia: null,
  recalculando: false,
  enFondo: false,
  voz: true,
  error: null,
};

const CLAVE_VOZ = 'navegacionVoz';
// Tantas posiciones seguidas fuera de la ruta y se recalcula.
const FUERA_SEGUIDAS = 3;

let estado: EstadoNavegacion = INICIAL;
const oyentes = new Set<() => void>();
let metros: number[] = [];
let dicho: YaDicho = NADA_DICHO;
let indice = 0;
let fueraSeguidas = 0;
let vigilancia: Location.LocationSubscription | null = null;

function cambiar(cambios: Partial<EstadoNavegacion>) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((o) => o());
}

function decir(texto: string) {
  if (estado.voz) hablar(texto);
}

// La voz se recuerda entre navegaciones.
leerAjuste<boolean>(CLAVE_VOZ, true).then((voz) => cambiar({ voz }));

export function cambiarVoz(voz: boolean): void {
  if (!voz) callar();
  cambiar({ voz });
  guardarAjuste(CLAVE_VOZ, voz).catch(() => {});
}

function ponerRuta(ruta: Ruta) {
  metros = acumulados(ruta.puntos);
  indice = 0;
  fueraSeguidas = 0;
  // Los radares ya avisados se recuerdan aunque cambie la ruta.
  dicho = { ...NADA_DICHO, radares: dicho.radares };
  cambiar({ ruta, radares: radaresSobreRuta(ruta.puntos, RADARES), recalculando: false, error: null });
}

async function recalcular(desde: Punto) {
  if (!estado.destino || estado.recalculando) return;
  cambiar({ recalculando: true });
  decir('Recalculando');
  const resultado = await calcularRutas({
    origen: desde,
    destino: estado.destino,
    modo: estado.modo,
    alternativas: 0,
    instrucciones: true,
  });
  if (!estado.activa) return;
  const nueva = resultado.estado === 'ok' ? resultado.rutas[0] : undefined;
  if (nueva) {
    ponerRuta(nueva);
    // Con la ruta nueva, se recoloca al momento (y dice la maniobra si toca).
    procesarPosicion(estado.posicion ?? desde);
  } else {
    fueraSeguidas = 0;
    cambiar({
      recalculando: false,
      error: resultado.estado === 'error' ? resultado.mensaje : 'No se puede recalcular la ruta ahora.',
    });
  }
}

// Cada nueva posición del GPS (con la pantalla encendida o en segundo plano).
export function procesarPosicion(posicion: Punto): void {
  if (!estado.activa || !estado.ruta) return;
  const guia = calcularGuia({ ruta: estado.ruta, metros, radares: estado.radares }, posicion, indice);
  indice = guia.proyeccion.indice;
  cambiar({ posicion, guia });
  if (guia.fueraDeRuta) {
    fueraSeguidas++;
    if (fueraSeguidas >= FUERA_SEGUIDAS) recalcular(posicion);
    return;
  }
  fueraSeguidas = 0;
  const { frases, dicho: nuevo } = queDecir(guia, estado.modo, dicho);
  dicho = nuevo;
  frases.forEach(decir);
}

export type Arranque = {
  ruta: Ruta;
  destino: Punto;
  nombreDestino: string;
  modo: ModoViaje;
};

// Empieza a guiar. Hay que llamarla directamente desde el botón (sin esperar antes a
// nada): en la web y en el iPhone, la primera frase tiene que salir de un toque.
export function empezarNavegacion({ ruta, destino, nombreDestino, modo }: Arranque): void {
  dicho = NADA_DICHO;
  estado = { ...INICIAL, voz: estado.voz, activa: true, destino, nombreDestino, modo };
  ponerRuta(ruta);
  const primera = ruta.instrucciones?.find((i) => i.maniobra !== 'DEPART');
  decir(`Vamos a ${nombreDestino}.${primera ? ` ${textoInstruccion(primera)}.` : ''}`);
  prepararVoz();
  vigilar();
}

async function vigilar() {
  const enFondo = await iniciarFondo(procesarPosicion);
  if (!estado.activa) {
    pararFondo();
    return;
  }
  cambiar({ enFondo });
  if (enFondo) return;
  try {
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000 },
      (p) => procesarPosicion([p.coords.latitude, p.coords.longitude]),
    );
    if (estado.activa) vigilancia = sub;
    else sub.remove();
  } catch {
    cambiar({ error: 'No puedo saber dónde estás. Revisa el permiso de ubicación.' });
  }
}

export function terminarNavegacion(): void {
  vigilancia?.remove();
  vigilancia = null;
  pararFondo();
  callar();
  estado = { ...INICIAL, voz: estado.voz };
  oyentes.forEach((o) => o());
}

function suscribirse(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leerEstado() {
  return estado;
}

export function useNavegacion(): EstadoNavegacion {
  return useSyncExternalStore(suscribirse, leerEstado, leerEstado);
}
